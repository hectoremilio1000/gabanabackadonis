// app/models/lead.ts
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Listing from '#models/listing'
import User from '#models/user'

export type LeadSource = 'listing' | 'contact_page'
export type LeadStatus = 'nuevo' | 'contactado' | 'calificado' | 'descartado' | 'cerrado'

/**
 * Sprint 2 — Gap #3 (modelo Lead).
 *
 * Cada lead representa un contacto enviado desde el sitio público hacia un
 * agente. El controller `LeadsController.store` resuelve el agent_id a partir
 * del listing_id (si viene). Si el listing no tiene agent_id, queda null y
 * el email va al SUPPORT_EMAIL (fallback configurable en env).
 */
export default class Lead extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  // ── Relaciones (ambas nullable, ver migración para semántica) ───────────
  @column({ columnName: 'listing_id' })
  declare listingId: number | null

  @column({ columnName: 'agent_id' })
  declare agentId: number | null

  // ── Datos del comprador/inquilino ───────────────────────────────────────
  @column() declare name: string
  @column() declare phone: string
  @column() declare email: string
  @column() declare message: string

  // ── Origen y auditoría ──────────────────────────────────────────────────
  @column() declare source: LeadSource
  @column() declare ip: string | null

  @column({ columnName: 'user_agent' })
  declare userAgent: string | null

  // ── Workflow CRM ────────────────────────────────────────────────────────
  @column() declare status: LeadStatus
  @column() declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // ── Relaciones eager-loadable ──────────────────────────────────────────
  @belongsTo(() => Listing, { foreignKey: 'listingId' })
  declare listing: BelongsTo<typeof Listing>

  @belongsTo(() => User, { foreignKey: 'agentId' })
  declare agent: BelongsTo<typeof User>
}
