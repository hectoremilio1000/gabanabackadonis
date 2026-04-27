// app/controllers/billing_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import vine from '@vinejs/vine'
import env from '#start/env'
import User from '#models/user'
import SubscriptionPlan from '#models/subscription_plan'
import {
  createCheckoutSession,
  createPortalSession,
  verifyWebhookSignature,
  stripeMode,
} from '#services/stripe_service'

const checkoutValidator = vine.compile(
  vine.object({
    plan_slug: vine.enum(['pro', 'premium']),
  })
)

/**
 * Sprint 5 — Stripe billing.
 *
 * Endpoints:
 *   POST /api/billing/checkout    — auth: agente. Crea sesión de checkout y devuelve URL.
 *   POST /api/billing/portal      — auth: agente. Abre portal de Stripe.
 *   POST /api/billing/webhook     — público (verifica firma). Procesa eventos.
 *   GET  /api/billing/me          — auth: agente. Devuelve plan + estado actual.
 */
export default class BillingController {
  /** GET /api/billing/me */
  async me({ auth, response }: HttpContext) {
    const me = await auth.authenticate()
    await me.load('subscriptionPlan')

    return response.ok({
      plan: me.subscriptionPlan
        ? {
            slug: me.subscriptionPlan.slug,
            name: me.subscriptionPlan.name,
            priceMxn: me.subscriptionPlan.priceMxn,
            listingsLimit: me.subscriptionPlan.listingsLimit,
            featuredLimit: me.subscriptionPlan.featuredLimit,
          }
        : null,
      stripe: {
        customerId: me.stripeCustomerId,
        subscriptionId: me.stripeSubscriptionId,
        status: me.subscriptionStatus,
        mode: stripeMode(),
      },
      trialEndsAt: me.trialEndsAt?.toISO() ?? null,
    })
  }

  /** POST /api/billing/checkout */
  async checkout({ auth, request, response }: HttpContext) {
    const me = await auth.authenticate()
    const { plan_slug } = await request.validateUsing(checkoutValidator)

    const plan = await SubscriptionPlan.query().where('slug', plan_slug).first()
    if (!plan) return response.notFound({ error: 'Plan no encontrado' })
    const priceId = plan.stripePriceId
    if (!priceId && stripeMode() === 'real') {
      return response.unprocessableEntity({
        error: 'Plan sin stripe_price_id. Configura los productos en Stripe primero.',
      })
    }

    const adminBaseUrl = env.get('ADMIN_BASE_URL') ?? 'http://localhost:5173'
    const session = await createCheckoutSession({
      customerEmail: me.email,
      priceId: priceId ?? `mock_price_${plan.slug}`,
      successUrl: `${adminBaseUrl}/billing/success`,
      cancelUrl: `${adminBaseUrl}/billing/cancel`,
      metadata: { user_id: String(me.id), plan_slug },
    })

    return response.ok({ url: session.url, mock: session.mock ?? false })
  }

  /** POST /api/billing/portal */
  async portal({ auth, response }: HttpContext) {
    const me = await auth.authenticate()
    const customerId = me.stripeCustomerId
    if (!customerId && stripeMode() === 'real') {
      return response.unprocessableEntity({
        error: 'No tienes suscripción activa todavía.',
      })
    }

    const adminBaseUrl = env.get('ADMIN_BASE_URL') ?? 'http://localhost:5173'
    const session = await createPortalSession({
      customerId: customerId ?? `mock_cus_${me.id}`,
      returnUrl: `${adminBaseUrl}/billing`,
    })

    return response.ok({ url: session.url, mock: session.mock ?? false })
  }

  /**
   * POST /api/billing/webhook
   *
   * Stripe envía eventos firmados. Reaccionamos a:
   *   - customer.subscription.created/updated → setear plan + status + period_end
   *   - customer.subscription.deleted        → pasar a Free
   *   - invoice.payment_succeeded            → confirmar pago
   *   - invoice.payment_failed               → marcar past_due (grace period 7d)
   */
  async webhook({ request, response }: HttpContext) {
    const rawBody = request.raw() ?? ''
    const sig = request.header('stripe-signature') ?? null

    const { valid, event } = await verifyWebhookSignature(String(rawBody), sig)
    if (!valid || !event) {
      return response.badRequest({ error: 'Invalid webhook signature' })
    }

    const e = event as { id: string; type: string; data: { object: Record<string, unknown> } }
    logger.info({ id: e.id, type: e.type }, '[billing] webhook received')

    try {
      await this.handleEvent(e)
    } catch (err) {
      logger.error({ err, eventId: e.id }, '[billing] webhook handler failed')
      // Devolvemos 200 igual para que Stripe no reintente — el log queda.
    }

    return response.ok({ received: true })
  }

  private async handleEvent(e: {
    id: string
    type: string
    data: { object: Record<string, unknown> }
  }) {
    switch (e.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = e.data.object as {
          id: string
          customer: string
          status: string
          current_period_end?: number
          items?: { data: Array<{ price: { id: string } }> }
        }
        const user = await User.query().where('stripe_customer_id', sub.customer).first()
        if (!user) {
          logger.warn({ customerId: sub.customer }, '[billing] user not found for customer')
          return
        }
        user.stripeSubscriptionId = sub.id
        user.subscriptionStatus = sub.status
        if (sub.current_period_end) {
          user.subscriptionCurrentPeriodEnd = DateTime.fromSeconds(sub.current_period_end)
        }
        const priceId = sub.items?.data?.[0]?.price?.id
        if (priceId) {
          const plan = await SubscriptionPlan.query()
            .where('stripe_price_id', priceId)
            .first()
          if (plan) user.subscriptionPlanId = plan.id
        }
        await user.save()
        break
      }
      case 'customer.subscription.deleted': {
        const sub = e.data.object as { customer: string }
        const user = await User.query().where('stripe_customer_id', sub.customer).first()
        if (!user) return
        const free = await SubscriptionPlan.query().where('slug', 'free').first()
        user.subscriptionPlanId = free?.id ?? null
        user.subscriptionStatus = 'canceled'
        await user.save()
        break
      }
      case 'invoice.payment_failed': {
        const inv = e.data.object as { customer: string }
        const user = await User.query().where('stripe_customer_id', inv.customer).first()
        if (!user) return
        user.subscriptionStatus = 'past_due'
        await user.save()
        break
      }
      case 'invoice.payment_succeeded': {
        const inv = e.data.object as { customer: string }
        const user = await User.query().where('stripe_customer_id', inv.customer).first()
        if (!user) return
        user.subscriptionStatus = 'active'
        await user.save()
        break
      }
      default:
        // Otros eventos los ignoramos por ahora.
        break
    }
  }
}
