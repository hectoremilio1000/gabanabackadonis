// app/controllers/admin_leads_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import Lead, { type LeadStatus } from '#models/lead'
import {
  listAdminLeadsValidator,
  updateLeadStatusValidator,
  updateLeadValidator,
} from '#validators/admin_leads'

const isAdmin = (role?: string) => role === 'superadmin' || role === 'staff'

/**
 * Sprint 2 — Gap #3 (cont.): endpoints admin de leads + RLS suave.
 *
 * RLS:
 *   - superadmin / staff → ven todos los leads.
 *   - publisher → solo ve `where agent_id = me.id`. La RLS formal vía
 *     middleware (`EnforceListingOwnership`) llega en Sprint 4 (Gap #6).
 *
 * Endpoints:
 *   - GET /api/admin/leads               — lista paginada con filtros.
 *   - GET /api/leads/mine                — alias publisher-friendly.
 *   - GET /api/admin/leads/:id           — detalle.
 *   - PUT /api/admin/leads/:id/status    — cambio rápido de status.
 *   - PUT /api/admin/leads/:id           — update parcial (status, notes).
 */
export default class AdminLeadsController {
  /** GET /api/admin/leads */
  async index({ auth, request, response }: HttpContext) {
    const me = await auth.authenticate()
    const filters = await request.validateUsing(listAdminLeadsValidator)

    const page = filters.page ?? 1
    const perPage = filters.per_page ?? 20
    const sort = (filters.sort ?? 'created_at:desc').split(':') as [string, 'asc' | 'desc']

    const query = Lead.query()
      .preload('listing', (l) => l.select('id', 'slug', 'title'))
      .preload('agent', (a) => a.select('id', 'fullName', 'email'))

    // RLS suave por rol.
    if (!isAdmin(me.role)) {
      query.where('agent_id', me.id)
    } else if (filters.agent_id) {
      query.where('agent_id', filters.agent_id)
    }

    if (filters.status) query.where('status', filters.status)
    if (filters.source) query.where('source', filters.source)
    if (filters.listing_id) query.where('listing_id', filters.listing_id)

    if (filters.q) {
      const term = `%${filters.q}%`
      query.where((b) => {
        b.whereILike('name', term).orWhereILike('email', term).orWhereILike('phone', term)
      })
    }

    if (filters.from) {
      // VineJS devuelve un Date nativo cuando el formato es YYYY-MM-DD.
      query.where('created_at', '>=', formatDateBoundary(filters.from, 'start'))
    }
    if (filters.to) {
      query.where('created_at', '<=', formatDateBoundary(filters.to, 'end'))
    }

    query.orderBy(sort[0], sort[1])

    const result = await query.paginate(page, perPage)

    return response.ok({
      data: result.all().map(serializeLead),
      meta: {
        total: result.total,
        page: result.currentPage,
        perPage: result.perPage,
        totalPages: result.lastPage,
      },
    })
  }

  /** GET /api/leads/mine — alias para publishers (filtra por agent_id automáticamente). */
  async mine(ctx: HttpContext) {
    return this.index(ctx)
  }

  /** GET /api/admin/leads/:id */
  async show({ auth, params, response }: HttpContext) {
    const me = await auth.authenticate()

    const lead = await Lead.query()
      .where('id', params.id)
      .preload('listing', (l) => l.select('id', 'slug', 'title'))
      .preload('agent', (a) => a.select('id', 'fullName', 'email'))
      .first()

    if (!lead) return response.notFound({ error: 'Lead no encontrado' })
    if (!isAdmin(me.role) && lead.agentId !== me.id) {
      return response.forbidden({ error: 'No tienes acceso a este lead' })
    }

    return response.ok(serializeLead(lead))
  }

  /** PUT /api/admin/leads/:id/status */
  async updateStatus({ auth, params, request, response }: HttpContext) {
    const me = await auth.authenticate()
    const { status } = await request.validateUsing(updateLeadStatusValidator)

    const lead = await Lead.find(params.id)
    if (!lead) return response.notFound({ error: 'Lead no encontrado' })
    if (!isAdmin(me.role) && lead.agentId !== me.id) {
      return response.forbidden({ error: 'No tienes acceso a este lead' })
    }

    lead.status = status as LeadStatus
    await lead.save()

    return response.ok(serializeLead(lead))
  }

  /** PUT /api/admin/leads/:id — update parcial (status y/o notes). */
  async update({ auth, params, request, response }: HttpContext) {
    const me = await auth.authenticate()
    const payload = await request.validateUsing(updateLeadValidator)

    const lead = await Lead.find(params.id)
    if (!lead) return response.notFound({ error: 'Lead no encontrado' })
    if (!isAdmin(me.role) && lead.agentId !== me.id) {
      return response.forbidden({ error: 'No tienes acceso a este lead' })
    }

    if (payload.status !== undefined) lead.status = payload.status as LeadStatus
    if (payload.notes !== undefined) lead.notes = payload.notes
    await lead.save()

    return response.ok(serializeLead(lead))
  }
}

/** Convierte un Date YYYY-MM-DD a string MySQL DATETIME en el límite del día. */
function formatDateBoundary(date: Date, edge: 'start' | 'end'): string {
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const time = edge === 'start' ? '00:00:00' : '23:59:59'
  return `${yyyy}-${mm}-${dd} ${time}`
}

function serializeLead(lead: Lead) {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    message: lead.message,
    source: lead.source,
    status: lead.status,
    notes: lead.notes,
    listing: lead.listing
      ? { id: lead.listing.id, slug: lead.listing.slug, title: lead.listing.title }
      : null,
    agent: lead.agent
      ? { id: lead.agent.id, fullName: lead.agent.fullName, email: lead.agent.email }
      : null,
    listingId: lead.listingId,
    agentId: lead.agentId,
    ip: lead.ip,
    userAgent: lead.userAgent,
    createdAt: lead.createdAt?.toISO(),
    updatedAt: lead.updatedAt?.toISO(),
  }
}
