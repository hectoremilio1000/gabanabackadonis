// /Users/hectoremilio/Proyectos/nodejs/adonis_gabana/gabana-backend/database/migrations/1764653604578_create_listings_table.ts

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'listings'

  async up() {
    this.schema.createTable(this.tableName, (t) => {
      t.increments('id')

      t.string('slug').notNullable().unique()
      t.string('title').notNullable()
      t.string('summary', 500).notNullable()

      t.string('address').notNullable()
      t.string('zone').notNullable()

      // precio “canónico” + etiqueta opcional
      t.integer('price').notNullable() // ej. 24300
      t.string('price_label').nullable() // ej. "MN 24,300"

      // labels tal cual los usas en el front
      t.string('beds_label').nullable() // "1-2 rec."
      t.string('size_label').nullable() // "329 m²"
      t.integer('size_m2').nullable()

      t.boolean('is_premier').notNullable().defaultTo(false)

      t.decimal('lat', 10, 6).nullable()
      t.decimal('lng', 10, 6).nullable()

      t.json('badges').nullable()
      t.json('highlights').nullable()

      t.integer('media_count').notNullable().defaultTo(0)
      t.string('cover_image_url', 1024).nullable()

      t.enum('status', ['draft', 'published', 'archived']).notNullable().defaultTo('published')

      // quién creó la propiedad
      t.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL')

      t.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
