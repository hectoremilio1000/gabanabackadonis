import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sprint 6 — auth pública para favoritos.
 *
 * Tabla `public_users` separada de `users` (que es para staff/agentes).
 * Sólo guarda email + magic-link tokens. Sin password.
 *
 * Migra `listing_favorites.user_id` para que apunte a `public_users` en lugar
 * de `users` cuando viene del sitio público. Para no romper Sprint 0, dejamos
 * la columna como int sin FK estricta y discriminamos por `audience` enum.
 */
export default class extends BaseSchema {
  async up() {
    if (!(await this.db.schema.hasTable('public_users'))) {
      this.schema.createTable('public_users', (t) => {
        t.increments('id')
        t.string('email', 160).notNullable().unique()
        t.string('full_name', 120).nullable()
        t.string('phone', 32).nullable()
        t.timestamps(true, true)
      })
    }

    if (!(await this.db.schema.hasTable('public_magic_links'))) {
      this.schema.createTable('public_magic_links', (t) => {
        t.increments('id')
        t.integer('public_user_id').unsigned().notNullable()
          .references('id').inTable('public_users').onDelete('CASCADE')
        t.string('token_hash', 128).notNullable().unique()
        t.timestamp('expires_at', { useTz: false }).notNullable()
        t.timestamp('consumed_at', { useTz: false }).nullable()
        t.timestamps(true, true)
        t.index(['expires_at'], 'idx_magic_expires')
      })
    }

    if (!(await this.db.schema.hasTable('public_sessions'))) {
      this.schema.createTable('public_sessions', (t) => {
        t.increments('id')
        t.integer('public_user_id').unsigned().notNullable()
          .references('id').inTable('public_users').onDelete('CASCADE')
        t.string('token_hash', 128).notNullable().unique()
        t.timestamp('expires_at', { useTz: false }).notNullable()
        t.timestamps(true, true)
      })
    }

    // Discriminamos favoritos por audience: 'staff' (default, ya existente) o 'public'.
    if (await this.db.schema.hasTable('listing_favorites')) {
      this.schema.alterTable('listing_favorites', (t) => {
        t.enum('audience', ['staff', 'public']).notNullable().defaultTo('staff')
      })
    }
  }

  async down() {
    this.schema.alterTable('listing_favorites', (t) => {
      t.dropColumn('audience')
    })
    this.schema.dropTableIfExists('public_sessions')
    this.schema.dropTableIfExists('public_magic_links')
    this.schema.dropTableIfExists('public_users')
  }
}
