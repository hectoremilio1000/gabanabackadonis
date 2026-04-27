import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import Listing from '#models/listing'

/**
 * Sprint 4 — Gap #6: middleware formal de RLS para recursos `listings`.
 *
 * Se aplica a `PUT/DELETE /api/listings/:id` y similares. Reglas:
 *   - superadmin / staff → pasan siempre.
 *   - publisher → solo si `listing.agent_id === auth.user.id` (o created_by).
 *
 * Si el listing no existe → 404.
 * Si pertenece a otro publisher → 403.
 */
export default class EnforceListingOwnershipMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const me = await ctx.auth.authenticate()
    const id = Number(ctx.params.id)

    if (!Number.isFinite(id)) {
      return ctx.response.badRequest({ error: 'id inválido' })
    }

    const listing = await Listing.find(id)
    if (!listing) {
      return ctx.response.notFound({ error: 'Propiedad no encontrada' })
    }

    const isAdmin = me.role === 'superadmin' || me.role === 'staff'
    if (!isAdmin && listing.agentId !== me.id && listing.createdBy !== me.id) {
      return ctx.response.forbidden({
        error: 'Solo el agente dueño de la propiedad puede modificarla.',
      })
    }

    // Anexamos el listing al ctx para que el controller no lo busque otra vez.
    ;(ctx as unknown as { listing: Listing }).listing = listing

    return next()
  }
}
