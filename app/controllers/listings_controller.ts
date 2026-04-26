// app/controllers/listings_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import Listing from '#models/listing'

/**
 * Convierte columnas JSON (string) en un string[]
 */
function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value as string[]
  }

  if (typeof value === 'string') {
    try {
      const arr = JSON.parse(value)
      return Array.isArray(arr) ? arr : []
    } catch {
      return value ? [value] : []
    }
  }

  return []
}

function toDto(l: Listing & { coverImageUrl?: string | null; photos?: Array<{ url: string }> }) {
  const priceLabel =
    l.priceLabel ?? `MN ${l.price.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

  const photos = Array.isArray(l.photos) ? l.photos.map((photo) => photo.url) : []

  return {
    id: `listing-${l.id}`,
    slug: l.slug,
    title: l.title,
    priceLabel,
    address: l.address,
    zone: l.zone,
    badges: parseJsonArray(l.badges),
    highlights: parseJsonArray(l.highlights),
    mediaCount: l.mediaCount,
    image: l.coverImageUrl ?? '/imagenes/placeholder.jpg',
    photos,
    beds: l.bedsLabel ?? '',
    size: l.sizeLabel ?? '',
    isPremier: l.isPremier,
    isFavorite: false,
    coords: l.lat !== null && l.lng !== null ? { lat: Number(l.lat), lng: Number(l.lng) } : null,
    summary: l.summary,
  }
}

export default class ListingsController {
  // GET /api/listings
  public async index({}: HttpContext) {
    const rows = await Listing.query()
      .where('status', 'published')
      .preload('photos', (query) => query.orderBy('sort_order', 'asc'))
      .orderBy('created_at', 'desc')

    return rows.map((l) => toDto(l))
  }

  // GET /api/listings/:slug
  public async show({ params, response }: HttpContext) {
    const listing = await Listing.query()
      .where('slug', params.slug)
      .where('status', 'published')
      .preload('photos', (query) => query.orderBy('sort_order', 'asc'))
      .first()

    if (!listing) {
      return response.notFound({ error: 'Listing no encontrado' })
    }

    return toDto(listing)
  }

  // POST /api/listings
  public async store({ auth, request, response }: HttpContext) {
    const me = await auth.authenticate()

    if (!['superadmin', 'staff', 'publisher'].includes(me.role)) {
      return response.forbidden({ error: 'No puedes crear listings' })
    }

    const payload = request.only([
      'slug',
      'title',
      'summary',
      'address',
      'zone',
      'price',
      'priceLabel',
      'bedsLabel',
      'sizeLabel',
      'sizeM2',
      'isPremier',
      'badges',
      'highlights',
      'lat',
      'lng',
      'status',
    ])

    if (!payload.slug || !payload.title || !payload.summary || !payload.address || !payload.zone) {
      return response.badRequest({
        error: 'slug, title, summary, address y zone son requeridos',
      })
    }

    const exists = await Listing.findBy('slug', payload.slug)
    if (exists) {
      return response.conflict({ error: 'Slug ya existe' })
    }

    const status: 'draft' | 'published' | 'archived' =
      me.role === 'publisher' ? 'draft' : (payload.status as any) || 'published'

    const listing = await Listing.create({
      slug: String(payload.slug),
      title: String(payload.title),
      summary: String(payload.summary),
      address: String(payload.address),
      zone: String(payload.zone),
      price: Number(payload.price ?? 0),
      priceLabel: payload.priceLabel ?? null,
      bedsLabel: payload.bedsLabel ?? null,
      sizeLabel: payload.sizeLabel ?? null,
      sizeM2: payload.sizeM2 ?? null,
      isPremier: Boolean(payload.isPremier),

      // Arrays → JSON
      badges: Array.isArray(payload.badges) ? JSON.stringify(payload.badges) : null,
      highlights: Array.isArray(payload.highlights) ? JSON.stringify(payload.highlights) : null,

      // lat/lng correctos con nullish
      lat: payload.lat ?? null,
      lng: payload.lng ?? null,

      status,
      createdBy: me.id,
      mediaCount: 0,
      coverImageUrl: null,
    })

    return response.created(toDto(listing))
  }

  // PUT /api/listings/:id
  public async update({ auth, params, request, response }: HttpContext) {
    const me = await auth.authenticate()
    const listing = await Listing.findOrFail(params.id)

    if (me.role === 'publisher' && listing.createdBy !== me.id) {
      return response.forbidden({ error: 'Solo puedes editar tus listings' })
    }

    const payload = request.only([
      'title',
      'summary',
      'address',
      'zone',
      'price',
      'priceLabel',
      'bedsLabel',
      'sizeLabel',
      'sizeM2',
      'isPremier',
      'badges',
      'highlights',
      'lat',
      'lng',
      'status',
    ])

    listing.merge({
      title: payload.title ?? listing.title,
      summary: payload.summary ?? listing.summary,
      address: payload.address ?? listing.address,
      zone: payload.zone ?? listing.zone,
      price: payload.price ?? listing.price,
      priceLabel: payload.priceLabel ?? listing.priceLabel,
      bedsLabel: payload.bedsLabel ?? listing.bedsLabel,
      sizeLabel: payload.sizeLabel ?? listing.sizeLabel,
      sizeM2: payload.sizeM2 ?? listing.sizeM2,
      isPremier: payload.isPremier ?? listing.isPremier,

      badges: Array.isArray(payload.badges) ? JSON.stringify(payload.badges) : listing.badges,

      highlights: Array.isArray(payload.highlights)
        ? JSON.stringify(payload.highlights)
        : listing.highlights,

      lat: payload.lat ?? listing.lat,
      lng: payload.lng ?? listing.lng,
    })

    if (payload.status && (me.role === 'superadmin' || me.role === 'staff')) {
      listing.status = payload.status as any
    } else if (payload.status && me.role === 'publisher') {
      if (listing.status !== 'published') {
        listing.status = payload.status === 'archived' ? 'archived' : 'draft'
      }
    }

    await listing.save()

    return toDto(listing)
  }

  // DELETE /api/listings/:id
  public async destroy({ auth, params, response }: HttpContext) {
    const me = await auth.authenticate()
    const listing = await Listing.findOrFail(params.id)

    if (me.role === 'publisher') {
      return response.forbidden({ error: 'No puedes borrar listings' })
    }

    if (me.role === 'staff' || me.role === 'superadmin') {
      await listing.delete()
      return response.ok({ ok: true })
    }

    return response.forbidden({ error: 'No puedes borrar listings' })
  }
}
