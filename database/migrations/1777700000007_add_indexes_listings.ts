import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sprint 1 — Gap #1 / soporte de Gap #2
 *
 * Índices compuestos para que `GET /api/listings` con filtros se mantenga p95 < 300ms
 * con 200 listings sembrados (criterio DoD Sprint 1):
 *   - (status, operation_type, property_type) cubre la combinación más común.
 *   - (state, municipality) cubre filtros geográficos.
 *   - (agent_id) cubre RLS futura por publisher (Sprint 4).
 *   - (is_featured, status) cubre el ribbon de destacados.
 *   - (published_at) cubre orden por más recientes.
 */
export default class extends BaseSchema {
  protected tableName = 'listings'

  async up() {
    this.schema.alterTable(this.tableName, (t) => {
      t.index(['status', 'operation_type', 'property_type'], 'idx_listings_status_op_type')
      t.index(['state', 'municipality'], 'idx_listings_state_muni')
      t.index(['agent_id'], 'idx_listings_agent')
      t.index(['is_featured', 'status'], 'idx_listings_featured_status')
      t.index(['published_at'], 'idx_listings_published_at')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (t) => {
      t.dropIndex([], 'idx_listings_status_op_type')
      t.dropIndex([], 'idx_listings_state_muni')
      t.dropIndex([], 'idx_listings_agent')
      t.dropIndex([], 'idx_listings_featured_status')
      t.dropIndex([], 'idx_listings_published_at')
    })
  }
}
