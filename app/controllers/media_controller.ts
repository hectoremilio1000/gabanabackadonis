import type { HttpContext } from '@adonisjs/core/http'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

export default class MediaController {
  public async show({ params, response }: HttpContext) {
    const token = params.token
    const key = Buffer.from(String(token || ''), 'base64url').toString('utf8')

    if (!key.startsWith('gabana/listings/')) {
      return response.badRequest({ error: 'Archivo inválido' })
    }

    const endpoint = process.env.S3_ENDPOINT
    const region = process.env.S3_REGION || 'auto'
    const bucket = process.env.S3_BUCKET
    const accessKeyId = process.env.S3_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      return response.internalServerError({ error: 'Storage no configurado' })
    }

    const client = new S3Client({
      endpoint,
      region,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    const bytes = await object.Body?.transformToByteArray()

    if (!bytes) {
      return response.notFound({ error: 'Archivo no encontrado' })
    }

    response.header('content-type', object.ContentType || 'application/octet-stream')
    response.header('cache-control', 'public, max-age=31536000, immutable')
    return response.send(Buffer.from(bytes))
  }
}
