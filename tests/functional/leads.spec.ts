import { test } from '@japa/runner'
import Lead from '#models/lead'
import Listing from '#models/listing'
import {
  setEmailTransportForTesting,
  resetEmailTransport,
  createCapturingFakeTransport,
} from '#services/email_service'
import { leadsRateLimiter } from '#services/rate_limiter'

/**
 * Sprint 2 — Gap #3 (modelo Lead + endpoint público POST /api/leads).
 *
 * Cubre los 4 escenarios del DoD del SPRINT_PLAN sección Sprint 2:
 *   1. Crea lead válido y persiste en BD.
 *   2. Falla 422 si Turnstile real está activo y el token es inválido
 *      (simulado vía secret env presente).
 *   3. Falla 429 si rate limit excedido.
 *   4. Mock de email captura el payload y lo verifica.
 *
 * Pre-requisito: BD de tests con `node ace migration:fresh --seed` previo
 * (catálogos + 7 publishers + 29 listings publicados).
 */
test.group('POST /api/leads — Gap #3', (group) => {
  let fakeTransport: ReturnType<typeof createCapturingFakeTransport>

  group.each.setup(() => {
    // Limpia rate limiter entre tests para no arrastrar estado.
    leadsRateLimiter.reset()

    // Inyecta transport fake que captura emails sin llamar a Resend.
    fakeTransport = createCapturingFakeTransport()
    setEmailTransportForTesting(fakeTransport)
  })

  group.each.teardown(async () => {
    resetEmailTransport()
    // Limpia leads creados en cada test.
    await Lead.query().delete()
  })

  // 1 ────────────────────────────────────────────────────────────────────
  test('1. crea lead válido sobre un listing publicado y dispara email al agente', async ({
    client,
    assert,
  }) => {
    const listing = await Listing.query()
      .where('status', 'published')
      .whereNotNull('agent_id')
      .firstOrFail()

    const response = await client.post('/api/leads').json({
      name: 'María Pérez',
      phone: '+52 55 1234 5678',
      email: 'maria.lead@example.com',
      message: 'Hola, me interesa la propiedad. ¿Sigue disponible?',
      listing_id: listing.id,
      accept_terms: true,
    })

    response.assertStatus(201)
    const body = response.body() as { ok: boolean; lead: { id: number; agent_name: string } }
    assert.isTrue(body.ok)
    assert.isNumber(body.lead.id)
    assert.isString(body.lead.agent_name)

    // Persistencia
    const lead = await Lead.findOrFail(body.lead.id)
    assert.equal(lead.email, 'maria.lead@example.com')
    assert.equal(lead.source, 'listing')
    assert.equal(lead.status, 'nuevo')
    assert.equal(lead.listingId, listing.id)
    assert.equal(lead.agentId, listing.agentId)

    // Email al agente capturado
    // (El dispatch es async, esperamos un microtick para que termine.)
    await new Promise((r) => setTimeout(r, 50))
    assert.isAtLeast(fakeTransport.sent.length, 1, 'debió enviar email al agente')
    const sent = fakeTransport.sent[0]
    assert.match(sent.subject, /Nuevo lead/)
    assert.include(sent.html, 'María Pérez')
    assert.include(sent.html, 'maria.lead@example.com')
  })

  // 2 ────────────────────────────────────────────────────────────────────
  test('2. lead a /contacto sin listing_id usa source=contact_page', async ({ client, assert }) => {
    const response = await client.post('/api/leads').json({
      name: 'Carlos Ramírez',
      phone: '5512345678',
      email: 'carlos@example.com',
      message: 'Quisiera más información sobre Gabana.',
      source: 'contact_page',
      accept_terms: true,
    })

    response.assertStatus(201)
    const body = response.body() as { lead: { id: number } }

    const lead = await Lead.findOrFail(body.lead.id)
    assert.equal(lead.source, 'contact_page')
    assert.isNull(lead.listingId)
    assert.isNull(lead.agentId)
  })

  // 3 ────────────────────────────────────────────────────────────────────
  test('3. rechaza 422 si falta accept_terms', async ({ client }) => {
    const response = await client.post('/api/leads').json({
      name: 'Sin TyC',
      phone: '5500000000',
      email: 'notyc@example.com',
      message: 'No acepto terms y condiciones a propósito.',
      // accept_terms intencionalmente omitido
    })

    response.assertStatus(422)
  })

  // 4 ────────────────────────────────────────────────────────────────────
  test('4. rechaza 422 si email malformado', async ({ client }) => {
    const response = await client.post('/api/leads').json({
      name: 'Email Malo',
      phone: '5500000000',
      email: 'no-es-email',
      message: 'Un mensaje suficientemente largo para pasar minLength.',
      accept_terms: true,
    })

    response.assertStatus(422)
  })

  // 5 ────────────────────────────────────────────────────────────────────
  test('5. rechaza 422 si Turnstile real está activo y token es inválido', async ({
    client,
    cleanup,
  }) => {
    // Activa modo "real" temporalmente para que el servicio espere un token.
    process.env.TURNSTILE_SECRET_KEY = 'test_secret_does_not_call_cloudflare'
    cleanup(() => {
      delete process.env.TURNSTILE_SECRET_KEY
    })

    // No hace falta interceptar fetch — el endpoint Cloudflare no responderá
    // (network error en sandbox) y el servicio devuelve success:false con
    // errorCodes:['network_error']. Esto es exactamente lo que queremos
    // verificar: con secret configurado, sin token válido → 422.
    const response = await client.post('/api/leads').json({
      name: 'Bot Suspect',
      phone: '5500000000',
      email: 'bot@example.com',
      message: 'Mensaje sin token de Turnstile válido en modo real.',
      accept_terms: true,
      turnstile_token: '',
    })

    response.assertStatus(422)
  })

  // 6 ────────────────────────────────────────────────────────────────────
  test('6. rechaza 429 cuando se excede el rate limit (5/min/IP)', async ({ client, assert }) => {
    const payload = {
      name: 'Spammer',
      phone: '5599999999',
      email: 'spammer@example.com',
      message: 'Mensaje repetitivo de prueba para superar el rate limit.',
      source: 'contact_page' as const,
      accept_terms: true,
    }

    // 5 hits permitidos, el 6° debe rebotar.
    for (let i = 0; i < 5; i++) {
      const r = await client
        .post('/api/leads')
        .header('x-forwarded-for', '203.0.113.10')
        .json(payload)
      assert.equal(r.status(), 201, `hit #${i + 1} debió ser 201`)
    }

    const r6 = await client
      .post('/api/leads')
      .header('x-forwarded-for', '203.0.113.10')
      .json(payload)

    assert.equal(r6.status(), 429)
    const body = r6.body() as { retry_after_ms: number }
    assert.isNumber(body.retry_after_ms)
    assert.isAtLeast(body.retry_after_ms, 0)
  })

  // 7 ────────────────────────────────────────────────────────────────────
  test('7. send_confirmation=true dispara también email al lead', async ({ client, assert }) => {
    const listing = await Listing.query()
      .where('status', 'published')
      .whereNotNull('agent_id')
      .firstOrFail()

    const response = await client.post('/api/leads').json({
      name: 'Confirmacion User',
      phone: '5500000111',
      email: 'confirm@example.com',
      message: 'Quisiera confirmación de envío por email.',
      listing_id: listing.id,
      accept_terms: true,
      send_confirmation: true,
    })

    response.assertStatus(201)

    await new Promise((r) => setTimeout(r, 50))

    // Debe haber 2 emails: 1 al agente, 1 al lead.
    assert.isAtLeast(fakeTransport.sent.length, 2)
    const recipients = fakeTransport.sent.map((m) => m.to)
    assert.include(recipients, 'confirm@example.com')
  })

  // 8 ────────────────────────────────────────────────────────────────────
  test('8. listing_id que no existe responde 422', async ({ client }) => {
    const response = await client.post('/api/leads').json({
      name: 'Listing Fantasma',
      phone: '5500000222',
      email: 'fantasma@example.com',
      message: 'Apuntando a un listing que no existe en BD.',
      listing_id: 99_999_999,
      accept_terms: true,
    })

    response.assertStatus(422)
  })
})
