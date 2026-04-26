// app/services/listing_media_uploader.ts
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

type UploadOpts = { listingId: number; localPath: string }

export default class ListingMediaUploader {
  static async upload({ listingId, localPath }: UploadOpts) {
    const endpoint = process.env.S3_ENDPOINT
    const region = process.env.S3_REGION || 'auto'
    const bucket = process.env.S3_BUCKET
    const accessKeyId = process.env.S3_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('S3 storage no configurado')
    }

    const fileName = `${Date.now()}-${randomUUID()}.webp`
    const tmpOptimized = `${localPath}.opt.webp`
    const key = `gabana/listings/${listingId}/${fileName}`

    const MAX_W = 1600
    const input = sharp(localPath, { failOn: 'none' }).rotate()
    const meta = await input.metadata()
    const width = meta.width && meta.width > MAX_W ? MAX_W : meta.width || MAX_W
    await input.resize({ width }).webp({ quality: 80, effort: 4 }).toFile(tmpOptimized)

    const client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fs.createReadStream(tmpOptimized),
          ContentType: 'image/webp',
        })
      )
    } finally {
      try {
        fs.unlinkSync(localPath)
      } catch {}
      try {
        fs.unlinkSync(tmpOptimized)
      } catch {}
    }

    const apiBaseUrl =
      process.env.API_PUBLIC_BASE_URL ||
      process.env.RAILWAY_SERVICE_GABANABACKADONIS_URL ||
      'http://localhost:3333'
    const token = Buffer.from(key).toString('base64url')
    return `${apiBaseUrl.replace(/\/$/, '')}/api/media/${token}`
  }
}
