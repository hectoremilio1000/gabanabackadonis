import { BaseSeeder } from '@adonisjs/lucid/seeders'
import SubscriptionPlan from '#models/subscription_plan'

/**
 * Sprint 1 — DECISIONES_NEGOCIO #5.
 * Free $0 (3 listings, 0 destacados), Pro $499 MXN (25, 1), Premium $1,499 MXN (100, 5).
 * Sin billing real hasta Sprint 5.
 */
export default class extends BaseSeeder {
  public async run() {
    const plans: Array<Partial<SubscriptionPlan>> = [
      {
        slug: 'free',
        name: 'Free',
        priceMxn: 0,
        listingsLimit: 3,
        featuredLimit: 0,
        hasAdvancedStats: false,
        hasPrioritySupport: false,
        badgeLabel: null,
      },
      {
        slug: 'pro',
        name: 'Pro',
        priceMxn: 499,
        listingsLimit: 25,
        featuredLimit: 1,
        hasAdvancedStats: false,
        hasPrioritySupport: false,
        badgeLabel: 'Pro',
      },
      {
        slug: 'premium',
        name: 'Premium',
        priceMxn: 1499,
        listingsLimit: 100,
        featuredLimit: 5,
        hasAdvancedStats: true,
        hasPrioritySupport: true,
        badgeLabel: 'Premium',
      },
    ]

    for (const p of plans) {
      await SubscriptionPlan.updateOrCreate({ slug: p.slug! }, p)
    }
  }
}
