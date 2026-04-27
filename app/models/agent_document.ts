// app/models/agent_document.ts
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'

export type AgentDocumentType =
  | 'rfc'
  | 'ine_frontal'
  | 'ine_reverso'
  | 'foto_perfil'
  | 'cedula_rpp'

export type AgentDocumentStatus = 'pendiente' | 'aprobado' | 'rechazado'

export default class AgentDocument extends BaseModel {
  @column({ isPrimary: true }) declare id: number

  @column({ columnName: 'user_id' }) declare userId: number
  @column() declare type: AgentDocumentType
  @column({ columnName: 'file_url' }) declare fileUrl: string
  @column() declare status: AgentDocumentStatus
  @column() declare notes: string | null

  @column.dateTime({ columnName: 'uploaded_at' })
  declare uploadedAt: DateTime | null

  @column.dateTime({ columnName: 'reviewed_at' })
  declare reviewedAt: DateTime | null

  @column({ columnName: 'reviewed_by' })
  declare reviewedBy: number | null

  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'reviewedBy' })
  declare reviewer: BelongsTo<typeof User>
}
