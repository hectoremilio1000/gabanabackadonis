import { BaseSeeder } from '@adonisjs/lucid/seeders'
import State from '#models/state'

/**
 * Sprint 1 — DECISIONES_NEGOCIO #3.
 * 32 estados de México con código INEGI oficial.
 * Fuente: https://www.inegi.org.mx/app/ageeml/
 */
export default class extends BaseSeeder {
  public async run() {
    const states: Array<{ code: string; name: string; slug: string }> = [
      { code: '01', name: 'Aguascalientes', slug: 'aguascalientes' },
      { code: '02', name: 'Baja California', slug: 'baja-california' },
      { code: '03', name: 'Baja California Sur', slug: 'baja-california-sur' },
      { code: '04', name: 'Campeche', slug: 'campeche' },
      { code: '05', name: 'Coahuila de Zaragoza', slug: 'coahuila' },
      { code: '06', name: 'Colima', slug: 'colima' },
      { code: '07', name: 'Chiapas', slug: 'chiapas' },
      { code: '08', name: 'Chihuahua', slug: 'chihuahua' },
      { code: '09', name: 'Ciudad de México', slug: 'ciudad-de-mexico' },
      { code: '10', name: 'Durango', slug: 'durango' },
      { code: '11', name: 'Guanajuato', slug: 'guanajuato' },
      { code: '12', name: 'Guerrero', slug: 'guerrero' },
      { code: '13', name: 'Hidalgo', slug: 'hidalgo' },
      { code: '14', name: 'Jalisco', slug: 'jalisco' },
      { code: '15', name: 'Estado de México', slug: 'estado-de-mexico' },
      { code: '16', name: 'Michoacán de Ocampo', slug: 'michoacan' },
      { code: '17', name: 'Morelos', slug: 'morelos' },
      { code: '18', name: 'Nayarit', slug: 'nayarit' },
      { code: '19', name: 'Nuevo León', slug: 'nuevo-leon' },
      { code: '20', name: 'Oaxaca', slug: 'oaxaca' },
      { code: '21', name: 'Puebla', slug: 'puebla' },
      { code: '22', name: 'Querétaro', slug: 'queretaro' },
      { code: '23', name: 'Quintana Roo', slug: 'quintana-roo' },
      { code: '24', name: 'San Luis Potosí', slug: 'san-luis-potosi' },
      { code: '25', name: 'Sinaloa', slug: 'sinaloa' },
      { code: '26', name: 'Sonora', slug: 'sonora' },
      { code: '27', name: 'Tabasco', slug: 'tabasco' },
      { code: '28', name: 'Tamaulipas', slug: 'tamaulipas' },
      { code: '29', name: 'Tlaxcala', slug: 'tlaxcala' },
      { code: '30', name: 'Veracruz de Ignacio de la Llave', slug: 'veracruz' },
      { code: '31', name: 'Yucatán', slug: 'yucatan' },
      { code: '32', name: 'Zacatecas', slug: 'zacatecas' },
    ]

    for (const s of states) {
      await State.updateOrCreate({ code: s.code }, s)
    }
  }
}
