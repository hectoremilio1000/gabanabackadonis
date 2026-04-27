import vine from '@vinejs/vine'

/**
 * Sprint 2 — validadores para los endpoints admin de leads.
 *
 * - listAdminLeadsValidator: query params del listado (filtros + paginación).
 * - updateLeadStatusValidator: body para PUT /:id/status.
 * - updateLeadValidator: body para PUT /:id (notas internas y status).
 */

const leadStatuses = ['nuevo', 'contactado', 'calificado', 'descartado', 'cerrado'] as const
const leadSources = ['listing', 'contact_page'] as const
const allowedSorts = ['created_at:desc', 'created_at:asc', 'status:asc'] as const

export const listAdminLeadsValidator = vine.compile(
  vine.object({
    status: vine
      .string()
      .in([...leadStatuses])
      .optional(),
    agent_id: vine.number().positive().optional(),
    listing_id: vine.number().positive().optional(),
    source: vine
      .string()
      .in([...leadSources])
      .optional(),
    q: vine.string().trim().minLength(1).maxLength(120).optional(),

    from: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
    to: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),

    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
    sort: vine
      .string()
      .in([...allowedSorts])
      .optional(),
  })
)

export const updateLeadStatusValidator = vine.compile(
  vine.object({
    status: vine.string().in([...leadStatuses]),
  })
)

export const updateLeadValidator = vine.compile(
  vine.object({
    status: vine
      .string()
      .in([...leadStatuses])
      .optional(),
    notes: vine.string().trim().maxLength(4000).nullable().optional(),
  })
)

export type ListAdminLeadsInput = Awaited<ReturnType<typeof listAdminLeadsValidator.validate>>
