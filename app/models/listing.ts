// app/models/listing.ts
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import ListingPhoto from '#models/listing_photo'
import User from '#models/user'

export type OperationType = 'venta' | 'renta_larga'
export type PropertyType =
  | 'casa'
  | 'departamento'
  | 'terreno'
  | 'local_comercial'
  | 'oficina'
  | 'nave_industrial'
  | 'bodega'
  | 'edificio'
export type ListingStatus = 'draft' | 'published' | 'archived'

export default class Listing extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare slug: string

  @column()
  declare title: string

  @column()
  declare summary: string

  // ── Clasificación MLS (Sprint 1, Gap #1) ─────────────────────────────────
  @column({ columnName: 'operation_type' })
  declare operationType: OperationType | null

  @column({ columnName: 'property_type' })
  declare propertyType: PropertyType | null

  // ── Atributos numéricos (Sprint 1, Gap #1) ───────────────────────────────
  @column() declare beds: number | null
  @column() declare baths: number | null
  @column() declare parking: number | null

  @column({ columnName: 'm2_built' }) declare m2Built: number | null
  @column({ columnName: 'm2_land' }) declare m2Land: number | null

  @column() declare age: number | null

  // amenities: array de slugs (json en MySQL)
  @column({
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: unknown): string[] => parseJsonArray(value),
  })
  declare amenities: string[]

  // ── Ubicación ────────────────────────────────────────────────────────────
  @column() declare address: string
  @column() declare zone: string

  @column() declare state: string | null
  @column() declare municipality: string | null
  @column() declare colony: string | null

  @column() declare lat: number | null
  @column() declare lng: number | null

  // ── Precio ───────────────────────────────────────────────────────────────
  @column() declare price: number

  @column({ columnName: 'price_label' })
  declare priceLabel: string | null

  // ── Labels heredados (compat con admin pre-Sprint 1) ────────────────────
  @column({ columnName: 'beds_label' }) declare bedsLabel: string | null
  @column({ columnName: 'size_label' }) declare sizeLabel: string | null
  @column({ columnName: 'size_m2' }) declare sizeM2: number | null

  // ── Flags de marketing ───────────────────────────────────────────────────
  @column({ columnName: 'is_premier' })
  declare isPremier: boolean

  @column({ columnName: 'is_featured' })
  declare isFeatured: boolean

  // ── Multimedia ───────────────────────────────────────────────────────────
  @column({
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: unknown): string[] => parseJsonArray(value),
  })
  declare badges: string[]

  @column({
    prepare: (value: string[] | null) => (value ? JSON.stringify(value) : null),
    consume: (value: unknown): string[] => parseJsonArray(value),
  })
  declare highlights: string[]

  @column({ columnName: 'media_count' })
  declare mediaCount: number

  @column({ columnName: 'cover_image_url' })
  declare coverImageUrl: string | null

  @column({ columnName: 'video_url' })
  declare videoUrl: string | null

  @column({ columnName: 'virtual_tour_url' })
  declare virtualTourUrl: string | null

  // ── Estado del listing ───────────────────────────────────────────────────
  @column()
  declare status: ListingStatus

  @column.dateTime({ columnName: 'published_at' })
  declare publishedAt: DateTime | null

  @column({ columnName: 'view_count' })
  declare viewCount: number

  // ── Autoría ──────────────────────────────────────────────────────────────
  @column({ columnName: 'created_by' })
  declare createdBy: number | null

  @column({ columnName: 'agent_id' })
  declare agentId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ── Relaciones ───────────────────────────────────────────────────────────
  @hasMany(() => ListingPhoto, { foreignKey: 'listingId' })
  declare photos: HasMany<typeof ListingPhoto>

  @belongsTo(() => User, { foreignKey: 'agentId' })
  declare agent: BelongsTo<typeof User>
}

/** Lucid guarda JSON como string en algunos drivers; toleramos ambos formatos. */
function parseJsonArray(value: unknown): string[] {
  if (value === null || value === undefined) return []
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
