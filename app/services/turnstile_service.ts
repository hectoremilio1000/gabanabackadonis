import env from '#start/env'

/**
 * Sprint 2 — Validación de Cloudflare Turnstile (stub mockeado).
 *
 * DECISIÓN HUMANA (2026-04-26): Turnstile se DIFIERE a Sprint 7. Mientras tanto
 * este servicio implementa un STUB que retorna `success: true` cuando NO hay
 * `TURNSTILE_SECRET_KEY` configurado en el entorno. Esto permite avanzar con
 * Sprint 2-6 sin bloquear el frontend ni el endpoint público.
 *
 * RIESGO ACEPTADO: el endpoint POST /api/leads queda abierto al spam hasta que
 * Sprint 7 active el secret real. La mitigación activa es el rate limit por IP
 * (5 leads/minuto/IP) implementado en `app/services/rate_limiter.ts`, que actúa
 * como barrera mínima contra abuso.
 *
 * ACTIVACIÓN EN PRODUCCIÓN (Sprint 7):
 *   1. Hector configura sitio en https://dash.cloudflare.com → Turnstile.
 *   2. Pega `TURNSTILE_SECRET_KEY` en el `.env` del backend.
 *   3. Pega `NEXT_PUBLIC_TURNSTILE_SITE_KEY` en el `.env` de mexicosquared.
 *   4. Sin tocar código, el servicio empieza a validar contra Cloudflare.
 *
 * Documentación: ver PENDIENTES_OPERATIVOS.md fila #28b (Sprint 7).
 */

export interface TurnstileVerifyResult {
  success: boolean
  /** True cuando el servicio respondió en modo stub (no se llamó a Cloudflare). */
  mock?: boolean
  /** Códigos de error que Cloudflare devuelve. Solo poblado en modo real. */
  errorCodes?: string[]
}

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Valida un token Turnstile contra el endpoint siteverify de Cloudflare.
 *
 * - Modo STUB (dev/test, default Sprint 2-6): siempre retorna `{ success: true, mock: true }`.
 * - Modo REAL (Sprint 7+): valida contra Cloudflare y retorna `success` según
 *   la respuesta. Falla cerrado: si la red falla, retorna `success: false` con
 *   `errorCodes: ['network_error']` para que el controller responda 422.
 */
export async function validateTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  const secret = env.get('TURNSTILE_SECRET_KEY')

  // Modo STUB — Sprint 2-6.
  if (!secret) {
    return { success: true, mock: true }
  }

  // Modo REAL — Sprint 7+. Si no hay token con secret configurado, falla.
  if (!token) {
    return { success: false, errorCodes: ['missing-input-response'] }
  }

  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)
  if (remoteIp) body.set('remoteip', remoteIp)

  try {
    const res = await fetch(SITEVERIFY_URL, { method: 'POST', body })
    const data = (await res.json()) as { 'success': boolean; 'error-codes'?: string[] }

    return {
      success: Boolean(data.success),
      errorCodes: data['error-codes'] ?? [],
    }
  } catch {
    // Falla cerrado: si Cloudflare no respondió, no aceptamos el token.
    return { success: false, errorCodes: ['network_error'] }
  }
}
