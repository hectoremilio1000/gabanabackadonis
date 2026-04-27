import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import Amenity from '#models/amenity'

/**
 * Sprint 1 — DoD: ≥20 amenidades en español MX.
 * Lee el catálogo desde `database/seeds/listings_seed.json` (mismo dataset
 * que produce los 30 listings, para garantizar consistencia).
 */
export default class extends BaseSeeder {
  public async run() {
    const here = dirname(fileURLToPath(import.meta.url))
    const seedPath = resolve(here, '../seeds/listings_seed.json')
    const raw = await readFile(seedPath, 'utf-8')
    const data = JSON.parse(raw) as {
      amenitiesCatalog: Array<{ slug: string; label: string; category: string }>
    }

    let order = 0
    for (const a of data.amenitiesCatalog) {
      order += 10
      await Amenity.updateOrCreate(
        { slug: a.slug },
        {
          slug: a.slug,
          label: a.label,
          category: a.category as Amenity['category'],
          displayOrder: order,
        }
      )
    }
  }
}
