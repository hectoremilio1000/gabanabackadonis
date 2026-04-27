import { test } from '@japa/runner'

/**
 * Sprint 1 — Gap #2.
 * 8 casos de DoD del SPRINT_PLAN sección Sprint 1.
 *
 * Pre-requisito: la BD de tests debe tener corridas las migraciones y seeders
 * (`node ace migration:fresh --seed`) para que los 30 listings y los 6 agentes
 * estén disponibles. Los assertions están escritos para tolerar inventario
 * extra (no asume conteos exactos).
 */
test.group('GET /api/listings — Gap #2 búsqueda con filtros', () => {
  test('1. sin filtros devuelve estructura {data, meta}', async ({ client, assert }) => {
    const response = await client.get('/api/listings')

    response.assertStatus(200)
    const body = response.body() as { data: any[]; meta: any }

    assert.isArray(body.data)
    assert.exists(body.meta)
    assert.isNumber(body.meta.total)
    assert.isNumber(body.meta.page)
    assert.isNumber(body.meta.perPage)
    assert.isNumber(body.meta.totalPages)
    assert.equal(body.meta.page, 1)
    assert.equal(body.meta.perPage, 20)
    assert.isAtLeast(body.meta.total, 1, 'BD debe tener al menos 1 listing publicado')
  })

  test('2. filtro operation=venta solo devuelve ventas', async ({ client, assert }) => {
    const response = await client.get('/api/listings?operation=venta&per_page=100')

    response.assertStatus(200)
    const body = response.body() as { data: any[] }

    assert.isAtLeast(body.data.length, 1)
    for (const item of body.data) {
      assert.equal(item.operationType, 'venta', `slug=${item.slug} operationType !== venta`)
    }
  })

  test('3. filtro type=departamento solo devuelve departamentos', async ({ client, assert }) => {
    const response = await client.get('/api/listings?type=departamento&per_page=100')

    response.assertStatus(200)
    const body = response.body() as { data: any[] }

    for (const item of body.data) {
      assert.equal(item.propertyType, 'departamento')
    }
  })

  test('4. rango de precio min_price/max_price filtra correctamente', async ({
    client,
    assert,
  }) => {
    const min = 1_000_000
    const max = 10_000_000
    const response = await client.get(
      `/api/listings?min_price=${min}&max_price=${max}&per_page=100`
    )

    response.assertStatus(200)
    const body = response.body() as { data: any[] }

    for (const item of body.data) {
      assert.isAtLeast(item.price, min, `slug=${item.slug} price < min`)
      assert.isAtMost(item.price, max, `slug=${item.slug} price > max`)
    }
  })

  test('5. rango de recámaras beds_min=3 solo lista listings con ≥3', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/api/listings?beds_min=3&per_page=100')

    response.assertStatus(200)
    const body = response.body() as { data: any[] }

    for (const item of body.data) {
      // los terrenos tienen beds=null y NO deben aparecer cuando beds_min ≥ 1
      assert.isNotNull(item.bedsCount, `slug=${item.slug} debería tener bedsCount`)
      if (item.bedsCount !== null) {
        assert.isAtLeast(item.bedsCount, 3, `slug=${item.slug} beds < 3`)
      }
    }
  })

  test('6. búsqueda libre q=Polanco encuentra match', async ({ client, assert }) => {
    const response = await client.get('/api/listings?q=Polanco')

    response.assertStatus(200)
    const body = response.body() as { data: any[]; meta: any }

    assert.isAtLeast(body.meta.total, 1, 'debe encontrar al menos un listing en Polanco')
    const concat = body.data.map((d) => `${d.title} ${d.address} ${d.zone} ${d.summary}`).join('|')
    assert.match(concat, /Polanco/i)
  })

  test('7. filtro bbox limita por coordenadas geográficas', async ({ client, assert }) => {
    // bbox amplio sobre Ciudad de México
    const bbox = '19.20,-99.40,19.55,-99.05'
    const response = await client.get(`/api/listings?bbox=${bbox}&per_page=100`)

    response.assertStatus(200)
    const body = response.body() as { data: any[] }

    assert.isAtLeast(body.data.length, 1, 'CDMX bbox debería matchear ≥1 listing')
    for (const item of body.data) {
      assert.isNotNull(item.coords, `slug=${item.slug} coords nula`)
      assert.isAtLeast(item.coords!.lat, 19.2)
      assert.isAtMost(item.coords!.lat, 19.55)
      assert.isAtLeast(item.coords!.lng, -99.4)
      assert.isAtMost(item.coords!.lng, -99.05)
    }
  })

  test('8. paginación per_page=5 respeta el límite', async ({ client, assert }) => {
    const response = await client.get('/api/listings?per_page=5&page=1')

    response.assertStatus(200)
    const body = response.body() as { data: any[]; meta: any }

    assert.equal(body.meta.perPage, 5)
    assert.equal(body.meta.page, 1)
    assert.isAtMost(body.data.length, 5)
    if (body.meta.total > 5) {
      assert.equal(body.data.length, 5)
      assert.isAtLeast(body.meta.totalPages, 2)
    }
  })

  test('9. payload inválido (per_page=999) responde 422', async ({ client, assert }) => {
    const response = await client.get('/api/listings?per_page=999')

    response.assertStatus(422)
    const body = response.body() as { error: string; messages: any[] }
    assert.exists(body.error)
    assert.isArray(body.messages)
  })

  test('10. payload inválido (operation desconocida) responde 422', async ({ client, assert }) => {
    const response = await client.get('/api/listings?operation=hipoteca')

    response.assertStatus(422)
    const body = response.body() as { error: string }
    assert.exists(body.error)
  })
})
