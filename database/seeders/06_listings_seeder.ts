import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { DateTime } from 'luxon'
import Listing from '#models/listing'
import ListingPhoto from '#models/listing_photo'
import User from '#models/user'

/**
 * Sprint 1 — DoD: 30 listings sembrados desde dataset ficticio.
 * Reemplazar con inventario real antes del soft launch.
 *
 * Las fotos se generan con picsum.photos seed determinístico
 * (per `_meta.imageProvider` del dataset). Reemplazables por upload real
 * de cada agente desde admin.
 */
type ListingSeed = {
  agentSlug: string
  slug: string
  title: string
  summary: string
  operationType: 'venta' | 'renta_larga'
  propertyType: string
  price: number
  priceLabel: string
  beds: number | null
  baths: number | null
  parking: number | null
  m2Built: number | null
  m2Land: number | null
  age: number | null
  amenities: string[]
  address: string
  colony: string
  municipality: string
  state: string
  zone: string
  lat: number
  lng: number
  videoUrl: string | null
  virtualTourUrl: string | null
  status: 'draft' | 'published' | 'archived'
  isPremier: boolean
  isFeatured: boolean
  badges: string[]
  highlights: string[]
  photoCount: number
  publishedAt: string
}

function buildPhotoUrls(slug: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => `https://picsum.photos/seed/${slug}-${i + 1}/1200/900`
  )
}

export default class extends BaseSeeder {
  public async run() {
    const here = dirname(fileURLToPath(import.meta.url))
    const seedPath = resolve(here, '../seeds/listings_seed.json')
    const raw = await readFile(seedPath, 'utf-8')
    const data = JSON.parse(raw) as { listings: ListingSeed[] }

    // Cache de agentes por slug
    const agents = await User.query().where('role', 'publisher').whereNotNull('slug')
    const agentBySlug = new Map(agents.map((u) => [u.slug as string, u.id]))

    for (const s of data.listings) {
      const agentId = agentBySlug.get(s.agentSlug) ?? null
      const photoUrls = buildPhotoUrls(s.slug, s.photoCount)

      const listing = await Listing.updateOrCreate(
        { slug: s.slug },
        {
          slug: s.slug,
          title: s.title,
          summary: s.summary,
          operationType: s.operationType,
          propertyType: s.propertyType as Listing['propertyType'],
          price: s.price,
          priceLabel: s.priceLabel,
          beds: s.beds,
          baths: s.baths,
          parking: s.parking,
          m2Built: s.m2Built,
          m2Land: s.m2Land,
          age: s.age,
          amenities: s.amenities,
          address: s.address,
          zone: s.zone,
          colony: s.colony,
          municipality: s.municipality,
          state: s.state,
          lat: s.lat,
          lng: s.lng,
          videoUrl: s.videoUrl,
          virtualTourUrl: s.virtualTourUrl,
          status: s.status,
          isPremier: s.isPremier,
          isFeatured: s.isFeatured,
          badges: s.badges,
          highlights: s.highlights,
          mediaCount: s.photoCount,
          coverImageUrl: photoUrls[0] ?? null,
          publishedAt: DateTime.fromISO(s.publishedAt),
          viewCount: 0,
          agentId,
          createdBy: agentId,
          // bedsLabel / sizeLabel: derivados para compat con admin pre-Sprint 1
          bedsLabel: s.beds ? `${s.beds} rec.` : null,
          sizeLabel: s.m2Built
            ? `${s.m2Built} m² const.${s.m2Land ? ` · ${s.m2Land} m² terreno` : ''}`
            : s.m2Land
              ? `${s.m2Land} m² terreno`
              : null,
          sizeM2: s.m2Built ? Math.round(Number(s.m2Built)) : null,
        }
      )

      // Refrescar fotos (idempotente).
      await ListingPhoto.query().where('listing_id', listing.id).delete()
      for (const [i, photoUrl] of photoUrls.entries()) {
        await ListingPhoto.create({
          listingId: listing.id,
          url: photoUrl,
          sortOrder: i + 1,
          isCover: i === 0,
        })
      }
    }
  }
}
