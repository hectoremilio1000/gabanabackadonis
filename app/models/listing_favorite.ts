import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class ListingFavorite extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'user_id' })
  declare userId: number

  @column({ columnName: 'listing_id' })
  declare listingId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
