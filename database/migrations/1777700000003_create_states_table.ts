import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sprint 1 — Gap #1
 * Catálogo de los 32 estados de México (DECISIONES_NEGOCIO #3).
 * Datos sembrados en StateSeeder.
 */
export default class extends BaseSchema {
  protected tableName = 'states'

  async up() {
    this.schema.createTable(this.tableName, (t) => {
      t.increments('id')
      t.string('code', 8).notNullable().unique() // INEGI 2-digit code (01..32)
      t.string('name', 80).notNullable().unique()
      t.string('slug', 96).notNullable().unique()
      t.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
