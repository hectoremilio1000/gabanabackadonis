// app/controllers/public_auth_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import crypto from 'node:crypto'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import PublicUser from '#models/public_user'
import { getEmailTransport } from '#services/email_service'

const requestValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().maxLength(160),
    full_name: vine.string().trim().minLength(2).maxLength(120).optional(),
  })
)

const consumeValidator = vine.compile(
  vine.object({
    token: vine.string().trim().minLength(20).maxLength(120),
  })
)

/**
 * Sprint 6 — Auth pública con magic link (sin password).
 *
 * Flujo:
 *   1. POST /api/auth/public/request   { email } → email con magic link.
 *   2. Click en email → /auth/callback?token=... en mexicosquared.
 *   3. mexicosquared hace POST /api/auth/public/consume { token } → recibe
 *      session token (60d) que el FE guarda en localStorage o cookie.
 *   4. POST /api/auth/public/me con Authorization: Bearer <session_token> →
 *      datos del public_user.
 */
export default class PublicAuthController {
  /** POST /api/auth/public/request */
  async request({ request, response }: HttpContext) {
    const { email, full_name } = await request.validateUsing(requestValidator)

    const user = await PublicUser.firstOrCreate(
      { email },
      { email, fullName: full_name ?? null }
    )

    // Genera token y guarda hash.
    const raw = crypto.randomBytes(32).toString('hex')
    const hash = crypto.createHash('sha256').update(raw).digest('hex')
    const expiresAt = DateTime.now().plus({ minutes: 30 })

    await db.table('public_magic_links').insert({
      public_user_id: user.id,
      token_hash: hash,
      expires_at: expiresAt.toSQL({ includeOffset: false }),
      created_at: db.raw('CURRENT_TIMESTAMP'),
      updated_at: db.raw('CURRENT_TIMESTAMP'),
    })

    // Envía email best-effort.
    const publicBase = env.get('PUBLIC_SITE_BASE_URL') ?? 'http://localhost:3000'
    const link = `${publicBase}/auth/callback?token=${raw}`

    try {
      await getEmailTransport().send({
        to: email,
        subject: 'Tu acceso a Gabana',
        html: `<!doctype html><html><body style="font-family:Montserrat,system-ui,sans-serif;color:#0F172A;background:#F8FAFC;padding:24px"><div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:24px"><h1 style="font-size:20px;color:#007BFF;margin:0 0 16px">Tu acceso a Gabana</h1><p>Da click en el siguiente botón para entrar. El link expira en 30 minutos.</p><p style="text-align:center;margin:24px 0"><a href="${link}" style="display:inline-block;background:#007BFF;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:20px;font-weight:600">Entrar a Gabana</a></p><p style="font-size:12px;color:#64748B">Si no fuiste tú, ignora este correo.</p></div></body></html>`,
      })
    } catch (err) {
      logger.warn({ err, email }, '[public-auth] magic link email failed')
    }

    return response.ok({ ok: true })
  }

  /** POST /api/auth/public/consume */
  async consume({ request, response }: HttpContext) {
    const { token } = await request.validateUsing(consumeValidator)

    const hash = crypto.createHash('sha256').update(token).digest('hex')
    const link = await db
      .from('public_magic_links')
      .where('token_hash', hash)
      .whereNull('consumed_at')
      .where('expires_at', '>', new Date())
      .first()

    if (!link) {
      return response.unprocessableEntity({ error: 'Token inválido o expirado' })
    }

    await db
      .from('public_magic_links')
      .where('id', link.id)
      .update({ consumed_at: new Date() })

    // Crea sesión 60 días.
    const sessionRaw = crypto.randomBytes(32).toString('hex')
    const sessionHash = crypto.createHash('sha256').update(sessionRaw).digest('hex')
    const sessionExpiry = DateTime.now().plus({ days: 60 })
    await db.table('public_sessions').insert({
      public_user_id: link.public_user_id,
      token_hash: sessionHash,
      expires_at: sessionExpiry.toSQL({ includeOffset: false }),
      created_at: db.raw('CURRENT_TIMESTAMP'),
      updated_at: db.raw('CURRENT_TIMESTAMP'),
    })

    const user = await PublicUser.find(link.public_user_id)
    return response.ok({
      session_token: sessionRaw,
      expires_at: sessionExpiry.toISO(),
      user: user
        ? { id: user.id, email: user.email, fullName: user.fullName }
        : null,
    })
  }

  /** GET /api/auth/public/me — header Authorization: Bearer <session_token> */
  async me({ request, response }: HttpContext) {
    const auth = request.header('authorization') ?? ''
    const m = auth.match(/^Bearer\s+(.+)$/i)
    if (!m) return response.unauthorized({ error: 'No session token' })

    const hash = crypto.createHash('sha256').update(m[1]!).digest('hex')
    const session = await db
      .from('public_sessions')
      .where('token_hash', hash)
      .where('expires_at', '>', new Date())
      .first()
    if (!session) return response.unauthorized({ error: 'Session inválida' })

    const user = await PublicUser.find(session.public_user_id)
    if (!user) return response.unauthorized({ error: 'Usuario no encontrado' })

    return response.ok({ id: user.id, email: user.email, fullName: user.fullName })
  }
}

/**
 * Helper exportado para que otros controllers (favoritos públicos) puedan
 * resolver el public_user a partir del header Authorization.
 */
export async function resolvePublicUserFromRequest(
  request: HttpContext['request']
): Promise<PublicUser | null> {
  const auth = request.header('authorization') ?? ''
  const m = auth.match(/^Bearer\s+(.+)$/i)
  if (!m) return null

  const hash = crypto.createHash('sha256').update(m[1]!).digest('hex')
  const session = await db
    .from('public_sessions')
    .where('token_hash', hash)
    .where('expires_at', '>', new Date())
    .first()
  if (!session) return null

  return await PublicUser.find(session.public_user_id)
}
