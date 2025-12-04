// /Users/hectoremilio/Proyectos/nodejs/adonis_gabana/gabana-backend/app/models/listing.ts

import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import ListingPhoto from '#models/listing_photo'

export default class Listing extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare slug: string

  @column()
  declare title: string

  @column()
  declare summary: string

  @column()
  declare address: string

  @column()
  declare zone: string

  @column()
  declare price: number

  @column({ columnName: 'price_label' })
  declare priceLabel: string | null

  @column({ columnName: 'beds_label' })
  declare bedsLabel: string | null

  @column({ columnName: 'size_label' })
  declare sizeLabel: string | null

  @column({ columnName: 'size_m2' })
  declare sizeM2: number | null

  @column({ columnName: 'is_premier' })
  declare isPremier: boolean

  @column()
  declare lat: number | null

  @column()
  declare lng: number | null

  @column()
  declare badges: string | null

  @column()
  declare highlights: string | null

  @column({ columnName: 'media_count' })
  declare mediaCount: number

  @column({ columnName: 'cover_image_url' })
  declare coverImageUrl: string | null

  @column()
  declare status: 'draft' | 'published' | 'archived'

  @column({ columnName: 'created_by' })
  declare createdBy: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @hasMany(() => ListingPhoto, { foreignKey: 'listingId' })
  declare photos: HasMany<typeof ListingPhoto>
}
