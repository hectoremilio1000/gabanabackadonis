// app/controllers/leads_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'
import Lead from '#models/lead'
import Listing from '#models/listing'
import User from '#models/user'
import { leadCreateValidator } from '#validators/leads_create'
import { validateTurnstileToken } from '#services/turnstile_service'
import { leadsRateLimiter } from '#services/rate_limiter'
import {
  getEmailTransport,
  buildNewLeadEmail,
  buildLeadConfirmationEmail,
} from '#services/email_service'

/**
 * Sprint 2 — Gap #3: endpoint público POST /api/leads.
 *
 * Flujo:
 *   1. Rate limit por IP (5/min).
 *   2. Valida payload con VineJS.
 *   3. Valida Turnstile token (stub en dev, real en Sprint 7+).
 *   4. Si viene listing_id, resuelve listing y agent_id.
 *   5. Persiste el lead.
 *   6. Dispara email al agente (o SUPPORT_EMAIL si no hay agent).
 *   7. (opcional) Email de confirmación al lead.
 *   8. Responde 201 SIEMPRE que el lead haya persistido — el fallo del email
 *      no bloquea la confirmación al usuario (Sprint 2 PRECIOS_DE_FALLO).
 *
 * NOTA RLS: este controller es PÚBLICO (no auth). Los endpoints admin de
 * leads viven en otro módulo (Sprint 2 tarea #7).
 */
export default class LeadsController {
  /**
   * POST /api/leads (público).
   */
  async store({ request, response }: HttpContext) {
    // 1. Rate limit por IP (REGLAS #8 del kickoff).
    const ip = this.resolveIp(request)
    const rl = leadsRateLimiter.hit(ip)
    if (!rl.allowed) {
      return response.tooManyRequests({
        error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
        retry_after_ms: rl.retryAfterMs,
      })
    }

    // 2. Validación de payload (Vine).
    const payload = await request.validateUsing(leadCreateValidator)

    // 3. Validación de Turnstile (stub en Sprint 2-6, real en Sprint 7+).
    const turnstile = await validateTurnstileToken(payload.turnstile_token ?? null, ip)
    if (!turnstile.success) {
      return response.unprocessableEntity({
        error: 'No pudimos validar tu solicitud. Recarga la página e inténtalo de nuevo.',
        codes: turnstile.errorCodes ?? [],
      })
    }

    // 4. Resuelve agent_id desde el listing (si aplica).
    let listing: Listing | null = null
    let agentId: number | null = null
    let agent: User | null = null

    if (payload.listing_id) {
      listing = await Listing.find(payload.listing_id)
      if (!listing) {
        return response.unprocessableEntity({
          error: 'La propiedad referenciada ya no está disponible.',
          field: 'listing_id',
        })
      }
      if (listing.status !== 'published') {
        return response.unprocessableEntity({
          error: 'La propiedad referenciada ya no está disponible.',
          field: 'listing_id',
        })
      }
      agentId = listing.agentId
      if (agentId) {
        agent = await User.find(agentId)
      }
    }

    // 5. Persistencia.
    const inferredSource = payload.source ?? (payload.listing_id ? 'listing' : 'contact_page')

    const lead = await Lead.create({
      listingId: payload.listing_id ?? null,
      agentId,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      message: payload.message,
      source: inferredSource,
      ip,
      userAgent: (request.header('user-agent') ?? '').slice(0, 500),
      status: 'nuevo',
    })

    // 6 & 7. Emails (best-effort — no bloquean la respuesta al usuario).
    this.dispatchEmails({
      lead,
      listing,
      agent,
      sendConfirmation: payload.send_confirmation === true,
    }).catch((err) => {
      // El lead ya está persistido. Loggeamos para que Sprint 7 lo recoja.
      logger.error({ err, leadId: lead.id }, '[leads] failed to dispatch lead emails')
    })

    return response.created({
      ok: true,
      lead: {
        id: lead.id,
        agent_name: agent?.fullName ?? null,
      },
    })
  }

  /**
   * Best-effort dispatch de emails:
   *   - Email "Nuevo lead recibido" al agente (o SUPPORT_EMAIL si no hay).
   *   - Email "Tu mensaje fue enviado a {agente}" al lead si pidió confirmación.
   *
   * Si Resend cae, el lead ya quedó en BD. Sprint 7 conectará un job de
   * reintentos formal (REGLAS PRECIOS_DE_FALLO del kickoff).
   */
  private async dispatchEmails(args: {
    lead: Lead
    listing: Listing | null
    agent: User | null
    sendConfirmation: boolean
  }) {
    const { lead, listing, agent, sendConfirmation } = args

    const transport = getEmailTransport()
    const adminBaseUrl = env.get('ADMIN_BASE_URL') ?? 'http://localhost:5173'
    const publicBaseUrl = env.get('PUBLIC_SITE_BASE_URL') ?? 'http://localhost:3000'
    const supportEmail = env.get('SUPPORT_EMAIL') ?? 'hola@gabanarealstate.com.mx'

    const recipient = agent?.email ?? supportEmail
    const agentDisplayName = agent?.fullName ?? 'Equipo Gabana'

    // Email principal al agente.
    const newLeadMail = buildNewLeadEmail({
      agentName: agentDisplayName,
      leadName: lead.name,
      leadEmail: lead.email,
      leadPhone: lead.phone,
      leadMessage: lead.message,
      listingTitle: listing?.title ?? null,
      listingUrl: listing
        ? `${publicBaseUrl}/${listing.operationType === 'renta_larga' ? 'renta' : 'venta'}/${listing.slug}`
        : null,
      adminLeadUrl: `${adminBaseUrl}/leads/${lead.id}`,
    })

    const r1 = await transport.send({
      to: recipient,
      subject: newLeadMail.subject,
      html: newLeadMail.html,
      replyTo: lead.email,
    })
    if (!r1.ok) {
      logger.warn({ leadId: lead.id, error: r1.error }, '[leads] new-lead email failed')
    }

    // Email de confirmación al lead (opcional).
    if (sendConfirmation) {
      const confirmMail = buildLeadConfirmationEmail({
        leadName: lead.name,
        agentName: agentDisplayName,
        listingTitle: listing?.title ?? null,
      })
      const r2 = await transport.send({
        to: lead.email,
        subject: confirmMail.subject,
        html: confirmMail.html,
      })
      if (!r2.ok) {
        logger.warn({ leadId: lead.id, error: r2.error }, '[leads] confirmation email failed')
      }
    }
  }

  /**
   * Resuelve la IP del cliente. AdonisJS ya respeta `trustProxy` (config/app.ts
   * por defecto). Tomamos el primer hop si el header `x-forwarded-for` viene
   * con varios.
   */
  private resolveIp(request: HttpContext['request']): string {
    const fwd = request.header('x-forwarded-for')
    if (fwd) {
      const first = fwd.split(',')[0]?.trim()
      if (first) return first
    }
    return request.ip()
  }
}
