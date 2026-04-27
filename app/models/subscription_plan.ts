import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export type SubscriptionPlanSlug = 'free' | 'pro' | 'premium'

/**
 * Sprint 1 — DECISIONES_NEGOCIO #5
 * Planes Free / Pro / Premium. Sin billing real hasta Sprint 5.
 */
export default class SubscriptionPlan extends BaseModel {
  static table = 'subscription_plans'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare slug: SubscriptionPlanSlug

  @column()
  declare name: string

  @column({ columnName: 'price_mxn' })
  declare priceMxn: number

  @column({ columnName: 'listings_limit' })
  declare listingsLimit: number

  @column({ columnName: 'featured_limit' })
  declare featuredLimit: number

  @column({ columnName: 'has_advanced_stats' })
  declare hasAdvancedStats: boolean

  @column({ columnName: 'has_priority_support' })
  declare hasPrioritySupport: boolean

  @column({ columnName: 'badge_label' })
  declare badgeLabel: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
