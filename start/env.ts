/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),
  FTPS_HOST: Env.schema.string.optional(),
  FTPS_PORT: Env.schema.number.optional(),
  FTPS_USER: Env.schema.string.optional(),
  FTPS_PASS: Env.schema.string.optional(),
  FTPS_SECURE: Env.schema.string.optional(),
  MEDIA_BASE_URL: Env.schema.string.optional(),
  S3_ENDPOINT: Env.schema.string.optional(),
  S3_REGION: Env.schema.string.optional(),
  S3_BUCKET: Env.schema.string.optional(),
  S3_ACCESS_KEY_ID: Env.schema.string.optional(),
  S3_SECRET_ACCESS_KEY: Env.schema.string.optional(),
  S3_PUBLIC_BASE_URL: Env.schema.string.optional(),
  API_PUBLIC_BASE_URL: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Sprint 2 — Email transaccional (Resend) y Turnstile
  |----------------------------------------------------------
  | RESEND_API_KEY: bloqueante para que el email de "Nuevo lead" llegue al
  |   agente. Si falta, el lead se persiste pero el email se loggea como
  |   warning (PRECIOS_DE_FALLO en SPRINT_2_KICKOFF.md).
  | RESEND_FROM_EMAIL: from address. Default 'Gabana <noreply@gabanarealstate.com.mx>'.
  | SUPPORT_EMAIL: fallback si el listing no tiene agent_id. Default 'hola@gabanarealstate.com.mx'.
  | ADMIN_BASE_URL: usado para construir el link al lead en el email del agente.
  | PUBLIC_SITE_BASE_URL: usado para construir el link a la ficha en el email del agente.
  | TURNSTILE_SECRET_KEY: opcional Sprint 2-6 (stub mockeado en dev). Activable
  |   en Sprint 7 sin tocar código (decisión Hector 2026-04-26).
  */
  RESEND_API_KEY: Env.schema.string.optional(),
  RESEND_FROM_EMAIL: Env.schema.string.optional(),
  SUPPORT_EMAIL: Env.schema.string.optional(),
  ADMIN_BASE_URL: Env.schema.string.optional(),
  PUBLIC_SITE_BASE_URL: Env.schema.string.optional(),
  TURNSTILE_SECRET_KEY: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Sprint 5 — Stripe billing
  |----------------------------------------------------------
  | Vacíos en Sprint 5 dev → modo stub (createCheckoutSession devuelve mock).
  | Cuando Hector cree cuenta Stripe MX, productos Pro/Premium en Dashboard,
  | y configure webhook → pega los 3 valores y empieza a llamar a Stripe real.
  */
  STRIPE_SECRET_KEY: Env.schema.string.optional(),
  STRIPE_PUBLISHABLE_KEY: Env.schema.string.optional(),
  STRIPE_WEBHOOK_SECRET: Env.schema.string.optional(),

  /*
  |----------------------------------------------------------
  | Sprint 7 — DevOps / Observabilidad
  |----------------------------------------------------------
  | SENTRY_DSN: si está, errores se reportan a sentry.io.
  | CORS_ALLOWED_ORIGINS: dominios extra para CORS (CSV).
  */
  SENTRY_DSN: Env.schema.string.optional(),
  CORS_ALLOWED_ORIGINS: Env.schema.string.optional(),
})
