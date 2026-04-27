import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sprint 2 — Gap #3 (modelo Lead + endpoint público)
 *
 * Crea la tabla `leads` para capturar contactos enviados desde:
 *   - el form de la ficha de propiedad (`source='listing'`, lleva listing_id)
 *   - la página /contacto (`source='contact_page'`, sin listing_id)
 *
 * Ambas FKs (listing_id, agent_id) son nullable para soportar:
 *   - leads de /contacto que no apuntan a una propiedad concreta
 *   - leads cuyo listing fue archivado/eliminado después (onDelete SET NULL)
 *   - leads cuyo agente fue desactivado (onDelete SET NULL)
 *
 * `agent_id` se resuelve en el controller a partir de `listing.agent_id` cuando
 * existe `listing_id`. Si el listing no tiene agent_id (anomalía documentada
 * del seed "El Fraile" en SPRINT_1_CIERRE.md §Anomalías) o el lead viene de
 * /contacto, queda null y el email va al SUPPORT_EMAIL.
 *
 * Índices: `(status, created_at)` para la cola de leads pendientes en admin,
 * `(agent_id, status)` para el dashboard de cada publisher (RLS suave).
 */
export default class extends BaseSchema {
  protected tableName = 'leads'

  async up() {
    this.schema.createTable(this.tableName, (t) => {
      t.increments('id')

      // ── Relaciones ─────────────────────────────────────────────────────
      t.integer('listing_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('listings')
        .onDelete('SET NULL')

      t.integer('agent_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')

      // ── Datos del comprador/inquilino ──────────────────────────────────
      t.string('name', 120).notNullable()
      t.string('phone', 32).notNullable()
      t.string('email', 160).notNullable()
      t.text('message').notNullable()

      // ── Origen del lead ────────────────────────────────────────────────
      t.enum('source', ['listing', 'contact_page']).notNullable().defaultTo('listing')

      // ── Auditoría / antifraude ─────────────────────────────────────────
      t.string('ip', 64).nullable()
      t.string('user_agent', 512).nullable()

      // ── Workflow CRM ───────────────────────────────────────────────────
      t.enum('status', ['nuevo', 'contactado', 'calificado', 'descartado', 'cerrado'])
        .notNullable()
        .defaultTo('nuevo')

      // Notas internas del agente/admin (Sprint 2 las muestra en el detalle)
      t.text('notes').nullable()

      t.timestamps(true, true)

      // Índices
      t.index(['status', 'created_at'], 'idx_leads_status_created')
      t.index(['agent_id', 'status'], 'idx_leads_agent_status')
      t.index(['listing_id'], 'idx_leads_listing')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
