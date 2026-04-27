import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sprint 5 — billing.
 *
 * Agrega columnas de Stripe a `users` (customer_id, subscription_id) y a
 * `subscription_plans` (price_id_monthly). Crea tabla `subscriptions` para
 * trackear el estado del agente y los webhooks recibidos.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('users', (t) => {
      t.string('stripe_customer_id', 64).nullable()
      t.string('stripe_subscription_id', 64).nullable()
      t.timestamp('subscription_current_period_end', { useTz: false }).nullable()
      t.string('subscription_status', 32).nullable() // active|past_due|canceled|trialing|paused
      t.index(['stripe_customer_id'], 'idx_users_stripe_customer')
    })

    this.schema.alterTable('subscription_plans', (t) => {
      t.string('stripe_price_id', 64).nullable()
    })

    if (!(await this.db.schema.hasTable('subscription_events'))) {
      this.schema.createTable('subscription_events', (t) => {
        t.increments('id')
        t.string('stripe_event_id', 64).notNullable().unique()
        t.string('type', 64).notNullable()
        t.integer('user_id').unsigned().nullable()
          .references('id').inTable('users').onDelete('SET NULL')
        t.json('payload').nullable()
        t.timestamp('processed_at', { useTz: false }).defaultTo(this.now())
        t.index(['type', 'processed_at'], 'idx_sub_events_type')
      })
    }
  }

  async down() {
    this.schema.alterTable('users', (t) => {
      t.dropIndex(['stripe_customer_id'], 'idx_users_stripe_customer')
      t.dropColumn('stripe_customer_id')
      t.dropColumn('stripe_subscription_id')
      t.dropColumn('subscription_current_period_end')
      t.dropColumn('subscription_status')
    })
    this.schema.alterTable('subscription_plans', (t) => {
      t.dropColumn('stripe_price_id')
    })
    this.schema.dropTableIfExists('subscription_events')
  }
}
