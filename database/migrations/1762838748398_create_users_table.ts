// database/migrations/users.ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (t) => {
      t.increments('id')
      t.string('full_name', 180).notNullable()
      t.string('email', 254).notNullable().unique()
      // con AuthFinder la columna del hash es 'password'
      t.string('password', 255).notNullable()
      // roles: superadmin | staff | publisher
      t.enum('role', ['superadmin', 'staff', 'publisher']).notNullable().defaultTo('publisher')
      t.timestamps(true, true)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
