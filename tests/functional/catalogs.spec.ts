import { test } from '@japa/runner'

/**
 * Sprint 1 — Endpoints de catálogo (DoD Sprint 1).
 */
test.group('Catálogos públicos', () => {
  test('GET /api/states devuelve los 32 estados de México', async ({ client, assert }) => {
    const res = await client.get('/api/states')
    res.assertStatus(200)

    const body = res.body() as { data: Array<{ code: string; name: string; slug: string }> }
    assert.equal(body.data.length, 32, 'México tiene 32 estados (INEGI)')
    assert.exists(body.data.find((s) => s.code === '09' && s.name === 'Ciudad de México'))
    assert.exists(body.data.find((s) => s.code === '14' && s.name === 'Jalisco'))
  })

  test('GET /api/states/:id/municipalities devuelve los del estado', async ({ client, assert }) => {
    const states = await client.get('/api/states')
    const cdmx = (states.body() as any).data.find((s: any) => s.code === '09')

    const res = await client.get(`/api/states/${cdmx.id}/municipalities`)
    res.assertStatus(200)

    const body = res.body() as { state: any; data: Array<{ slug: string; name: string }> }
    assert.equal(body.state.code, '09')
    assert.isAtLeast(body.data.length, 1)
    assert.exists(body.data.find((m) => m.slug === 'miguel-hidalgo'))
  })

  test('GET /api/amenities devuelve catálogo seedeado', async ({ client, assert }) => {
    const res = await client.get('/api/amenities')
    res.assertStatus(200)

    const body = res.body() as {
      data: Array<{ slug: string; label: string; category: string }>
    }
    assert.isAtLeast(body.data.length, 20, 'DoD: ≥20 amenidades sembradas')
    assert.exists(body.data.find((a) => a.slug === 'alberca'))
    assert.exists(body.data.find((a) => a.slug === 'gym'))
  })

  test('GET /api/states/:id/municipalities con id inválido responde 400', async ({ client }) => {
    const res = await client.get('/api/states/abc/municipalities')
    res.assertStatus(400)
  })

  test('GET /api/states/:id/municipalities con id no existente responde 404', async ({
    client,
  }) => {
    const res = await client.get('/api/states/9999/municipalities')
    res.assertStatus(404)
  })
})
