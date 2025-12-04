// /Users/hectoremilio/Proyectos/nodejs/adonis_gabana/gabana-backend/app/models/listing_photo.ts

import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class ListingPhoto extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'listing_id' })
  declare listingId: number

  @column()
  declare url: string

  @column({ columnName: 'sort_order' })
  declare sortOrder: number

  @column({ columnName: 'is_cover' })
  declare isCover: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
