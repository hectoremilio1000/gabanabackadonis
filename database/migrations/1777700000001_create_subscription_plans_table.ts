import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sprint 1 — Gap #1
 * Catálogo de planes (Free / Pro / Premium) — DECISIONES_NEGOCIO #5.
 * Sembrado en SubscriptionPlanSeeder; sin billing real hasta Sprint 5.
 */
export default class extends BaseSchema {
  protected tableName = 'subscription_plans'

  async up() {
    this.schema.createTable(this.tableName, (t) => {
      t.increments('id')
      t.string('slug', 32).notNullable().unique() // 'free' | 'pro' | 'premium'
      t.string('name', 64).notNullable()
      t.integer('price_mxn').notNullable().defaultTo(0)
      t.integer('listings_limit').notNullable()
      t.integer('featured_limit').notNullable().defaultTo(0)
      t.boolean('has_advanced_stats').notNullable().defaultTo(false)
      t.boolean('has_priority_support').notNullable().defaultTo(false)
      t.string('badge_label', 32).nullable()
      t.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
