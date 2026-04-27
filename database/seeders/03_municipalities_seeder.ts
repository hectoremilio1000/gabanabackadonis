import { BaseSeeder } from '@adonisjs/lucid/seeders'
import State from '#models/state'
import Municipality from '#models/municipality'

/**
 * Sprint 1 — DECISIONES_NEGOCIO #3 (opción b del kickoff).
 * Solo los municipios que aparecen en `database/seeds/listings_seed.json`.
 * Catálogo completo INEGI (~2,475 municipios) se difiere a Sprint 4 cuando
 * la página /agentes necesite autocomplete masivo.
 */
const MUNICIPALITIES_BY_STATE: Record<string, Array<{ name: string; slug: string }>> = {
  // Ciudad de México
  '09': [
    { name: 'Miguel Hidalgo', slug: 'miguel-hidalgo' },
    { name: 'Cuauhtémoc', slug: 'cuauhtemoc' },
    { name: 'Álvaro Obregón', slug: 'alvaro-obregon' },
    { name: 'Cuajimalpa de Morelos', slug: 'cuajimalpa' },
    { name: 'Coyoacán', slug: 'coyoacan' },
    { name: 'Benito Juárez', slug: 'benito-juarez' },
  ],
  // Jalisco
  '14': [
    { name: 'Guadalajara', slug: 'guadalajara' },
    { name: 'Zapopan', slug: 'zapopan' },
    { name: 'Tlajomulco de Zúñiga', slug: 'tlajomulco-de-zuniga' },
    { name: 'Tlaquepaque', slug: 'tlaquepaque' },
    { name: 'Tonalá', slug: 'tonala' },
  ],
  // Nuevo León
  '19': [
    { name: 'Monterrey', slug: 'monterrey' },
    { name: 'San Pedro Garza García', slug: 'san-pedro-garza-garcia' },
    { name: 'San Nicolás de los Garza', slug: 'san-nicolas' },
    { name: 'Apodaca', slug: 'apodaca' },
    { name: 'Guadalupe', slug: 'guadalupe-nl' },
  ],
  // Quintana Roo
  '23': [
    { name: 'Solidaridad', slug: 'solidaridad' },
    { name: 'Tulum', slug: 'tulum' },
    { name: 'Puerto Morelos', slug: 'puerto-morelos' },
    { name: 'Benito Juárez', slug: 'benito-juarez-qroo' },
    { name: 'Cozumel', slug: 'cozumel' },
  ],
  // Yucatán
  '31': [
    { name: 'Mérida', slug: 'merida' },
    { name: 'Conkal', slug: 'conkal' },
    { name: 'Progreso', slug: 'progreso' },
    { name: 'Kanasín', slug: 'kanasin' },
    { name: 'Umán', slug: 'uman' },
  ],
  // Querétaro
  '22': [
    { name: 'Querétaro', slug: 'queretaro' },
    { name: 'El Marqués', slug: 'el-marques' },
    { name: 'Corregidora', slug: 'corregidora' },
    { name: 'San Juan del Río', slug: 'san-juan-del-rio' },
  ],
  // Guanajuato
  '11': [
    { name: 'León', slug: 'leon' },
    { name: 'Celaya', slug: 'celaya' },
    { name: 'Irapuato', slug: 'irapuato' },
    { name: 'Guanajuato', slug: 'guanajuato-capital' },
    { name: 'San Miguel de Allende', slug: 'san-miguel-de-allende' },
  ],
  // Puebla
  '21': [
    { name: 'Puebla', slug: 'puebla-capital' },
    { name: 'San Andrés Cholula', slug: 'san-andres-cholula' },
    { name: 'San Pedro Cholula', slug: 'san-pedro-cholula' },
  ],
}

export default class extends BaseSeeder {
  public async run() {
    for (const [stateCode, munis] of Object.entries(MUNICIPALITIES_BY_STATE)) {
      const state = await State.findBy('code', stateCode)
      if (!state) continue

      for (const m of munis) {
        await Municipality.updateOrCreate(
          { stateId: state.id, slug: m.slug },
          {
            stateId: state.id,
            name: m.name,
            slug: m.slug,
          }
        )
      }
    }
  }
}
