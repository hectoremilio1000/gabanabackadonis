// database/migrations/create_listing_favorites.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'listing_favorites'

  async up() {
    this.schema.createTable(this.tableName, (t) => {
      t.increments('id')
      t.integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      t.integer('listing_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('listings')
        .onDelete('CASCADE')

      t.unique(['user_id', 'listing_id'], 'uq_user_listing_fav')
      t.timestamp('created_at', { useTz: false }).defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
