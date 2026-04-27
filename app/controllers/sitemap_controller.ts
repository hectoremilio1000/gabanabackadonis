// app/controllers/sitemap_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import Listing from '#models/listing'
import User from '#models/user'

/**
 * Sprint 7 — Gap SEO: sitemap dinámico generado server-side.
 *
 * Devuelve XML con URLs de:
 *   - listings publicados (/venta/[slug] o /renta/[slug])
 *   - perfiles públicos de agentes (/agentes/[slug])
 *   - páginas estáticas clave (/, /buscar, /agentes, /precios, /contacto, /unete)
 *
 * `mexicosquared/next-sitemap.config.js` puede importarlo como source dinámico
 * vía `additionalSitemaps`.
 */
export default class SitemapController {
  async show({ response }: HttpContext) {
    const base = env.get('PUBLIC_SITE_BASE_URL') ?? 'https://gabanarealstate.com.mx'

    const listings = await Listing.query()
      .where('status', 'published')
      .select('slug', 'operation_type', 'updated_at')
      .limit(5000)

    const agents = await User.query()
      .where('role', 'publisher')
      .where('verification_status', 'approved')
      .whereNotNull('slug')
      .select('slug', 'updated_at')
      .limit(5000)

    const STATIC_PAGES = ['/', '/buscar', '/agentes', '/precios', '/contacto', '/unete']

    const xmlEntries: string[] = []

    for (const path of STATIC_PAGES) {
      xmlEntries.push(
        `<url><loc>${base}${path}</loc><changefreq>weekly</changefreq></url>`
      )
    }

    for (const l of listings) {
      const path = l.operationType === 'renta_larga' ? 'renta' : 'venta'
      const lastmod = l.updatedAt?.toISO() ?? new Date().toISOString()
      xmlEntries.push(
        `<url><loc>${base}/${path}/${l.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq></url>`
      )
    }

    for (const a of agents) {
      const lastmod = a.updatedAt?.toISO() ?? new Date().toISOString()
      xmlEntries.push(
        `<url><loc>${base}/agentes/${a.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq></url>`
      )
    }

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      xmlEntries.join('') +
      `</urlset>`

    response.header('Content-Type', 'application/xml; charset=utf-8')
    response.header('Cache-Control', 'public, max-age=3600')
    return response.send(xml)
  }
}
