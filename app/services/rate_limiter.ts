/**
 * Sprint 2 — Rate limiter en memoria (sliding window por IP).
 *
 * Implementación mínima sin dependencias externas. Mantiene en memoria la
 * lista de timestamps por clave (IP) y permite consultar cuántos hits hubo
 * en la ventana actual.
 *
 * USO:
 *   const limiter = new InMemoryRateLimiter({ windowMs: 60_000, max: 5 })
 *   const result = limiter.hit(ip)
 *   if (!result.allowed) return response.tooManyRequests({ ... })
 *
 * LIMITACIONES:
 *   - No funciona entre múltiples instancias del backend (cada proceso tiene
 *     su propio Map). Sprint 7 (DevOps): si Railway escala a >1 instancia,
 *     migrar a Redis con `@adonisjs/limiter` o equivalente.
 *   - Memoria crece linealmente con cantidad de IPs únicas. Mitigación: GC
 *     pasivo borra entradas viejas en cada hit.
 */

export interface RateLimitOptions {
  /** Ventana de tiempo en milisegundos. Sprint 2 usa 60_000 (1 minuto). */
  windowMs: number
  /** Máximo de hits permitidos por clave dentro de la ventana. */
  max: number
}

export interface RateLimitResult {
  allowed: boolean
  /** Hits contabilizados en la ventana actual (incluye el hit recién registrado si allowed). */
  count: number
  /** Milisegundos hasta que se reabra la ventana (si allowed=false). */
  retryAfterMs: number
}

export class InMemoryRateLimiter {
  private store = new Map<string, number[]>()

  constructor(private options: RateLimitOptions) {}

  /**
   * Registra un hit para la clave. Devuelve `allowed: true` si está dentro
   * del límite, `false` si lo excedió. NO registra el hit cuando excede
   * (para que el atacante no extienda artificialmente la ventana).
   */
  hit(key: string): RateLimitResult {
    const now = Date.now()
    const cutoff = now - this.options.windowMs

    const timestamps = (this.store.get(key) ?? []).filter((t) => t > cutoff)

    if (timestamps.length >= this.options.max) {
      const oldest = timestamps[0]
      this.store.set(key, timestamps) // GC: limpiamos los expirados aunque rechacemos
      return {
        allowed: false,
        count: timestamps.length,
        retryAfterMs: oldest + this.options.windowMs - now,
      }
    }

    timestamps.push(now)
    this.store.set(key, timestamps)

    return { allowed: true, count: timestamps.length, retryAfterMs: 0 }
  }

  /** Útil en tests para resetear estado entre casos. */
  reset(key?: string) {
    if (key) this.store.delete(key)
    else this.store.clear()
  }

  /** Solo testing. Devuelve el conteo actual sin registrar hit. */
  peek(key: string): number {
    const cutoff = Date.now() - this.options.windowMs
    const timestamps = (this.store.get(key) ?? []).filter((t) => t > cutoff)
    return timestamps.length
  }
}

/**
 * Singleton para el endpoint público POST /api/leads.
 * Configuración: 5 leads / minuto / IP (SPRINT_PLAN.md Sprint 2 + REGLAS #8).
 */
export const leadsRateLimiter = new InMemoryRateLimiter({
  windowMs: 60_000,
  max: 5,
})
