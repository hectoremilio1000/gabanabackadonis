// app/models/user.ts
import { DateTime } from 'luxon'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import hash from '@adonisjs/core/services/hash'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider, AccessToken } from '@adonisjs/auth/access_tokens'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export type Role = 'superadmin' | 'staff' | 'publisher'

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true }) declare id: number
  @column() declare fullName: string
  @column() declare email: string
  @column({ serializeAs: null }) declare password: string
  @column() declare role: Role

  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  static accessTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '30 days',
    table: 'auth_access_tokens',
    prefix: 'oat_',
    type: 'auth_token',
    tokenSecretLength: 40,
  })

  declare currentAccessToken?: AccessToken
}
