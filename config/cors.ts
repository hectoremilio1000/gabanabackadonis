import { defineConfig } from '@adonisjs/cors'

/**
 * Sprint 7 — CORS estricto.
 *
 * En desarrollo (NODE_ENV=development) acepta cualquier origin (más rápido
 * para iterar). En producción lista blanca de dominios:
 *   - https://gabanarealstate.com.mx (público)
 *   - https://www.gabanarealstate.com.mx
 *   - https://admin.gabanarealstate.com.mx (admin)
 *
 * Variables de entorno opcionales para añadir dominios sin tocar código:
 *   CORS_ALLOWED_ORIGINS="https://otro.dominio,https://staging.example.com"
 */

const PRODUCTION_ALLOWED = [
  'https://gabanarealstate.com.mx',
  'https://www.gabanarealstate.com.mx',
  'https://admin.gabanarealstate.com.mx',
]

const isDev = process.env.NODE_ENV !== 'production'

const extra = (process.env.CORS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const allowed = [...PRODUCTION_ALLOWED, ...extra]

const corsConfig = defineConfig({
  enabled: true,
  origin: isDev ? true : allowed,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
