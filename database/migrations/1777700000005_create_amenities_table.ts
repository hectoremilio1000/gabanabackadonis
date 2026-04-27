import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sprint 1 — Gap #1
 * Catálogo de amenidades en español MX (alberca, gym, jardín, seguridad 24h, etc.).
 * En `listings.amenities` (json) guardamos un array de slugs de esta tabla.
 * No es FK porque amenities en listing es un array; la integridad la valida el VineJS validator.
 */
export default class extends BaseSchema {
  protected tableName = 'amenities'

  async up() {
    this.schema.createTable(this.tableName, (t) => {
      t.increments('id')
      t.string('slug', 64).notNullable().unique()
      t.string('label', 96).notNullable()
      t.string('category', 32).notNullable() // exterior | deportivo | servicios | interior | comun | ubicacion
      t.integer('display_order').notNullable().defaultTo(0)
      t.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
