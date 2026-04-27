import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sprint 4 — Gap #7: tabla `agent_documents` para verificación de agentes.
 *
 * Cada agente sube documentos al bucket S3 PRIVADO (decisión #6 de
 * DECISIONES_NEGOCIO). El admin/staff los revisa y aprueba o rechaza al
 * agente. La aprobación setea `users.verification_status='approved'` y
 * dispara email de bienvenida (Resend).
 */
export default class extends BaseSchema {
  protected tableName = 'agent_documents'

  async up() {
    this.schema.createTable(this.tableName, (t) => {
      t.increments('id')
      t.integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      t.enum('type', [
        'rfc',
        'ine_frontal',
        'ine_reverso',
        'foto_perfil',
        'cedula_rpp',
      ]).notNullable()
      t.string('file_url', 1024).notNullable()
      t.enum('status', ['pendiente', 'aprobado', 'rechazado'])
        .notNullable()
        .defaultTo('pendiente')
      t.text('notes').nullable()
      t.timestamp('uploaded_at', { useTz: false }).defaultTo(this.now())
      t.timestamp('reviewed_at', { useTz: false }).nullable()
      t.integer('reviewed_by').unsigned().nullable()
        .references('id').inTable('users').onDelete('SET NULL')

      t.timestamps(true, true)

      t.index(['user_id', 'type'], 'idx_agent_docs_user_type')
      t.index(['status'], 'idx_agent_docs_status')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
