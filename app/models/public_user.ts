// app/models/public_user.ts
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class PublicUser extends BaseModel {
  static table = 'public_users'

  @column({ isPrimary: true }) declare id: number
  @column() declare email: string
  @column({ columnName: 'full_name' }) declare fullName: string | null
  @column() declare phone: string | null

  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
