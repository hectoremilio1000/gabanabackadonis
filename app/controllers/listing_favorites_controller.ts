import type { HttpContext } from '@adonisjs/core/http'
import ListingFavorite from '#models/listing_favorite'
import Listing from '#models/listing'

export default class ListingFavoritesController {
  /**
   * GET /api/listings/favorites
   * Lista de favoritos del usuario actual (ids de listing)
   */
  public async index({ auth }: HttpContext) {
    const me = await auth.authenticate()

    const favs = await ListingFavorite.query().where('user_id', me.id)

    const listingIds = favs.map((f) => f.listingId)

    return {
      userId: me.id,
      listings: listingIds,
    }
  }

  /**
   * POST /api/listings/:id/favorite
   * Marca un listing como favorito
   */
  public async store({ auth, params, response }: HttpContext) {
    const me = await auth.authenticate()
    const listingId = Number(params.id)

    if (!listingId) {
      return response.badRequest({ error: 'listingId inválido' })
    }

    const listing = await Listing.find(listingId)
    if (!listing) {
      return response.notFound({ error: 'Listing no encontrado' })
    }

    // evita duplicados gracias al unique(user_id, listing_id)
    await ListingFavorite.firstOrCreate({ userId: me.id, listingId }, { userId: me.id, listingId })

    return response.created({ ok: true })
  }

  /**
   * DELETE /api/listings/:id/favorite
   * Quita un listing de favoritos
   */
  public async destroy({ auth, params, response }: HttpContext) {
    const me = await auth.authenticate()
    const listingId = Number(params.id)

    if (!listingId) {
      return response.badRequest({ error: 'listingId inválido' })
    }

    const favorite = await ListingFavorite.query()
      .where('user_id', me.id)
      .andWhere('listing_id', listingId)
      .first()

    if (!favorite) {
      return response.notFound({ error: 'No está en favoritos' })
    }

    await favorite.delete()

    return { ok: true }
  }
}
