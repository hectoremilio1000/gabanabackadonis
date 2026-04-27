import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export type AmenityCategory =
  | 'exterior'
  | 'interior'
  | 'deportivo'
  | 'servicios'
  | 'comun'
  | 'ubicacion'

/**
 * Sprint 1 — Gap #1.
 * Catálogo en español MX (alberca, gym, jardín, seguridad 24h, etc.).
 * En `listings.amenities` (json) guardamos un array de slugs de esta tabla.
 */
export default class Amenity extends BaseModel {
  static table = 'amenities'

  @column({ isPrimary: true }) declare id: number
  @column() declare slug: string
  @column() declare label: string
  @column() declare category: AmenityCategory

  @column({ columnName: 'display_order' })
  declare displayOrder: number

  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime
}
