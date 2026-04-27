import vine from '@vinejs/vine'

/**
 * Sprint 2 — Gap #3: validador del payload del form público.
 *
 * Reglas que aplica:
 *   - name: 2-120 chars, trim.
 *   - phone: 8-32 chars, dígitos / espacios / +-(). Validación laxa para
 *     aceptar formatos MX comunes (+52 55 1234 5678, 5512345678, etc.).
 *   - email: formato email, hasta 160 chars.
 *   - message: 10-2000 chars (suficientemente largo para "Hola, me interesa
 *     la propiedad. ¿Sigue disponible?" pero corto para abuso).
 *   - listing_id: opcional. Si viene, es entero positivo.
 *   - source: 'listing' (default) o 'contact_page'.
 *   - turnstile_token: opcional en payload. Cuando Sprint 7 active el secret,
 *     el `turnstile_service` lo exigirá. En Sprint 2-6 puede no venir y el
 *     stub lo deja pasar (ver `turnstile_service.ts`).
 *   - accept_terms: REQUIRED true. Decisión #21 de DECISIONES_NEGOCIO (T&C
 *     y Aviso de Privacidad obligatorios para captura de datos en MX).
 *   - send_confirmation: opcional, default false. Si true, también envía
 *     email "Tu mensaje fue enviado a {agente}" al propio lead.
 */
const phonePattern = /^[+()\-.\s\d]{8,32}$/

export const leadCreateValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(2).maxLength(120),
    phone: vine.string().trim().regex(phonePattern),
    email: vine.string().trim().email().maxLength(160),
    message: vine.string().trim().minLength(10).maxLength(2000),

    listing_id: vine.number().positive().optional(),

    source: vine.enum(['listing', 'contact_page']).optional(),

    turnstile_token: vine.string().trim().maxLength(2048).optional(),

    // Decisión #21 — checkbox obligatorio en el form. Solo aceptamos true.
    accept_terms: vine.accepted(),

    send_confirmation: vine.boolean().optional(),
  })
)

export type LeadCreateInput = Awaited<ReturnType<typeof leadCreateValidator.validate>>
