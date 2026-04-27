// app/models/user.ts
import { DateTime } from 'luxon'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import hash from '@adonisjs/core/services/hash'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider, AccessToken } from '@adonisjs/auth/access_tokens'
import SubscriptionPlan from '#models/subscription_plan'
import Listing from '#models/listing'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export type Role = 'superadmin' | 'staff' | 'publisher'
export type VerificationStatus = 'pending' | 'approved' | 'rejected'

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true }) declare id: number

  @column() declare fullName: string
  @column() declare email: string
  @column({ serializeAs: null }) declare password: string
  @column() declare role: Role

  // ── Sprint 1 — campos de publisher / agente libre ────────────────────────
  @column() declare slug: string | null
  @column({ columnName: 'phone_public' }) declare phonePublic: string | null
  @column() declare whatsapp: string | null
  @column() declare bio: string | null
  @column({ columnName: 'photo_url' }) declare photoUrl: string | null

  @column({ columnName: 'verification_status' })
  declare verificationStatus: VerificationStatus

  @column.dateTime({ columnName: 'verified_at' })
  declare verifiedAt: DateTime | null

  @column({ columnName: 'verification_notes' })
  declare verificationNotes: string | null

  @column({ columnName: 'subscription_plan_id' })
  declare subscriptionPlanId: number | null

  @column.dateTime({ columnName: 'trial_ends_at' })
  declare trialEndsAt: DateTime | null

  @column({ columnName: 'parent_id' })
  declare parentId: number | null

  @column.dateTime({ autoCreate: true }) declare createdAt: DateTime
  @column.dateTime({ autoCreate: true, autoUpdate: true }) declare updatedAt: DateTime

  // ── Relaciones ───────────────────────────────────────────────────────────
  @belongsTo(() => SubscriptionPlan, { foreignKey: 'subscriptionPlanId' })
  declare subscriptionPlan: BelongsTo<typeof SubscriptionPlan>

  @belongsTo(() => User, { foreignKey: 'parentId' })
  declare parent: BelongsTo<typeof User>

  @hasMany(() => Listing, { foreignKey: 'agentId' })
  declare listings: HasMany<typeof Listing>

  // ── Auth tokens ──────────────────────────────────────────────────────────
  static accessTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '30 days',
    table: 'auth_access_tokens',
    prefix: 'oat_',
    type: 'auth_token',
    tokenSecretLength: 40,
  })

  declare currentAccessToken?: AccessToken
}
