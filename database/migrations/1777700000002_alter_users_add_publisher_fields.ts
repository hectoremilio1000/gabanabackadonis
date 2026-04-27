import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sprint 1 — Gap #1
 * Convierte `users` en tabla rica del modelo "agente libre" del marketplace.
 * Decisiones #1, #2, #5, #6.
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (t) => {
      t.string('slug', 96).nullable()
      t.string('phone_public', 32).nullable()
      t.string('whatsapp', 32).nullable()
      t.text('bio').nullable()
      t.string('photo_url', 1024).nullable()
      t.enum('verification_status', ['pending', 'approved', 'rejected'])
        .notNullable()
        .defaultTo('pending')
      t.timestamp('verified_at', { useTz: false }).nullable()
      t.text('verification_notes').nullable()
      t.integer('subscription_plan_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('subscription_plans')
        .onDelete('SET NULL')
      t.timestamp('trial_ends_at', { useTz: false }).nullable()
      t.integer('parent_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')

      t.unique(['slug'], 'uq_users_slug')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (t) => {
      t.dropUnique(['slug'], 'uq_users_slug')
      t.dropForeign(['subscription_plan_id'])
      t.dropForeign(['parent_id'])
      t.dropColumn('slug')
      t.dropColumn('phone_public')
      t.dropColumn('whatsapp')
      t.dropColumn('bio')
      t.dropColumn('photo_url')
      t.dropColumn('verification_status')
      t.dropColumn('verified_at')
      t.dropColumn('verification_notes')
      t.dropColumn('subscription_plan_id')
      t.dropColumn('trial_ends_at')
      t.dropColumn('parent_id')
    })
  }
}
