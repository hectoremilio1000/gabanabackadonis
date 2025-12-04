// /Users/hectoremilio/Proyectos/nodejs/adonis_gabana/gabana-backend/database/migrations/1764653641209_create_listing_photos_table.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'listing_photos'

  async up() {
    this.schema.createTable(this.tableName, (t) => {
      t.increments('id')

      t.integer('listing_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('listings')
        .onDelete('CASCADE')

      t.text('url').notNullable()
      t.integer('sort_order').notNullable().defaultTo(0)
      t.boolean('is_cover').notNullable().defaultTo(false)

      t.timestamp('created_at', { useTz: false }).defaultTo(this.now())

      t.index(['listing_id'], 'idx_photos_listing')
      // t.unique(['listing_id', 'sort_order'], 'uq_photos_listing_sort') // opcional
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
