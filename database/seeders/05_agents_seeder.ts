import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { DateTime } from 'luxon'
import User from '#models/user'
import SubscriptionPlan from '#models/subscription_plan'

/**
 * Sprint 1 — DoD: 6 agentes ficticios para el dataset.
 * Reemplazar con cuentas reales antes del soft launch (PENDIENTES_OPERATIVOS #5).
 *
 * Password de los 6: `Temporal2026!` (texto plano; el hook beforeSave del
 * modelo User lo hashea con scrypt).
 */
type AgentSeed = {
  slug: string
  fullName: string
  email: string
  phonePublic: string
  whatsapp: string
  bio: string
  photoUrl: string
  verificationStatus: 'pending' | 'approved' | 'rejected'
  verifiedAt: string
  subscriptionPlan: 'free' | 'pro' | 'premium'
}

export default class extends BaseSeeder {
  public async run() {
    const here = dirname(fileURLToPath(import.meta.url))
    const seedPath = resolve(here, '../seeds/listings_seed.json')
    const raw = await readFile(seedPath, 'utf-8')
    const data = JSON.parse(raw) as { agents: AgentSeed[] }

    // Cache de planes por slug para no hacer lookup en cada iter.
    const plans = await SubscriptionPlan.all()
    const planBySlug = new Map(plans.map((p) => [p.slug, p.id]))

    for (const a of data.agents) {
      const planId = planBySlug.get(a.subscriptionPlan) ?? null

      await User.updateOrCreate(
        { email: a.email.trim().toLowerCase() },
        {
          fullName: a.fullName,
          email: a.email.trim().toLowerCase(),
          // Texto plano — el modelo lo hashea via @beforeSave de AuthFinder.
          password: 'Temporal2026!',
          role: 'publisher',
          slug: a.slug,
          phonePublic: a.phonePublic,
          whatsapp: a.whatsapp,
          bio: a.bio,
          photoUrl: a.photoUrl,
          verificationStatus: a.verificationStatus,
          verifiedAt: DateTime.fromISO(a.verifiedAt),
          subscriptionPlanId: planId,
          // Trial Pro 30 días al alta (DECISIONES_NEGOCIO #5). Para el dataset
          // usamos +30d desde la fecha de verificación, salvo Free.
          trialEndsAt:
            a.subscriptionPlan === 'free'
              ? null
              : DateTime.fromISO(a.verifiedAt).plus({ days: 30 }),
        }
      )
    }
  }
}
