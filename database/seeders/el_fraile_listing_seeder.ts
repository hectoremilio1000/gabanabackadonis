import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Listing from '#models/listing'
import ListingPhoto from '#models/listing_photo'
import User from '#models/user'

const slug = 'residencia-esquina-fraccionamiento-el-fraile'

const photoPaths = [
  '/propiedades/el-fraile/03-jardin-fachada-dia.jpeg',
  '/propiedades/el-fraile/12-fachada-dia.jpeg',
  '/propiedades/el-fraile/05-estancia-jardin.jpeg',
  '/propiedades/el-fraile/06-muro-madera.jpeg',
  '/propiedades/el-fraile/10-cocina-equipada.jpeg',
  '/propiedades/el-fraile/11-cocina-detalle.jpeg',
  '/propiedades/el-fraile/01-cocina-comedor.jpeg',
  '/propiedades/el-fraile/04-cocina-abierta.jpeg',
  '/propiedades/el-fraile/02-estancia-bano.jpeg',
  '/propiedades/el-fraile/09-bano-moderno.jpeg',
  '/propiedades/el-fraile/07-jardin-noche.jpeg',
  '/propiedades/el-fraile/08-jardin-noche-lateral.jpeg',
]

export default class ElFraileListingSeeder extends BaseSeeder {
  public async run() {
    const assetBaseUrl =
      process.env.GABANA_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://www.gabanarealstate.com.mx'

    const baseUrl = assetBaseUrl.replace(/\/$/, '')
    const photoUrls = photoPaths.map((path) => `${baseUrl}${path}`)
    const creator = await User.query().whereIn('role', ['superadmin', 'staff']).first()

    const listing = await Listing.updateOrCreate(
      { slug },
      {
        slug,
        title: 'Residencia en esquina dentro de fraccionamiento privado | El Fraile',
        summary:
          'Casa en esquina dentro de fraccionamiento privado con diseño moderno, jardín privado, cocina equipada y seguridad 24/7. Ideal para vivir o invertir en una zona con crecimiento y plusvalía.',
        address: 'Fraccionamiento El Fraile',
        zone: 'El Fraile',
        price: 5000000,
        priceLabel: 'MN 5,000,000',
        bedsLabel: '4 rec.',
        sizeLabel: '+300 m² const. · 200 m² terreno',
        sizeM2: 300,
        isPremier: true,
        // Sprint 1: el modelo Listing serializa arrays a JSON via prepare/consume.
        badges: ['Venta', 'Casa', 'Esquina', 'Fraccionamiento privado'],
        highlights: [
          'Terreno 200 m²',
          'Construcción +300 m²',
          '3 recámaras en planta alta',
          'Estudio o recámara en planta baja',
          '3 baños completos',
          'Jardín privado',
          'Cocina equipada',
          'Seguridad privada 24/7',
          'Calentador solar',
          'Sistema hidroneumático',
          'Cisterna 5,000 L',
          'Tinaco 1,500 L',
        ],
        lat: null,
        lng: null,
        status: 'published',
        createdBy: creator?.id ?? null,
        mediaCount: photoUrls.length,
        coverImageUrl: photoUrls[0],
      }
    )

    await ListingPhoto.query().where('listing_id', listing.id).delete()

    for (const [index, url] of photoUrls.entries()) {
      await ListingPhoto.create({
        listingId: listing.id,
        url,
        sortOrder: index + 1,
        isCover: index === 0,
      })
    }

    listing.mediaCount = photoUrls.length
    listing.coverImageUrl = photoUrls[0]
    await listing.save()
  }
}
