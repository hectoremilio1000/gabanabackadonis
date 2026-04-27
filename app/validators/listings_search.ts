import vine from '@vinejs/vine'

/**
 * Sprint 1 — Gap #2.
 * Validador de query params para `GET /api/listings`.
 *
 * Decisiones que aplica:
 *   - operation: 'venta' | 'renta_larga' (DECISIONES_NEGOCIO #4 — vacacional aplazado).
 *   - type: 8 enums de property_type.
 *   - paginación: per_page default 20, máximo 100 (SPRINT_PLAN Sprint 1).
 *   - sort whitelist (sin user-controlled SQL).
 *   - bbox: cuatro floats separados por coma, formato `lat1,lng1,lat2,lng2`.
 *
 * Lo que NO está cubierto y se delega al controller:
 *   - normalización de strings (lowercase / trim) — el controller lo aplica
 *     antes de pasar al query builder.
 *   - resolución de bbox a tupla numérica — se hace en el controller para
 *     mantener el validator declarativo.
 */
const operationTypes = ['venta', 'renta_larga'] as const
const propertyTypes = [
  'casa',
  'departamento',
  'terreno',
  'local_comercial',
  'oficina',
  'nave_industrial',
  'bodega',
  'edificio',
] as const
const allowedSorts = [
  'created_at:desc',
  'created_at:asc',
  'price:asc',
  'price:desc',
  'size:desc',
  'size:asc',
  'published_at:desc',
  'published_at:asc',
] as const

// bbox = "lat1,lng1,lat2,lng2" — cada componente es un float, lat ∈ [-90,90], lng ∈ [-180,180].
const bboxPattern = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/

export const listingsSearchValidator = vine.compile(
  vine.object({
    operation: vine.string().in([...operationTypes]).optional(),
    type: vine.string().in([...propertyTypes]).optional(),

    beds_min: vine.number().min(0).max(20).optional(),
    baths_min: vine.number().min(0).max(20).optional(),
    parking_min: vine.number().min(0).max(20).optional(),

    min_price: vine.number().min(0).optional(),
    max_price: vine.number().min(0).optional(),

    m2_built_min: vine.number().min(0).optional(),
    m2_land_min: vine.number().min(0).optional(),

    state: vine.string().trim().maxLength(64).optional(),
    municipality: vine.string().trim().maxLength(64).optional(),

    // amenities: lista separada por comas, p. ej. "alberca,gym,jardin"
    amenities: vine
      .string()
      .trim()
      .maxLength(500)
      .regex(/^[a-z0-9_,]+$/i)
      .optional(),

    q: vine.string().trim().minLength(1).maxLength(100).optional(),

    bbox: vine.string().trim().regex(bboxPattern).optional(),

    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),

    sort: vine.string().in([...allowedSorts]).optional(),

    is_featured: vine.boolean().optional(),
  })
)

export type ListingsSearchInput = Awaited<
  ReturnType<typeof listingsSearchValidator.validate>
>
