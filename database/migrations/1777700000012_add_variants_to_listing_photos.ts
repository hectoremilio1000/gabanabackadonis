import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sprint 6 — Gap #10: agrega `variants:json` a listing_photos.
 *
 * Fotos antiguas (Sprint 0-5) tienen solo `url` (large 1600w). Las nuevas
 * fotos suben con las 3 variantes (thumb 320, medium 800, large 1600). El
 * front sigue usando `url` como fallback si `variants` es null.
 */
export default class extends BaseSchema {
  protected tableName = 'listing_photos'

  async up() {
    this.schema.alterTable(this.tableName, (t) => {
      t.json('variants').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (t) => {
      t.dropColumn('variants')
    })
  }
}
