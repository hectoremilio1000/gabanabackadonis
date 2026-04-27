import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sprint 1 — Gap #1
 * Catálogo de municipios (DECISIONES_NEGOCIO #3).
 * En Sprint 1 sembramos solo los municipios presentes en listings_seed.json (~25).
 * Catálogo completo INEGI se difiere a Sprint 4 (página /agentes con autocomplete).
 */
export default class extends BaseSchema {
  protected tableName = 'municipalities'

  async up() {
    this.schema.createTable(this.tableName, (t) => {
      t.increments('id')
      t.integer('state_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('states')
        .onDelete('CASCADE')
      t.string('name', 96).notNullable()
      t.string('slug', 120).notNullable()
      t.timestamps(true, true)

      t.unique(['state_id', 'slug'], 'uq_muni_state_slug')
      t.index(['state_id'], 'idx_muni_state')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
