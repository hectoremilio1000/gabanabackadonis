import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sprint 3 — Gap #4 (página /buscar con mapa).
 *
 * Añade un índice compuesto en `(lat, lng)` para que las queries con
 * `WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?` (bbox del mapa) no
 * hagan full table scan cuando el catálogo crezca.
 *
 * NO es un índice geoespacial (SPATIAL INDEX) porque eso requiere migrar
 * lat/lng a un campo POINT geográfico, lo cual rompe compatibilidad con el
 * resto del controller. Para 200-2000 listings el índice btree compuesto es
 * suficiente. Si el catálogo llega a 50k+ listings, Sprint 8+ migra a POINT.
 */
export default class extends BaseSchema {
  protected tableName = 'listings'

  async up() {
    this.schema.alterTable(this.tableName, (t) => {
      t.index(['lat', 'lng'], 'idx_listings_lat_lng')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (t) => {
      t.dropIndex(['lat', 'lng'], 'idx_listings_lat_lng')
    })
  }
}
