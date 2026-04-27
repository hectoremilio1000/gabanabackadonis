import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import State from '#models/state'

/** Sprint 1 — DECISIONES_NEGOCIO #3. Catálogo completo INEGI se difiere a Sprint 4. */
export default class Municipality extends BaseModel {
  static table = 'municipalities'

  @column({ isPrimary: true }) declare id: number

  @column({ columnName: 'state_id' })
  declare stateId: number

  @column() declare name: string
  @column() declare slug: string

  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  @belongsTo(() => State, { foreignKey: 'stateId' })
  declare state: BelongsTo<typeof State>
}
