// app/controllers/listings_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import Listing from '#models/listing'
import { listingsSearchValidator } from '#validators/listings_search'

/** Lucid devuelve JSON columns como string en MySQL; toleramos ambos formatos. */
function parseJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[]
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

/**
 * DTO que consume el sitio público.
 *
 * Mantiene los campos heredados (`id: "listing-N"`, `priceLabel`, `beds` como
 * label string, etc.) para no romper `mexicosquared` mientras se migra.
 * Agrega los campos del nuevo modelo MLS para que la SearchBar/FiltersBar
 * y el mapa puedan filtrar correctamente.
 */
function toDto(l: Listing) {
  const priceLabel =
    l.priceLabel ?? `MN ${l.price.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

  const photos = Array.isArray(l.photos) ? l.photos.map((p) => p.url) : []
  const amenities = Array.isArray(l.amenities) ? l.amenities : parseJsonArray(l.amenities)
  const badges = Array.isArray(l.badges) ? l.badges : parseJsonArray(l.badges)
  const highlights = Array.isArray(l.highlights) ? l.highlights : parseJsonArray(l.highlights)

  return {
    // ── compat con front actual ──
    id: `listing-${l.id}`,
    slug: l.slug,
    title: l.title,
    priceLabel,
    address: l.address,
    zone: l.zone,
    badges,
    highlights,
    mediaCount: l.mediaCount,
    image: l.coverImageUrl ?? '/imagenes/placeholder.jpg',
    photos,
    beds: l.bedsLabel ?? (l.beds !== null ? `${l.beds} rec.` : ''),
    size:
      l.sizeLabel ??
      (l.m2Built ? `${l.m2Built} m²` : l.m2Land ? `${l.m2Land} m² terreno` : ''),
    isPremier: l.isPremier,
    isFavorite: false,
    coords: l.lat !== null && l.lng !== null ? { lat: Number(l.lat), lng: Number(l.lng) } : null,
    summary: l.summary,

    // ── nuevos campos MLS (Sprint 1) ──
    operationType: l.operationType,
    propertyType: l.propertyType,
    bedsCount: l.beds,
    bathsCount: l.baths !== null ? Number(l.baths) : null,
    parkingCount: l.parking,
    m2Built: l.m2Built !== null ? Number(l.m2Built) : null,
    m2Land: l.m2Land !== null ? Number(l.m2Land) : null,
    age: l.age,
    amenities,
    state: l.state,
    municipality: l.municipality,
    colony: l.colony,
    price: l.price,
    videoUrl: l.videoUrl,
    virtualTourUrl: l.virtualTourUrl,
    isFeatured: l.isFeatured,
    publishedAt: l.publishedAt?.toISO() ?? null,
    agentId: l.agentId,
  }
}

const SORT_TO_COLUMN: Record<string, { column: string; dir: 'asc' | 'desc' }> = {
  'created_at:desc': { column: 'created_at', dir: 'desc' },
  'created_at:asc': { column: 'created_at', dir: 'asc' },
  'price:asc': { column: 'price', dir: 'asc' },
  'price:desc': { column: 'price', dir: 'desc' },
  'size:desc': { column: 'm2_built', dir: 'desc' },
  'size:asc': { column: 'm2_built', dir: 'asc' },
  'published_at:desc': { column: 'published_at', dir: 'desc' },
  'published_at:asc': { column: 'published_at', dir: 'asc' },
}

export default class ListingsController {
  /**
   * GET /api/listings
   *
   * Query params (todos opcionales, validados con VineJS):
   *   operation, type, beds_min, baths_min, parking_min,
   *   min_price, max_price, m2_built_min, m2_land_min,
   *   state, municipality, amenities (CSV), q, bbox,
   *   page, per_page, sort, is_featured.
   *
   * Respuesta: `{ data: ListingDTO[], meta: { total, page, perPage, totalPages } }`
   */
  public async index({ request, response }: HttpContext) {
    let payload: Awaited<ReturnType<typeof listingsSearchValidator.validate>>
    try {
      payload = await listingsSearchValidator.validate(request.qs())
    } catch (error: any) {
      return response.unprocessableEntity({
        error: 'Parámetros de búsqueda inválidos',
        messages: error.messages ?? [],
      })
    }

    const page = payload.page ?? 1
    const perPage = payload.per_page ?? 20
    const sort = payload.sort ?? 'created_at:desc'
    const sortMap = SORT_TO_COLUMN[sort]

    const query = Listing.query()
      .where('status', 'published')
      .preload('photos', (q) => q.orderBy('sort_order', 'asc'))

    if (payload.operation) query.where('operation_type', payload.operation)
    if (payload.type) query.where('property_type', payload.type)
    if (payload.beds_min !== undefined) query.where('beds', '>=', payload.beds_min)
    if (payload.baths_min !== undefined) query.where('baths', '>=', payload.baths_min)
    if (payload.parking_min !== undefined) query.where('parking', '>=', payload.parking_min)
    if (payload.min_price !== undefined) query.where('price', '>=', payload.min_price)
    if (payload.max_price !== undefined) query.where('price', '<=', payload.max_price)
    if (payload.m2_built_min !== undefined) query.where('m2_built', '>=', payload.m2_built_min)
    if (payload.m2_land_min !== undefined) query.where('m2_land', '>=', payload.m2_land_min)
    if (payload.state) query.where('state', payload.state)
    if (payload.municipality) query.where('municipality', payload.municipality)
    if (payload.is_featured !== undefined) query.where('is_featured', payload.is_featured)

    if (payload.amenities) {
      const slugs = payload.amenities
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      // amenities es JSON array. Para MySQL usamos JSON_CONTAINS por cada slug.
      for (const slug of slugs) {
        query.whereRaw(`JSON_CONTAINS(amenities, JSON_QUOTE(?))`, [slug])
      }
    }

    if (payload.q) {
      const like = `%${payload.q}%`
      query.where((sub) => {
        sub
          .where('title', 'like', like)
          .orWhere('summary', 'like', like)
          .orWhere('address', 'like', like)
          .orWhere('zone', 'like', like)
          .orWhere('colony', 'like', like)
      })
    }

    if (payload.bbox) {
      const parts = payload.bbox.split(',').map((p) => Number.parseFloat(p))
      if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
        const [lat1, lng1, lat2, lng2] = parts
        const minLat = Math.min(lat1, lat2)
        const maxLat = Math.max(lat1, lat2)
        const minLng = Math.min(lng1, lng2)
        const maxLng = Math.max(lng1, lng2)
        query
          .whereBetween('lat', [minLat, maxLat])
          .whereBetween('lng', [minLng, maxLng])
      }
    }

    query.orderBy(sortMap.column, sortMap.dir)

    const result = await query.paginate(page, perPage)

    return {
      data: result.all().map(toDto),
      meta: {
        total: result.total,
        page: result.currentPage,
        perPage: result.perPage,
        totalPages: result.lastPage,
      },
    }
  }

  /** GET /api/listings/:slug — detalle público. */
  public async show({ params, response }: HttpContext) {
    const listing = await Listing.query()
      .where('slug', params.slug)
      .where('status', 'published')
      .preload('photos', (q) => q.orderBy('sort_order', 'asc'))
      .first()

    if (!listing) {
      return response.notFound({ error: 'Listing no encontrado' })
    }

    // Incrementa view_count async (sin esperar para no añadir latencia al response).
    Listing.query().where('id', listing.id).increment('view_count', 1).exec().catch(() => {
      /* swallow — analytics best-effort */
    })

    return toDto(listing)
  }

  /** POST /api/listings — admin/agente crea listing. */
  public async store({ auth, request, response }: HttpContext) {
    const me = await auth.authenticate()

    if (!['superadmin', 'staff', 'publisher'].includes(me.role)) {
      return response.forbidden({ error: 'No puedes crear listings' })
    }

    const payload = request.only([
      'slug',
      'title',
      'summary',
      'operationType',
      'propertyType',
      'address',
      'zone',
      'state',
      'municipality',
      'colony',
      'price',
      'priceLabel',
      'beds',
      'baths',
      'parking',
      'm2Built',
      'm2Land',
      'age',
      'amenities',
      'bedsLabel',
      'sizeLabel',
      'sizeM2',
      'isPremier',
      'isFeatured',
      'badges',
      'highlights',
      'lat',
      'lng',
      'videoUrl',
      'virtualTourUrl',
      'agentId',
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

    // publishers en Free quedan en 'pending_review' en el futuro (Sprint 4 — DECISIONES #12).
    // En Sprint 1 dejamos: publisher → draft, staff/superadmin → status que pidieron o published.
    const status: 'draft' | 'published' | 'archived' =
      me.role === 'publisher' ? 'draft' : (payload.status as any) || 'published'

    const agentId =
      me.role === 'publisher'
        ? me.id
        : payload.agentId !== undefined && payload.agentId !== null
          ? Number(payload.agentId)
          : me.id

    const listing = await Listing.create({
      slug: String(payload.slug),
      title: String(payload.title),
      summary: String(payload.summary),
      operationType: payload.operationType ?? null,
      propertyType: payload.propertyType ?? null,
      address: String(payload.address),
      zone: String(payload.zone),
      state: payload.state ?? null,
      municipality: payload.municipality ?? null,
      colony: payload.colony ?? null,
      price: Number(payload.price ?? 0),
      priceLabel: payload.priceLabel ?? null,
      beds: payload.beds !== undefined && payload.beds !== null ? Number(payload.beds) : null,
      baths: payload.baths !== undefined && payload.baths !== null ? Number(payload.baths) : null,
      parking:
        payload.parking !== undefined && payload.parking !== null ? Number(payload.parking) : null,
      m2Built:
        payload.m2Built !== undefined && payload.m2Built !== null ? Number(payload.m2Built) : null,
      m2Land:
        payload.m2Land !== undefined && payload.m2Land !== null ? Number(payload.m2Land) : null,
      age: payload.age !== undefined && payload.age !== null ? Number(payload.age) : null,
      amenities: Array.isArray(payload.amenities) ? (payload.amenities as string[]) : [],
      bedsLabel: payload.bedsLabel ?? null,
      sizeLabel: payload.sizeLabel ?? null,
      sizeM2:
        payload.sizeM2 !== undefined && payload.sizeM2 !== null ? Number(payload.sizeM2) : null,
      isPremier: Boolean(payload.isPremier),
      isFeatured: Boolean(payload.isFeatured),
      badges: Array.isArray(payload.badges) ? (payload.badges as string[]) : [],
      highlights: Array.isArray(payload.highlights) ? (payload.highlights as string[]) : [],
      lat: payload.lat ?? null,
      lng: payload.lng ?? null,
      videoUrl: payload.videoUrl ?? null,
      virtualTourUrl: payload.virtualTourUrl ?? null,
      status,
      createdBy: me.id,
      agentId,
      mediaCount: 0,
      coverImageUrl: null,
      viewCount: 0,
    })

    return response.created(toDto(listing))
  }

  /** PUT /api/listings/:id — admin/agente actualiza listing. RLS implícita. */
  public async update({ auth, params, request, response }: HttpContext) {
    const me = await auth.authenticate()
    const listing = await Listing.findOrFail(params.id)

    // Sprint 1: RLS suave por publisher.
    // (En Sprint 4 se sube a middleware EnforceListingOwnership por gap #6.)
    if (me.role === 'publisher' && listing.agentId !== me.id && listing.createdBy !== me.id) {
      return response.forbidden({ error: 'Solo puedes editar tus listings' })
    }

    const payload = request.only([
      'title',
      'summary',
      'operationType',
      'propertyType',
      'address',
      'zone',
      'state',
      'municipality',
      'colony',
      'price',
      'priceLabel',
      'beds',
      'baths',
      'parking',
      'm2Built',
      'm2Land',
      'age',
      'amenities',
      'bedsLabel',
      'sizeLabel',
      'sizeM2',
      'isPremier',
      'isFeatured',
      'badges',
      'highlights',
      'lat',
      'lng',
      'videoUrl',
      'virtualTourUrl',
      'agentId',
      'status',
    ])

    listing.merge({
      title: payload.title ?? listing.title,
      summary: payload.summary ?? listing.summary,
      operationType: payload.operationType ?? listing.operationType,
      propertyType: payload.propertyType ?? listing.propertyType,
      address: payload.address ?? listing.address,
      zone: payload.zone ?? listing.zone,
      state: payload.state ?? listing.state,
      municipality: payload.municipality ?? listing.municipality,
      colony: payload.colony ?? listing.colony,
      price: payload.price ?? listing.price,
      priceLabel: payload.priceLabel ?? listing.priceLabel,
      beds: payload.beds !== undefined ? payload.beds : listing.beds,
      baths: payload.baths !== undefined ? payload.baths : listing.baths,
      parking: payload.parking !== undefined ? payload.parking : listing.parking,
      m2Built: payload.m2Built !== undefined ? payload.m2Built : listing.m2Built,
      m2Land: payload.m2Land !== undefined ? payload.m2Land : listing.m2Land,
      age: payload.age !== undefined ? payload.age : listing.age,
      amenities: Array.isArray(payload.amenities)
        ? (payload.amenities as string[])
        : listing.amenities,
      bedsLabel: payload.bedsLabel ?? listing.bedsLabel,
      sizeLabel: payload.sizeLabel ?? listing.sizeLabel,
      sizeM2: payload.sizeM2 ?? listing.sizeM2,
      isPremier: payload.isPremier ?? listing.isPremier,
      isFeatured:
        // solo superadmin/staff pueden marcar destacado en Sprint 1.
        me.role === 'publisher'
          ? listing.isFeatured
          : payload.isFeatured !== undefined
            ? Boolean(payload.isFeatured)
            : listing.isFeatured,
      badges: Array.isArray(payload.badges) ? (payload.badges as string[]) : listing.badges,
      highlights: Array.isArray(payload.highlights)
        ? (payload.highlights as string[])
        : listing.highlights,
      lat: payload.lat ?? listing.lat,
      lng: payload.lng ?? listing.lng,
      videoUrl: payload.videoUrl ?? listing.videoUrl,
      virtualTourUrl: payload.virtualTourUrl ?? listing.virtualTourUrl,
    })

    // agentId solo lo cambia staff/superadmin.
    if (
      payload.agentId !== undefined &&
      (me.role === 'superadmin' || me.role === 'staff')
    ) {
      listing.agentId = payload.agentId === null ? null : Number(payload.agentId)
    }

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

  /** DELETE /api/listings/:id — solo staff/superadmin. */
  public async destroy({ auth, params, response }: HttpContext) {
    const me = await auth.authenticate()
    const listing = await Listing.findOrFail(params.id)

    if (me.role === 'publisher') {
      return response.forbidden({ error: 'No puedes borrar listings' })
    }

    await listing.delete()
    return response.ok({ ok: true })
  }
}
