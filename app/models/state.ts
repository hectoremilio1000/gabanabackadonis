import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Municipality from '#models/municipality'

/** Sprint 1 — DECISIONES_NEGOCIO #3 (32 estados de México, fuente INEGI). */
export default class State extends BaseModel {
  static table = 'states'

  @column({ isPrimary: true }) declare id: number

  @column() declare code: string // INEGI 2-digit
  @column() declare name: string
  @column() declare slug: string

  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  @hasMany(() => Municipality, { foreignKey: 'stateId' })
  declare municipalities: HasMany<typeof Municipality>
}
