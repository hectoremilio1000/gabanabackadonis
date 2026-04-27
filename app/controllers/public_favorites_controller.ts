// app/controllers/public_favorites_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Listing from '#models/listing'
import { resolvePublicUserFromRequest } from '#controllers/public_auth_controller'

/**
 * Sprint 6 — Gap #12: favoritos públicos.
 *
 * Endpoints:
 *   GET    /api/public/favorites
 *   POST   /api/public/listings/:id/favorite
 *   DELETE /api/public/listings/:id/favorite
 *
 * Auth via header `Authorization: Bearer <session_token>` (de
 * `/api/auth/public/consume`). Cada inserción en `listing_favorites` lleva
 * `audience='public'` para discriminar de los favoritos del staff.
 */
export default class PublicFavoritesController {
  async index({ request, response }: HttpContext) {
    const me = await resolvePublicUserFromRequest(request)
    if (!me) return response.unauthorized({ error: 'No session' })

    const rows = await db
      .from('listing_favorites')
      .where('user_id', me.id)
      .where('audience', 'public')
      .orderBy('created_at', 'desc')
      .select('listing_id')

    const ids = rows.map((r) => r.listing_id)
    if (!ids.length) return response.ok({ data: [] })

    const listings = await Listing.query()
      .whereIn('id', ids)
      .where('status', 'published')
      .preload('photos', (q) => q.orderBy('sort_order', 'asc').limit(1))

    return response.ok({
      data: listings.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        priceLabel:
          l.priceLabel ??
          `MN ${l.price.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`,
        operationType: l.operationType,
        coverImageUrl: l.coverImageUrl,
        zone: l.zone,
      })),
    })
  }

  async store({ params, request, response }: HttpContext) {
    const me = await resolvePublicUserFromRequest(request)
    if (!me) return response.unauthorized({ error: 'No session' })

    const listingId = Number(params.id)
    if (!Number.isFinite(listingId)) {
      return response.badRequest({ error: 'id inválido' })
    }

    const listing = await Listing.find(listingId)
    if (!listing) return response.notFound({ error: 'Listing no existe' })

    // Insert idempotente: chequea primero, evita duplicados.
    const existing = await db
      .from('listing_favorites')
      .where('user_id', me.id)
      .where('listing_id', listingId)
      .where('audience', 'public')
      .first()

    if (!existing) {
      await db.table('listing_favorites').insert({
        user_id: me.id,
        listing_id: listingId,
        audience: 'public',
        created_at: db.raw('CURRENT_TIMESTAMP'),
        updated_at: db.raw('CURRENT_TIMESTAMP'),
      })
    }

    return response.created({ ok: true })
  }

  async destroy({ params, request, response }: HttpContext) {
    const me = await resolvePublicUserFromRequest(request)
    if (!me) return response.unauthorized({ error: 'No session' })

    const listingId = Number(params.id)
    if (!Number.isFinite(listingId)) {
      return response.badRequest({ error: 'id inválido' })
    }

    await db
      .from('listing_favorites')
      .where('user_id', me.id)
      .where('listing_id', listingId)
      .where('audience', 'public')
      .delete()

    return response.ok({ ok: true })
  }
}
