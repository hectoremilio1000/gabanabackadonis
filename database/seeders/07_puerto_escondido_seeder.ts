import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Listing from '#models/listing'
import ListingPhoto from '#models/listing_photo'
import User from '#models/user'

/**
 * Demo Oaxaca completo — Puerto Escondido (12 propiedades + 6 lotes) +
 * Oaxaca capital (8 propiedades). Coordenadas reales, fotos Unsplash.
 *
 * Idempotente vía `Listing.updateOrCreate({ slug })`. Se puede correr
 * múltiples veces sin duplicar. Asigna el primer publisher disponible
 * como agente.
 *
 * Coordenadas:
 *   Puerto Escondido — centro: 15.8720, -97.0767
 *   Oaxaca capital  — centro: 17.0732, -96.7266
 */

// Pool de fotos Unsplash (IDs de fotos reales y estables — todas free use).
// Rotamos por slug para que cada listing tenga set distinto pero determinístico.
const PHOTO_POOL_HOUSE = [
  '1564013799919-ab600027ffc6', // casa moderna con alberca
  '1568605114967-8130f3a36994', // casa de playa
  '1613977257363-707ba9348227', // interior moderno
  '1600596542815-ffad4c1539a9', // casa minimalista
  '1605276374104-dee2a0ed3cd6', // casa colonial
  '1512917774080-9991f1c4c750', // mansion
  '1583608205776-bfd35f0d9f83', // casa con jardin
  '1502672260266-1c1ef2d93688', // sala interior
  '1600585154340-be6161a56a0c', // cocina moderna
  '1600210492486-724fe5c67fb0', // recamara principal
  '1597218868981-1b68e15f0065', // baño moderno
  '1600210492493-0946911123ea', // terraza
]

const PHOTO_POOL_BEACH = [
  '1506905925346-21bda4d32df4', // casa playa palmeras
  '1519046904884-53103b34b206', // playa palmeras
  '1507525428034-b723cf961d3e', // playa mexico
  '1523217582562-09d0def993a6', // vista mar
  '1540541338287-41700207dee6', // surfista zicatela
  '1519834785169-98be25ec3f84', // alberca infinity playa
  '1572177812156-58036aae439c', // resort playa
  '1571003123894-1f0594d2b5d9', // costa pacifico
]

const PHOTO_POOL_LAND = [
  '1502920917128-1aa500764cbd', // terreno verde
  '1469474968028-56623f02e42e', // paisaje natural
  '1500382017468-9049fed747ef', // colina
  '1559131397-f94da358f7ca', // lote naturaleza
  '1542362567-b07e54358753', // lote
  '1437209484568-e63b90a34f8b', // valle
]

const PHOTO_POOL_OAXACA_CITY = [
  '1512136824195-f44ec7c70d52', // catedral oaxaca
  '1568839049006-1edaa9e2f306', // centro historico
  '1583779451027-a23c66ee8775', // calle colonial
  '1565008447742-97f6f38c985c', // casa colonial mexicana
  '1582719188393-bb71ca45dbb9', // patio andaluz
  '1600566753190-17f0baa2a6c3', // arquitectura mexicana
  '1564540583246-934409427776', // calle empedrada
  '1571939228382-b2f2b585ce15', // mercado oaxaca
]

function pickFromPool(pool: string[], slug: string, idx: number): string {
  // Hash simple del slug + idx para escoger determinístico del pool
  let h = 0
  const str = `${slug}-${idx}`
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return pool[Math.abs(h) % pool.length]!
}

interface DemoListing {
  slug: string
  title: string
  summary: string
  operationType: 'venta' | 'renta_larga'
  propertyType:
    | 'casa'
    | 'departamento'
    | 'terreno'
    | 'local_comercial'
    | 'oficina'
    | 'nave_industrial'
    | 'bodega'
    | 'edificio'
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
  zone: string
  colony: string
  municipality: string
  state: string
  lat: number
  lng: number
  isFeatured: boolean
  badges: string[]
  highlights: string[]
  photoCount: number
}

const PUERTO_ESCONDIDO: DemoListing[] = [
  // ── Propiedades en venta (8) ──
  {
    slug: 'casa-vista-mar-rinconada-puerto-escondido',
    title: 'Casa con vista al mar en La Rinconada',
    summary:
      'Casa de 3 recámaras a 5 minutos de Playa Carrizalillo. Terraza con jardín privado y alberca infinity. Vista 180° al océano Pacífico.',
    operationType: 'venta',
    propertyType: 'casa',
    price: 8500000,
    priceLabel: 'MN 8,500,000',
    beds: 3, baths: 3, parking: 2,
    m2Built: 280, m2Land: 420, age: 4,
    amenities: ['alberca', 'jardin', 'terraza', 'vista_mar', 'estacionamiento', 'seguridad_24h'],
    address: 'Calle del Atardecer 14, La Rinconada',
    zone: 'La Rinconada',
    colony: 'La Rinconada',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8635, lng: -97.0915,
    isFeatured: true,
    badges: ['Venta', 'Casa', 'Vista al mar'],
    highlights: ['Vista 180° al Pacífico', 'Alberca infinity', 'A 5 min de Carrizalillo'],
    photoCount: 14,
  },
  {
    slug: 'depto-zicatela-frente-playa',
    title: 'Departamento frente a Playa Zicatela',
    summary:
      'Departamento de 2 recámaras a pie de playa. Edificio con alberca común y rooftop. Ideal segunda residencia o renta vacacional.',
    operationType: 'venta',
    propertyType: 'departamento',
    price: 5200000,
    priceLabel: 'MN 5,200,000',
    beds: 2, baths: 2, parking: 1,
    m2Built: 120, m2Land: null, age: 2,
    amenities: ['alberca', 'rooftop', 'gimnasio', 'estacionamiento', 'frente_playa'],
    address: 'Av. Morro 42, Zicatela',
    zone: 'Zicatela',
    colony: 'Zicatela',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8543, lng: -97.0508,
    isFeatured: true,
    badges: ['Venta', 'Departamento', 'Frente a playa'],
    highlights: ['Pie de playa', 'Rooftop con jacuzzi', 'Renta vacacional confirmada'],
    photoCount: 12,
  },
  {
    slug: 'casa-bacocho-3-recamaras-alberca',
    title: 'Residencia en Bacocho con alberca',
    summary:
      'Casa de 3 recámaras en privada cerrada de Bacocho. Alberca, jardín tropical y a 8 min en auto del centro. Buena para vivir todo el año.',
    operationType: 'venta',
    propertyType: 'casa',
    price: 6750000,
    priceLabel: 'MN 6,750,000',
    beds: 3, baths: 3, parking: 2,
    m2Built: 245, m2Land: 380, age: 6,
    amenities: ['alberca', 'jardin', 'estacionamiento', 'seguridad_24h', 'privada'],
    address: 'Privada de las Buganvilias 8, Bacocho',
    zone: 'Bacocho',
    colony: 'Bacocho',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8743, lng: -97.0958,
    isFeatured: false,
    badges: ['Venta', 'Casa', 'Privada'],
    highlights: ['Privada cerrada con seguridad', 'Alberca y jardín tropical'],
    photoCount: 11,
  },
  {
    slug: 'penthouse-rinconada-vista-panoramica',
    title: 'Penthouse en La Rinconada con vista panorámica',
    summary:
      'Penthouse de 200 m² con terraza privada y jacuzzi. Vista panorámica al Pacífico. Edificio nuevo con amenidades premium.',
    operationType: 'venta',
    propertyType: 'departamento',
    price: 11500000,
    priceLabel: 'MN 11,500,000',
    beds: 3, baths: 3, parking: 2,
    m2Built: 200, m2Land: null, age: 1,
    amenities: ['alberca', 'gimnasio', 'jacuzzi', 'rooftop', 'estacionamiento', 'vista_mar'],
    address: 'Calle Ventarrón 5 PH, La Rinconada',
    zone: 'La Rinconada',
    colony: 'La Rinconada',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8612, lng: -97.0869,
    isFeatured: true,
    badges: ['Venta', 'Penthouse', 'Premium'],
    highlights: ['Penthouse último piso', 'Jacuzzi privado', 'Vista panorámica'],
    photoCount: 16,
  },
  {
    slug: 'casa-carrizalillo-3-niveles',
    title: 'Casa en Carrizalillo de 3 niveles',
    summary:
      'Casa moderna de 3 niveles a 7 min caminando de Playa Carrizalillo. 4 recámaras, terrazas en cada nivel y cochera para 2 autos.',
    operationType: 'venta',
    propertyType: 'casa',
    price: 9200000,
    priceLabel: 'MN 9,200,000',
    beds: 4, baths: 4, parking: 2,
    m2Built: 320, m2Land: 200, age: 3,
    amenities: ['terraza', 'estacionamiento', 'jardin', 'vista_mar'],
    address: 'Av. Carrizalillo 23',
    zone: 'Carrizalillo',
    colony: 'Carrizalillo',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8587, lng: -97.0782,
    isFeatured: false,
    badges: ['Venta', 'Casa', '3 niveles'],
    highlights: ['3 niveles', '7 min caminando a la playa', 'Terrazas con vista'],
    photoCount: 10,
  },
  {
    slug: 'casa-puerto-angelito-cerca-playa',
    title: 'Casa en Puerto Angelito cerca de la playa',
    summary:
      'Casa de 2 recámaras a 4 min caminando de Playa Manzanillo. Patio interior con árbol, perfecta para vivir o invertir en renta corta.',
    operationType: 'venta',
    propertyType: 'casa',
    price: 4800000,
    priceLabel: 'MN 4,800,000',
    beds: 2, baths: 2, parking: 1,
    m2Built: 145, m2Land: 220, age: 8,
    amenities: ['jardin', 'estacionamiento', 'cerca_playa'],
    address: 'Calle Brisas Marinas 11, Puerto Angelito',
    zone: 'Puerto Angelito',
    colony: 'Puerto Angelito',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8688, lng: -97.0691,
    isFeatured: false,
    badges: ['Venta', 'Casa', 'Cerca de playa'],
    highlights: ['4 min caminando a Playa Manzanillo', 'Patio interior'],
    photoCount: 9,
  },
  {
    slug: 'depto-bacocho-2-recamaras-amueblado',
    title: 'Departamento amueblado en Bacocho',
    summary:
      'Departamento de 2 recámaras totalmente amueblado. Edificio con alberca y a 6 min de la marina. Listo para entrar a vivir o rentar.',
    operationType: 'venta',
    propertyType: 'departamento',
    price: 3650000,
    priceLabel: 'MN 3,650,000',
    beds: 2, baths: 2, parking: 1,
    m2Built: 95, m2Land: null, age: 5,
    amenities: ['alberca', 'estacionamiento', 'amueblado'],
    address: 'Av. Bacocho 88, Bacocho',
    zone: 'Bacocho',
    colony: 'Bacocho',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8762, lng: -97.0993,
    isFeatured: false,
    badges: ['Venta', 'Departamento', 'Amueblado'],
    highlights: ['Amueblado completo', 'Alberca común'],
    photoCount: 8,
  },
  {
    slug: 'casa-brisas-zicatela-vista-laguna',
    title: 'Casa en Brisas Zicatela con vista a la laguna',
    summary:
      'Casa de 3 recámaras en zona tranquila de Brisas Zicatela. Vista a la laguna y reserva natural. Ideal para nómadas digitales.',
    operationType: 'venta',
    propertyType: 'casa',
    price: 5950000,
    priceLabel: 'MN 5,950,000',
    beds: 3, baths: 2, parking: 1,
    m2Built: 180, m2Land: 320, age: 7,
    amenities: ['jardin', 'estacionamiento', 'vista_laguna'],
    address: 'Calle Iguanas 7, Brisas de Zicatela',
    zone: 'Brisas de Zicatela',
    colony: 'Brisas de Zicatela',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8462, lng: -97.0421,
    isFeatured: false,
    badges: ['Venta', 'Casa', 'Vista a laguna'],
    highlights: ['Vista a laguna', 'Zona tranquila', 'WiFi fibra óptica'],
    photoCount: 11,
  },

  // ── Renta larga (4) ──
  {
    slug: 'depto-renta-larga-zicatela-vista-mar',
    title: 'Departamento en renta larga Zicatela vista mar',
    summary:
      'Departamento de 1 recámara en renta anual. Vista al mar, rooftop común y a 3 min de la playa. Servicios incluidos.',
    operationType: 'renta_larga',
    propertyType: 'departamento',
    price: 18000,
    priceLabel: 'MN 18,000/mes',
    beds: 1, baths: 1, parking: 1,
    m2Built: 65, m2Land: null, age: 3,
    amenities: ['alberca', 'rooftop', 'estacionamiento', 'vista_mar', 'wifi'],
    address: 'Av. Morro 88-3, Zicatela',
    zone: 'Zicatela',
    colony: 'Zicatela',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8521, lng: -97.0489,
    isFeatured: true,
    badges: ['Renta larga', 'Departamento', 'Vista mar'],
    highlights: ['Vista mar desde la cama', 'Rooftop común', 'Servicios incluidos'],
    photoCount: 10,
  },
  {
    slug: 'casa-renta-larga-rinconada-2-recamaras',
    title: 'Casa en renta larga La Rinconada',
    summary:
      'Casa de 2 recámaras en La Rinconada. Patio con jardín y BBQ. Contrato de 12 meses con depósito.',
    operationType: 'renta_larga',
    propertyType: 'casa',
    price: 28000,
    priceLabel: 'MN 28,000/mes',
    beds: 2, baths: 2, parking: 1,
    m2Built: 140, m2Land: 220, age: 5,
    amenities: ['jardin', 'estacionamiento', 'bbq'],
    address: 'Calle Sol Naciente 22, La Rinconada',
    zone: 'La Rinconada',
    colony: 'La Rinconada',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8669, lng: -97.0884,
    isFeatured: false,
    badges: ['Renta larga', 'Casa'],
    highlights: ['Jardín con BBQ', 'Contrato 12 meses'],
    photoCount: 9,
  },
  {
    slug: 'estudio-renta-bacocho-frente-marina',
    title: 'Estudio en renta frente a la marina',
    summary:
      'Estudio amueblado de 50 m² frente a la marina de Puerto Escondido. Wifi fibra óptica y aire acondicionado.',
    operationType: 'renta_larga',
    propertyType: 'departamento',
    price: 12500,
    priceLabel: 'MN 12,500/mes',
    beds: 1, baths: 1, parking: 0,
    m2Built: 50, m2Land: null, age: 2,
    amenities: ['amueblado', 'aire_acondicionado', 'wifi'],
    address: 'Marina 4-A, Bacocho',
    zone: 'Bacocho',
    colony: 'Bacocho',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8801, lng: -97.1015,
    isFeatured: false,
    badges: ['Renta larga', 'Estudio', 'Amueblado'],
    highlights: ['Frente a marina', 'Wifi fibra óptica'],
    photoCount: 7,
  },
  {
    slug: 'casa-renta-puerto-angelito-3-recamaras',
    title: 'Casa familiar en renta Puerto Angelito',
    summary:
      'Casa de 3 recámaras en renta familiar. Patio amplio para mascotas, cochera para 2 autos y a 5 min de Playa Manzanillo.',
    operationType: 'renta_larga',
    propertyType: 'casa',
    price: 32000,
    priceLabel: 'MN 32,000/mes',
    beds: 3, baths: 2, parking: 2,
    m2Built: 200, m2Land: 320, age: 9,
    amenities: ['jardin', 'estacionamiento', 'mascotas_ok'],
    address: 'Calle Iguanas 14, Puerto Angelito',
    zone: 'Puerto Angelito',
    colony: 'Puerto Angelito',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8702, lng: -97.0716,
    isFeatured: false,
    badges: ['Renta larga', 'Casa', 'Mascotas OK'],
    highlights: ['Patio amplio', 'Mascotas bienvenidas'],
    photoCount: 8,
  },

  // ── Lotes / terrenos en venta (6) ──
  {
    slug: 'lote-rinconada-vista-mar-500m2',
    title: 'Lote con vista al mar 500 m² en La Rinconada',
    summary:
      'Lote en privada de La Rinconada con vista 180° al océano. Servicios disponibles. Listo para construir tu casa de playa.',
    operationType: 'venta',
    propertyType: 'terreno',
    price: 3200000,
    priceLabel: 'MN 3,200,000',
    beds: null, baths: null, parking: null,
    m2Built: null, m2Land: 500, age: null,
    amenities: ['vista_mar', 'servicios', 'privada'],
    address: 'Lote 12 Privada del Mar, La Rinconada',
    zone: 'La Rinconada',
    colony: 'La Rinconada',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8650, lng: -97.0902,
    isFeatured: true,
    badges: ['Venta', 'Lote', 'Vista mar'],
    highlights: ['500 m² con vista mar', 'Servicios disponibles', 'Privada'],
    photoCount: 6,
  },
  {
    slug: 'lote-zicatela-800m2-cerca-playa',
    title: 'Lote 800 m² cerca de Playa Zicatela',
    summary:
      'Lote regular de 800 m² a 6 min caminando de Playa Zicatela. Esquina con dos frentes, ideal para desarrollo.',
    operationType: 'venta',
    propertyType: 'terreno',
    price: 4400000,
    priceLabel: 'MN 4,400,000',
    beds: null, baths: null, parking: null,
    m2Built: null, m2Land: 800, age: null,
    amenities: ['servicios', 'esquina'],
    address: 'Calle Olas Altas s/n, Zicatela',
    zone: 'Zicatela',
    colony: 'Zicatela',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8559, lng: -97.0521,
    isFeatured: false,
    badges: ['Venta', 'Lote', 'Esquina'],
    highlights: ['Esquina dos frentes', 'Apto desarrollo'],
    photoCount: 5,
  },
  {
    slug: 'lote-bacocho-1200m2-residencial',
    title: 'Lote residencial 1,200 m² en Bacocho',
    summary:
      'Lote en zona residencial de Bacocho. Adecuado para construir residencia familiar con alberca y jardín.',
    operationType: 'venta',
    propertyType: 'terreno',
    price: 6800000,
    priceLabel: 'MN 6,800,000',
    beds: null, baths: null, parking: null,
    m2Built: null, m2Land: 1200, age: null,
    amenities: ['servicios', 'residencial'],
    address: 'Calle Bahía 19, Bacocho',
    zone: 'Bacocho',
    colony: 'Bacocho',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8784, lng: -97.0972,
    isFeatured: false,
    badges: ['Venta', 'Lote', 'Residencial'],
    highlights: ['1,200 m²', 'Zona residencial'],
    photoCount: 5,
  },
  {
    slug: 'lote-brisas-zicatela-300m2',
    title: 'Lote económico 300 m² en Brisas de Zicatela',
    summary:
      'Lote pequeño y accesible en Brisas de Zicatela. Servicios al pie del lote. Excelente entrada al mercado de Puerto Escondido.',
    operationType: 'venta',
    propertyType: 'terreno',
    price: 1450000,
    priceLabel: 'MN 1,450,000',
    beds: null, baths: null, parking: null,
    m2Built: null, m2Land: 300, age: null,
    amenities: ['servicios'],
    address: 'Lote 7 Calle Iguanas, Brisas de Zicatela',
    zone: 'Brisas de Zicatela',
    colony: 'Brisas de Zicatela',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8438, lng: -97.0392,
    isFeatured: false,
    badges: ['Venta', 'Lote', 'Económico'],
    highlights: ['Acceso al mercado de Puerto', 'Servicios al pie'],
    photoCount: 4,
  },
  {
    slug: 'lote-vista-puerto-angelito-450m2',
    title: 'Lote con vista 450 m² en Puerto Angelito',
    summary:
      'Lote en cerro de Puerto Angelito con vista parcial al mar. Servicios disponibles. Ideal para casa con terraza panorámica.',
    operationType: 'venta',
    propertyType: 'terreno',
    price: 2750000,
    priceLabel: 'MN 2,750,000',
    beds: null, baths: null, parking: null,
    m2Built: null, m2Land: 450, age: null,
    amenities: ['vista_mar', 'servicios'],
    address: 'Lote 4 Cerro Angelito, Puerto Angelito',
    zone: 'Puerto Angelito',
    colony: 'Puerto Angelito',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8721, lng: -97.0738,
    isFeatured: false,
    badges: ['Venta', 'Lote', 'Vista mar'],
    highlights: ['Vista parcial al mar', 'En cerro'],
    photoCount: 5,
  },
  {
    slug: 'lote-grande-rinconada-2000m2-desarrollo',
    title: 'Lote grande 2,000 m² para desarrollo en La Rinconada',
    summary:
      'Lote grande de 2,000 m² apto para desarrollo de villas o boutique hotel. Vista al mar y privacidad. Documentos en regla.',
    operationType: 'venta',
    propertyType: 'terreno',
    price: 14500000,
    priceLabel: 'MN 14,500,000',
    beds: null, baths: null, parking: null,
    m2Built: null, m2Land: 2000, age: null,
    amenities: ['vista_mar', 'servicios', 'desarrollo'],
    address: 'Lote desarrollo Calle del Atardecer s/n, La Rinconada',
    zone: 'La Rinconada',
    colony: 'La Rinconada',
    municipality: 'San Pedro Mixtepec',
    state: 'Oaxaca',
    lat: 15.8595, lng: -97.0843,
    isFeatured: true,
    badges: ['Venta', 'Lote', 'Desarrollo'],
    highlights: ['Apto villas o hotel boutique', '2,000 m²', 'Vista mar'],
    photoCount: 8,
  },
]

// ── Oaxaca capital (8 listings) ──────────────────────────────────────────
const OAXACA_CAPITAL: DemoListing[] = [
  {
    slug: 'casa-colonial-centro-historico-oaxaca',
    title: 'Casa colonial en Centro Histórico de Oaxaca',
    summary:
      'Casa restaurada de 1890 a 4 cuadras del Zócalo. Patio central andaluz, 4 recámaras, biblioteca y terraza con vista a Santo Domingo.',
    operationType: 'venta',
    propertyType: 'casa',
    price: 12500000,
    priceLabel: 'MN 12,500,000',
    beds: 4, baths: 4, parking: 2,
    m2Built: 380, m2Land: 320, age: 134,
    amenities: ['patio_central', 'jardin', 'estacionamiento', 'biblioteca', 'terraza'],
    address: 'Calle Constitución 12, Centro Histórico',
    zone: 'Centro Histórico',
    colony: 'Centro',
    municipality: 'Oaxaca de Juárez',
    state: 'Oaxaca',
    lat: 17.0654, lng: -96.7234,
    isFeatured: true,
    badges: ['Venta', 'Casa colonial', 'Patrimonio'],
    highlights: ['Vista a Santo Domingo', 'Patio andaluz', 'Casa de 1890 restaurada'],
    photoCount: 14,
  },
  {
    slug: 'casa-san-felipe-del-agua-residencia',
    title: 'Residencia en San Felipe del Agua',
    summary:
      'Casa moderna de 4 recámaras en San Felipe del Agua. Vista al valle de Oaxaca, alberca y jardín con árboles frutales.',
    operationType: 'venta',
    propertyType: 'casa',
    price: 9800000,
    priceLabel: 'MN 9,800,000',
    beds: 4, baths: 4, parking: 3,
    m2Built: 420, m2Land: 850, age: 8,
    amenities: ['alberca', 'jardin', 'estacionamiento', 'vista_valle', 'seguridad_24h'],
    address: 'Camino al Cerro 18, San Felipe del Agua',
    zone: 'San Felipe del Agua',
    colony: 'San Felipe del Agua',
    municipality: 'Oaxaca de Juárez',
    state: 'Oaxaca',
    lat: 17.1115, lng: -96.7203,
    isFeatured: true,
    badges: ['Venta', 'Casa', 'Vista valle'],
    highlights: ['Vista al valle de Oaxaca', 'Alberca + jardín', 'Zona residencial'],
    photoCount: 12,
  },
  {
    slug: 'depto-reforma-2-recamaras-oaxaca',
    title: 'Departamento moderno en Colonia Reforma',
    summary:
      'Departamento nuevo de 2 recámaras en Reforma. Edificio con elevador, gimnasio común y rooftop. A 10 min del centro.',
    operationType: 'venta',
    propertyType: 'departamento',
    price: 3950000,
    priceLabel: 'MN 3,950,000',
    beds: 2, baths: 2, parking: 1,
    m2Built: 95, m2Land: null, age: 1,
    amenities: ['gimnasio', 'rooftop', 'elevador', 'estacionamiento'],
    address: 'Av. Reforma 1502, Col. Reforma',
    zone: 'Reforma',
    colony: 'Reforma',
    municipality: 'Oaxaca de Juárez',
    state: 'Oaxaca',
    lat: 17.0823, lng: -96.7195,
    isFeatured: false,
    badges: ['Venta', 'Departamento', 'Nuevo'],
    highlights: ['Edificio nuevo', 'Rooftop con vista', '10 min al Centro'],
    photoCount: 10,
  },
  {
    slug: 'casa-renta-trinidad-de-las-huertas',
    title: 'Casa en renta Trinidad de las Huertas',
    summary:
      'Casa de 3 recámaras en zona tranquila. Patio interior con bugambilias y a 12 min del centro. Mascotas bienvenidas.',
    operationType: 'renta_larga',
    propertyType: 'casa',
    price: 22000,
    priceLabel: 'MN 22,000/mes',
    beds: 3, baths: 2, parking: 2,
    m2Built: 200, m2Land: 280, age: 12,
    amenities: ['jardin', 'estacionamiento', 'mascotas_ok'],
    address: 'Calle Hidalgo 33, Trinidad de las Huertas',
    zone: 'Trinidad de las Huertas',
    colony: 'Trinidad de las Huertas',
    municipality: 'Oaxaca de Juárez',
    state: 'Oaxaca',
    lat: 17.0541, lng: -96.7325,
    isFeatured: false,
    badges: ['Renta larga', 'Casa', 'Mascotas OK'],
    highlights: ['Mascotas bienvenidas', 'Patio interior', '12 min al Centro'],
    photoCount: 9,
  },
  {
    slug: 'depto-jalatlaco-1-recamara-amueblado',
    title: 'Departamento amueblado en Barrio de Jalatlaco',
    summary:
      'Estudio amueblado en uno de los barrios más bellos de Oaxaca. Calles empedradas, cafeterías y a 8 min caminando del Zócalo.',
    operationType: 'renta_larga',
    propertyType: 'departamento',
    price: 14500,
    priceLabel: 'MN 14,500/mes',
    beds: 1, baths: 1, parking: 0,
    m2Built: 55, m2Land: null, age: 3,
    amenities: ['amueblado', 'wifi'],
    address: 'Calle Aldama 8-2, Jalatlaco',
    zone: 'Jalatlaco',
    colony: 'Jalatlaco',
    municipality: 'Oaxaca de Juárez',
    state: 'Oaxaca',
    lat: 17.0688, lng: -96.7158,
    isFeatured: false,
    badges: ['Renta larga', 'Estudio', 'Amueblado'],
    highlights: ['Barrio histórico', 'Caminando al Zócalo'],
    photoCount: 8,
  },
  {
    slug: 'lote-san-felipe-del-agua-1500m2',
    title: 'Lote 1,500 m² en San Felipe del Agua',
    summary:
      'Lote en zona residencial alta de San Felipe del Agua. Vista al valle, servicios al pie del lote. Apto para construir residencia.',
    operationType: 'venta',
    propertyType: 'terreno',
    price: 5800000,
    priceLabel: 'MN 5,800,000',
    beds: null, baths: null, parking: null,
    m2Built: null, m2Land: 1500, age: null,
    amenities: ['servicios', 'vista_valle', 'residencial'],
    address: 'Lote 22 Camino al Cerro, San Felipe del Agua',
    zone: 'San Felipe del Agua',
    colony: 'San Felipe del Agua',
    municipality: 'Oaxaca de Juárez',
    state: 'Oaxaca',
    lat: 17.1158, lng: -96.7241,
    isFeatured: false,
    badges: ['Venta', 'Lote', 'Vista valle'],
    highlights: ['1,500 m²', 'Vista al valle', 'Servicios al pie'],
    photoCount: 6,
  },
  {
    slug: 'casa-xochimilco-tradicional-oaxaca',
    title: 'Casa tradicional en Barrio de Xochimilco',
    summary:
      'Casa tradicional oaxaqueña en barrio histórico de Xochimilco. 3 recámaras, patio central con limonero y a 10 min del centro.',
    operationType: 'venta',
    propertyType: 'casa',
    price: 4500000,
    priceLabel: 'MN 4,500,000',
    beds: 3, baths: 2, parking: 1,
    m2Built: 165, m2Land: 240, age: 35,
    amenities: ['patio_central', 'jardin', 'estacionamiento'],
    address: 'Calle Xochimilco 14',
    zone: 'Xochimilco',
    colony: 'Xochimilco',
    municipality: 'Oaxaca de Juárez',
    state: 'Oaxaca',
    lat: 17.0789, lng: -96.7283,
    isFeatured: false,
    badges: ['Venta', 'Casa tradicional'],
    highlights: ['Barrio histórico', 'Patio con limonero'],
    photoCount: 10,
  },
  {
    slug: 'local-comercial-andador-macedonio-alcala',
    title: 'Local comercial Andador Macedonio Alcalá',
    summary:
      'Local de 80 m² en el andador peatonal más turístico de Oaxaca. Ideal para boutique, galería o cafetería. Gran flujo peatonal.',
    operationType: 'renta_larga',
    propertyType: 'local_comercial',
    price: 45000,
    priceLabel: 'MN 45,000/mes',
    beds: null, baths: 1, parking: 0,
    m2Built: 80, m2Land: null, age: 60,
    amenities: ['frente_calle', 'baño', 'aire_acondicionado'],
    address: 'Macedonio Alcalá 304',
    zone: 'Centro Histórico',
    colony: 'Centro',
    municipality: 'Oaxaca de Juárez',
    state: 'Oaxaca',
    lat: 17.0691, lng: -96.7227,
    isFeatured: true,
    badges: ['Renta larga', 'Local', 'Centro'],
    highlights: ['Andador peatonal turístico', '80 m²', 'Alto flujo'],
    photoCount: 7,
  },
]

function poolForListing(s: DemoListing): string[] {
  if (s.propertyType === 'terreno') return PHOTO_POOL_LAND
  if (s.state === 'Oaxaca' && s.municipality !== 'San Pedro Mixtepec') {
    return PHOTO_POOL_OAXACA_CITY
  }
  // Puerto Escondido y costa: combinamos house + beach
  return [...PHOTO_POOL_HOUSE, ...PHOTO_POOL_BEACH]
}

function buildPhotoUrls(s: DemoListing): string[] {
  const pool = poolForListing(s)
  return Array.from({ length: s.photoCount }, (_, i) => {
    const id = pickFromPool(pool, s.slug, i)
    return `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format&fit=crop`
  })
}

export default class extends BaseSeeder {
  public async run() {
    // Asigna el primer publisher disponible (idempotente: si no hay, queda null).
    const agent = await User.query().where('role', 'publisher').first()
    const agentId = agent?.id ?? null

    const ALL_LISTINGS = [...PUERTO_ESCONDIDO, ...OAXACA_CAPITAL]

    for (const s of ALL_LISTINGS) {
      const photoUrls = buildPhotoUrls(s)

      const listing = await Listing.updateOrCreate(
        { slug: s.slug },
        {
          slug: s.slug,
          title: s.title,
          summary: s.summary,
          operationType: s.operationType,
          propertyType: s.propertyType,
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
          status: 'published',
          isPremier: s.isFeatured,
          isFeatured: s.isFeatured,
          badges: s.badges,
          highlights: s.highlights,
          mediaCount: s.photoCount,
          coverImageUrl: photoUrls[0] ?? null,
          publishedAt: DateTime.now(),
          viewCount: 0,
          agentId,
          createdBy: agentId,
          bedsLabel: s.beds ? `${s.beds} rec.` : null,
          sizeLabel: s.m2Built
            ? `${s.m2Built} m² const.${s.m2Land ? ` · ${s.m2Land} m² terreno` : ''}`
            : s.m2Land
              ? `${s.m2Land} m² terreno`
              : null,
          sizeM2: s.m2Built ? Math.round(s.m2Built) : s.m2Land ? Math.round(s.m2Land) : null,
        }
      )

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
