// app/services/listing_media_uploader.ts
import fs from 'node:fs'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

type UploadOpts = { listingId: number; localPath: string }

/**
 * Sprint 6 — Gap #10: genera 3 tamaños WebP por foto.
 *
 * thumb 320w, medium 800w, large 1600w. Devuelve un objeto con las 3 URLs.
 * `url` (= large) se mantiene por compat con `listing_photos.url`.
 * Sprint 6 agrega columna `variants:json` para guardar las 3 URLs.
 */

const SIZES: Array<{ key: 'thumb' | 'medium' | 'large'; width: number; quality: number }> = [
  { key: 'thumb', width: 320, quality: 75 },
  { key: 'medium', width: 800, quality: 80 },
  { key: 'large', width: 1600, quality: 82 },
]

export interface UploadResult {
  url: string
  thumb: string
  medium: string
  large: string
  variants: { thumb: string; medium: string; large: string }
}

export default class ListingMediaUploader {
  static async upload({ listingId, localPath }: UploadOpts): Promise<UploadResult> {
    const endpoint = process.env.S3_ENDPOINT
    const region = process.env.S3_REGION || 'auto'
    const bucket = process.env.S3_BUCKET
    const accessKeyId = process.env.S3_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('S3 storage no configurado')
    }

    const stem = `${Date.now()}-${randomUUID()}`
    const tmpFiles: string[] = []
    const urls: Record<'thumb' | 'medium' | 'large', string> = {
      thumb: '',
      medium: '',
      large: '',
    }

    const client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    })

    try {
      await Promise.all(
        SIZES.map(async ({ key, width, quality }) => {
          const tmp = `${localPath}.${key}.webp`
          tmpFiles.push(tmp)

          await sharp(localPath, { failOn: 'none' })
            .rotate()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality, effort: 4 })
            .toFile(tmp)

          const s3Key = `gabana/listings/${listingId}/${stem}-${key}.webp`
          await client.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: s3Key,
              Body: fs.createReadStream(tmp),
              ContentType: 'image/webp',
            })
          )
          urls[key] = buildPublicUrl(s3Key)
        })
      )
    } finally {
      try { fs.unlinkSync(localPath) } catch {}
      for (const f of tmpFiles) {
        try { fs.unlinkSync(f) } catch {}
      }
    }

    return {
      url: urls.large,
      thumb: urls.thumb,
      medium: urls.medium,
      large: urls.large,
      variants: { thumb: urls.thumb, medium: urls.medium, large: urls.large },
    }
  }
}

function buildPublicUrl(key: string): string {
  const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, '')}/${key}`
  }
  const apiBaseUrl =
    process.env.API_PUBLIC_BASE_URL ||
    process.env.RAILWAY_SERVICE_GABANABACKADONIS_URL ||
    'http://localhost:3333'
  const token = Buffer.from(key).toString('base64url')
  return `${apiBaseUrl.replace(/\/$/, '')}/api/media/${token}`
}
