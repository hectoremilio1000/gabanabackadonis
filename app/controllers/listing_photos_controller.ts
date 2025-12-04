import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import path from 'node:path'
import ListingMediaUploader from '#services/listing_media_uploader'
import ListingPhoto from '#models/listing_photo'
import Listing from '#models/listing'

export default class ListingPhotosController {
  public async index({ params }: HttpContext) {
    const listingId = Number(params.id)

    const rows = await ListingPhoto.query()
      .where('listing_id', listingId)
      .orderBy('sort_order', 'asc')

    return rows.map((p) => ({
      id: p.id,
      url: p.url,
      sortOrder: p.sortOrder,
      isCover: p.isCover,
    }))
  }
  public async upload({ params, request, response }: HttpContext) {
    const listingId = Number(params.id)

    const single = request.file('file', {
      size: '20mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    })
    const many = request.files('files', {
      size: '60mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    })

    const files = [...(single ? [single] : []), ...(many && many.length ? many : [])]

    if (!listingId || files.length === 0) {
      return response.badRequest({ error: 'listingId y file/files son requeridos' })
    }

    // Validar archivos
    for (const f of files) {
      if (!f.isValid) {
        return response.badRequest({ error: f.errors })
      }
    }

    // Asegurar que exista el listing
    const listing = await Listing.findOrFail(listingId)

    const tmpDir = app.makePath('tmp')

    const last = await ListingPhoto.query()
      .where('listing_id', listingId)
      .orderBy('sort_order', 'desc')
      .first()

    let nextOrder = last ? (last.sortOrder || 0) + 1 : 1

    const created: Array<{
      id: number
      url: string
      sortOrder: number
      isCover: boolean
    }> = []

    for (const file of files) {
      await file.move(tmpDir, {
        name: `${Date.now()}_${file.clientName || 'upload'}`,
      })

      const localName = file.fileName! // asignado por move()
      const localPath = path.join(tmpDir, localName)

      const url = await ListingMediaUploader.upload({ listingId, localPath })

      const photo = await ListingPhoto.create({
        listingId,
        url,
        sortOrder: nextOrder++,
        isCover: false,
      })

      created.push({
        id: photo.id,
        url: photo.url,
        sortOrder: photo.sortOrder,
        isCover: photo.isCover,
      })
    }

    // Recalcular media_count
    const countRow = await ListingPhoto.query()
      .where('listing_id', listingId)
      .count('* as total')
      .first()

    const total = Number(countRow?.$extras.total ?? 0)
    listing.mediaCount = total

    // Si no tiene portada, usamos la primera recién subida
    if (!listing.coverImageUrl && created.length > 0) {
      const first = created[0]
      listing.coverImageUrl = first.url

      await ListingPhoto.query().where('id', first.id).update({ isCover: true })
      first.isCover = true
    }

    await listing.save()

    return { ok: true, count: created.length, photos: created }
  }

  /**
   * PUT /api/listings/:id/photos/reorder
   * Body: { ids: number[] } en el nuevo orden
   */
  public async reorder({ params, request, response }: HttpContext) {
    const listingId = Number(params.id)
    const ids = request.input('ids') as number[]

    if (!listingId || !Array.isArray(ids) || ids.length === 0) {
      return response.badRequest({ error: 'Provee listing id y "ids" (array no vacío)' })
    }

    const rows = await ListingPhoto.query().where('listing_id', listingId)
    const valid = new Set(rows.map((r) => r.id))

    for (const pid of ids) {
      if (!valid.has(pid)) {
        return response.badRequest({
          error: `Photo ${pid} no pertenece al listing ${listingId}`,
        })
      }
    }

    // Actualizar sort_order uno por uno (simple y compatible con MySQL)
    for (const [index, pid] of ids.entries()) {
      await ListingPhoto.query()
        .where('listing_id', listingId)
        .andWhere('id', pid)
        .update({ sortOrder: index + 1 })
    }

    const updated = await ListingPhoto.query()
      .where('listing_id', listingId)
      .orderBy('sort_order', 'asc')
      .select(['id', 'url', 'sort_order as sortOrder', 'is_cover as isCover'])

    return { ok: true, photos: updated }
  }

  /**
   * DELETE /api/listings/:id/photos/:photoId
   */
  public async destroy({ params, response }: HttpContext) {
    const listingId = Number(params.id)
    const photoId = Number(params.photoId)

    if (!listingId || !photoId) {
      return response.badRequest({ error: 'Ids inválidos' })
    }

    const photo = await ListingPhoto.query()
      .where('id', photoId)
      .andWhere('listing_id', listingId)
      .first()

    if (!photo) return response.notFound({ error: 'Photo not found' })

    const listing = await Listing.findOrFail(listingId)
    const wasCover = listing.coverImageUrl === photo.url

    await photo.delete()

    // Recalcular media_count
    const countRow = await ListingPhoto.query()
      .where('listing_id', listingId)
      .count('* as total')
      .first()
    const total = Number(countRow?.$extras.total ?? 0)
    listing.mediaCount = total

    // Si era portada, elegir nueva o limpiar
    if (wasCover) {
      const newCover = await ListingPhoto.query()
        .where('listing_id', listingId)
        .orderBy('sort_order', 'asc')
        .first()

      if (newCover) {
        listing.coverImageUrl = newCover.url

        await ListingPhoto.query().where('listing_id', listingId).update({ isCover: false })

        newCover.isCover = true
        await newCover.save()
      } else {
        listing.coverImageUrl = null
      }
    }

    await listing.save()

    return { ok: true }
  }
}
