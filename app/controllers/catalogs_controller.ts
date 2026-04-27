// app/controllers/catalogs_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import State from '#models/state'
import Municipality from '#models/municipality'
import Amenity from '#models/amenity'

/**
 * Sprint 1 — Endpoints públicos de catálogos.
 *
 *   GET /api/states                       → 32 estados de México
 *   GET /api/states/:id/municipalities    → municipios del estado dado
 *   GET /api/amenities                    → catálogo de amenidades
 */
export default class CatalogsController {
  public async states({ response }: HttpContext) {
    const rows = await State.query().orderBy('name', 'asc')
    return response.ok({
      data: rows.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        slug: s.slug,
      })),
    })
  }

  public async municipalitiesByState({ params, response }: HttpContext) {
    const stateId = Number(params.id)
    if (!Number.isFinite(stateId) || stateId <= 0) {
      return response.badRequest({ error: 'state id inválido' })
    }

    const state = await State.find(stateId)
    if (!state) {
      return response.notFound({ error: 'Estado no encontrado' })
    }

    const munis = await Municipality.query().where('state_id', stateId).orderBy('name', 'asc')

    return response.ok({
      state: { id: state.id, code: state.code, name: state.name, slug: state.slug },
      data: munis.map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
      })),
    })
  }

  public async amenities({ response }: HttpContext) {
    const rows = await Amenity.query().orderBy('display_order', 'asc').orderBy('label', 'asc')
    return response.ok({
      data: rows.map((a) => ({
        id: a.id,
        slug: a.slug,
        label: a.label,
        category: a.category,
      })),
    })
  }
}
