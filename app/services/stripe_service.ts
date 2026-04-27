import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

/**
 * Sprint 5 — Servicio Stripe (REST API directa, sin SDK).
 *
 * STUB: si no hay `STRIPE_SECRET_KEY`, todas las operaciones devuelven datos
 * simulados con prefijo `mock_`. Esto permite construir el flujo completo
 * (FE público + admin + webhooks) sin tener cuenta Stripe aún.
 *
 * Cuando Hector active la cuenta Stripe MX (1-3 días aprobación) y configure:
 *   - STRIPE_SECRET_KEY=sk_test_... (o sk_live_...)
 *   - STRIPE_PUBLISHABLE_KEY=pk_test_...
 *   - STRIPE_WEBHOOK_SECRET=whsec_...
 *   - Productos `Gabana Pro Mensual` ($499 MXN) y `Gabana Premium Mensual` ($1499 MXN)
 *   - Price IDs en seeder/UI admin (campo `subscription_plans.stripe_price_id`)
 *   - Webhook endpoint en Dashboard apuntando a https://api.../api/billing/webhook
 *
 * El servicio empieza a llamar a Stripe real sin tocar código.
 */

const STRIPE_API = 'https://api.stripe.com/v1'

export interface CreateCheckoutParams {
  customerEmail: string
  priceId: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

export interface CreatePortalParams {
  customerId: string
  returnUrl: string
}

export interface StripeSession {
  id: string
  url: string
  mock?: boolean
}

function isStubMode(): boolean {
  return !env.get('STRIPE_SECRET_KEY')
}

async function stripePost(
  path: string,
  body: Record<string, string>
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const key = env.get('STRIPE_SECRET_KEY')!
  const form = new URLSearchParams()
  Object.entries(body).forEach(([k, v]) => form.set(k, String(v)))

  const res = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}

/**
 * Crea una sesión de checkout (suscripción mensual).
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<StripeSession> {
  if (isStubMode()) {
    logger.info({ params }, '[stripe] STUB createCheckoutSession')
    return {
      id: `mock_cs_${Date.now()}`,
      url: `${params.successUrl}?session_id=mock_session&_stub=1`,
      mock: true,
    }
  }

  const body: Record<string, string> = {
    'mode': 'subscription',
    'customer_email': params.customerEmail,
    'line_items[0][price]': params.priceId,
    'line_items[0][quantity]': '1',
    'success_url': `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    'cancel_url': params.cancelUrl,
    'allow_promotion_codes': 'true',
    'payment_method_types[]': 'card',
    // OXXO Pay para MX (decisión #14):
    'payment_method_types[1]': 'oxxo',
  }
  if (params.metadata) {
    Object.entries(params.metadata).forEach(([k, v]) => {
      body[`metadata[${k}]`] = v
    })
  }

  const r = await stripePost('/checkout/sessions', body)
  if (!r.ok) {
    throw new Error(`Stripe checkout failed: ${r.status} ${JSON.stringify(r.data)}`)
  }
  const d = r.data as { id: string; url: string }
  return { id: d.id, url: d.url }
}

/**
 * Crea una sesión del Customer Portal de Stripe.
 */
export async function createPortalSession(
  params: CreatePortalParams
): Promise<StripeSession> {
  if (isStubMode()) {
    logger.info({ params }, '[stripe] STUB createPortalSession')
    return {
      id: `mock_ps_${Date.now()}`,
      url: `${params.returnUrl}?_stub_portal=1`,
      mock: true,
    }
  }

  const r = await stripePost('/billing_portal/sessions', {
    customer: params.customerId,
    return_url: params.returnUrl,
  })
  if (!r.ok) {
    throw new Error(`Stripe portal failed: ${r.status} ${JSON.stringify(r.data)}`)
  }
  const d = r.data as { id: string; url: string }
  return { id: d.id, url: d.url }
}

/**
 * Verifica la firma del webhook. Stripe firma cada evento con
 * STRIPE_WEBHOOK_SECRET; aquí hacemos verificación HMAC manual.
 *
 * En modo stub (sin secret), aceptamos cualquier payload (útil para test).
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<{ valid: boolean; event: unknown }> {
  if (isStubMode()) {
    try {
      return { valid: true, event: JSON.parse(rawBody) }
    } catch {
      return { valid: false, event: null }
    }
  }

  const secret = env.get('STRIPE_WEBHOOK_SECRET')
  if (!secret || !signatureHeader) {
    return { valid: false, event: null }
  }

  // Stripe-Signature: t=...,v1=...
  const parts = signatureHeader.split(',').reduce<Record<string, string>>(
    (acc, p) => {
      const [k, v] = p.split('=')
      if (k && v) acc[k] = v
      return acc
    },
    {}
  )
  const t = parts.t
  const v1 = parts.v1
  if (!t || !v1) return { valid: false, event: null }

  const crypto = await import('node:crypto')
  const signedPayload = `${t}.${rawBody}`
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')

  // Timing-safe compare
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(v1, 'hex')
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b)

  if (!valid) return { valid: false, event: null }

  try {
    return { valid: true, event: JSON.parse(rawBody) }
  } catch {
    return { valid: false, event: null }
  }
}

export const stripeMode = (): 'stub' | 'real' => (isStubMode() ? 'stub' : 'real')
