// app/controllers/agents_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import User from '#models/user'
import Listing from '#models/listing'

const listValidator = vine.compile(
  vine.object({
    q: vine.string().trim().minLength(1).maxLength(100).optional(),
    state: vine.string().trim().maxLength(64).optional(),
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(60).optional(),
  })
)

/**
 * Sprint 4 — Gap #8: endpoints públicos de agentes.
 *
 *   GET /api/agents              — directorio paginado de agentes verificados.
 *   GET /api/agents/:slug        — perfil público con badges + listings activos.
 */
export default class AgentsController {
  async index({ request, response }: HttpContext) {
    const filters = await listValidator.validate(request.qs())

    const page = filters.page ?? 1
    const perPage = filters.per_page ?? 20

    const query = User.query()
      .where('role', 'publisher')
      .where('verification_status', 'approved')
      .preload('subscriptionPlan')

    if (filters.q) {
      const term = `%${filters.q}%`
      query.whereILike('full_name', term)
    }

    const result = await query
      .orderBy('full_name', 'asc')
      .paginate(page, perPage)

    return response.ok({
      data: result.all().map((u) => serializePublicAgent(u)),
      meta: {
        total: result.total,
        page: result.currentPage,
        perPage: result.perPage,
        totalPages: result.lastPage,
      },
    })
  }

  async show({ params, response }: HttpContext) {
    const slug = String(params.slug)
    const agent = await User.query()
      .where('slug', slug)
      .where('role', 'publisher')
      .where('verification_status', 'approved')
      .preload('subscriptionPlan')
      .first()

    if (!agent) return response.notFound({ error: 'Agente no encontrado' })

    const listings = await Listing.query()
      .where('agent_id', agent.id)
      .where('status', 'published')
      .orderBy('created_at', 'desc')
      .limit(60)
      .preload('photos', (q) => q.orderBy('sort_order', 'asc').limit(1))

    return response.ok({
      ...serializePublicAgent(agent),
      bio: agent.bio,
      listings: listings.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        priceLabel:
          l.priceLabel ??
          `MN ${l.price.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`,
        operationType: l.operationType,
        propertyType: l.propertyType,
        zone: l.zone,
        coverImageUrl: l.coverImageUrl,
        beds: l.beds,
        baths: l.baths !== null ? Number(l.baths) : null,
        m2Built: l.m2Built !== null ? Number(l.m2Built) : null,
      })),
      listingsActiveCount: listings.length,
    })
  }
}

function serializePublicAgent(u: User) {
  // Badges según decisión #20:
  const badges: string[] = []
  if (u.verificationStatus === 'approved') badges.push('verified')
  if (u.subscriptionPlan?.slug === 'premium') badges.push('premium')
  // certified_rpp se setea en Sprint 4 por endpoint específico — placeholder.

  return {
    id: u.id,
    slug: u.slug,
    fullName: u.fullName,
    photoUrl: u.photoUrl,
    phonePublic: u.phonePublic,
    whatsapp: u.whatsapp,
    badges,
  }
}
