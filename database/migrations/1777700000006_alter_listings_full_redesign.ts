import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sprint 1 — Gap #1 (modelo Listing rico)
 *
 * Agrega los 18 campos del nuevo modelo MLS a la tabla `listings`:
 *   operation_type, property_type, beds, baths, parking, m2_built, m2_land,
 *   age, amenities, state, municipality, colony, agent_id, video_url,
 *   virtual_tour_url, published_at, view_count, is_featured.
 *
 * Backfill: las filas pre-existentes (p. ej. el listing seed "el fraile") se
 * marcan como `operation_type='venta'` / `property_type='casa'` y se asignan al
 * primer superadmin de la tabla `users` (per DECISIONES_NEGOCIO Sprint 1).
 *
 * NOTE: las columnas operation_type / property_type quedan nullable a nivel de
 * BD para no romper el backfill si la tabla está vacía o no hay superadmin
 * todavía. La obligatoriedad se impone a nivel de API en
 * `app/validators/listings_create.ts` (Sprint 1 lo deja preparado para Sprint 2).
 */
export default class extends BaseSchema {
  protected tableName = 'listings'

  async up() {
    // Paso 1 — Agregar columnas (todas nullable para permitir backfill).
    this.schema.alterTable(this.tableName, (t) => {
      t.enum('operation_type', ['venta', 'renta_larga']).nullable()
      t.enum('property_type', [
        'casa',
        'departamento',
        'terreno',
        'local_comercial',
        'oficina',
        'nave_industrial',
        'bodega',
        'edificio',
      ]).nullable()
      t.integer('beds').unsigned().nullable()
      t.decimal('baths', 3, 1).nullable()
      t.integer('parking').unsigned().nullable()
      t.decimal('m2_built', 10, 2).nullable()
      t.decimal('m2_land', 10, 2).nullable()
      t.integer('age').unsigned().nullable()
      t.json('amenities').nullable()
      t.string('state', 64).nullable()
      t.string('municipality', 64).nullable()
      t.string('colony', 128).nullable()
      t.integer('agent_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')
      t.string('video_url', 1024).nullable()
      t.string('virtual_tour_url', 1024).nullable()
      t.timestamp('published_at', { useTz: false }).nullable()
      t.integer('view_count').unsigned().notNullable().defaultTo(0)
      t.boolean('is_featured').notNullable().defaultTo(false)
    })

    // Paso 2 — Backfill de filas existentes.
    // Notas:
    //   - 'venta' y 'casa' como defaults (los más comunes).
    //   - agent_id <- primer superadmin (subconsulta independiente para evitar
    //     conflicto MySQL "no se puede actualizar y leer la misma tabla").
    //   - published_at <- COALESCE con created_at para conservar histórico.
    this.schema.raw(`
      SET @sa_id := (SELECT id FROM users WHERE role = 'superadmin' ORDER BY id ASC LIMIT 1);
    `)
    this.schema.raw(`
      UPDATE \`listings\`
      SET
        operation_type = COALESCE(operation_type, 'venta'),
        property_type  = COALESCE(property_type, 'casa'),
        agent_id       = COALESCE(agent_id, @sa_id),
        published_at   = COALESCE(published_at, created_at);
    `)
  }

  async down() {
    this.schema.alterTable(this.tableName, (t) => {
      t.dropForeign(['agent_id'])
      t.dropColumn('operation_type')
      t.dropColumn('property_type')
      t.dropColumn('beds')
      t.dropColumn('baths')
      t.dropColumn('parking')
      t.dropColumn('m2_built')
      t.dropColumn('m2_land')
      t.dropColumn('age')
      t.dropColumn('amenities')
      t.dropColumn('state')
      t.dropColumn('municipality')
      t.dropColumn('colony')
      t.dropColumn('agent_id')
      t.dropColumn('video_url')
      t.dropColumn('virtual_tour_url')
      t.dropColumn('published_at')
      t.dropColumn('view_count')
      t.dropColumn('is_featured')
    })
  }
}
