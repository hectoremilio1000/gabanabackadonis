import env from '#start/env'

/**
 * Sprint 2 — Servicio de email transaccional vía Resend API REST.
 *
 * Usa fetch directo a `https://api.resend.com/emails` para no agregar la SDK
 * `resend` como dependencia. La API es estable y la llamada es trivial:
 *   POST /emails { from, to, subject, html, reply_to }
 *
 * INYECCIÓN DE TRANSPORT:
 *   Para tests, se puede sustituir el transport por un fake que captura el
 *   payload sin llamar a la red. Ver `setEmailTransportForTesting()`.
 *
 * FALLBACK SI RESEND CAE:
 *   Esta función es síncrona desde la perspectiva del controller, pero el
 *   controller la envuelve en un `try/catch` y NO falla la request si el
 *   email falla — el lead ya se persistió. El controller delega al consumer
 *   un retry job (Sprint 2 lo deja como TODO; Sprint 7 lo conecta a un
 *   worker formal cuando se monte la cola).
 *
 * IDIOMA:
 *   Templates en español MX según REGLAS #7 del kickoff. Voz/tono según
 *   BRAND_GUIDE_v1.md sección 9.
 */

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export interface SendEmailResult {
  ok: boolean
  id?: string
  error?: string
}

export interface EmailTransport {
  send(params: SendEmailParams): Promise<SendEmailResult>
}

class ResendTransport implements EmailTransport {
  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const apiKey = env.get('RESEND_API_KEY')
    const from = env.get('RESEND_FROM_EMAIL') ?? 'Gabana <noreply@gabanarealstate.com.mx>'

    if (!apiKey) {
      return { ok: false, error: 'RESEND_API_KEY missing' }
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          ...(params.replyTo ? { reply_to: params.replyTo } : {}),
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        return { ok: false, error: `resend ${res.status}: ${text.slice(0, 200)}` }
      }

      const data = (await res.json().catch(() => ({}))) as { id?: string }
      return { ok: true, id: data.id }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'unknown' }
    }
  }
}

class CapturingFakeTransport implements EmailTransport {
  public sent: SendEmailParams[] = []

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    this.sent.push(params)
    return { ok: true, id: `fake_${this.sent.length}` }
  }
}

let activeTransport: EmailTransport = new ResendTransport()

export function getEmailTransport(): EmailTransport {
  return activeTransport
}

/** Solo para tests. Inyecta un transport falso que captura los envíos. */
export function setEmailTransportForTesting(transport: EmailTransport): void {
  activeTransport = transport
}

/** Vuelve al transport por defecto (Resend). Útil después de un test. */
export function resetEmailTransport(): void {
  activeTransport = new ResendTransport()
}

/** Helper para crear un transport fake desde tests. */
export function createCapturingFakeTransport(): CapturingFakeTransport {
  return new CapturingFakeTransport()
}

// ── Templates de Sprint 2 ─────────────────────────────────────────────────

export interface NewLeadEmailContext {
  agentName: string
  leadName: string
  leadEmail: string
  leadPhone: string
  leadMessage: string
  listingTitle?: string | null
  listingUrl?: string | null
  adminLeadUrl: string
}

/**
 * Template "Nuevo lead recibido" enviado al agente cuando un comprador llena
 * el form de contacto. Reply-to apunta al email del lead para que el agente
 * pueda responder con un click.
 */
export function buildNewLeadEmail(ctx: NewLeadEmailContext): {
  subject: string
  html: string
} {
  const listingBlock = ctx.listingTitle
    ? `<p style="margin:0 0 8px"><strong>Propiedad:</strong> ${escapeHtml(ctx.listingTitle)}${
        ctx.listingUrl
          ? ` &middot; <a href="${escapeAttr(ctx.listingUrl)}" style="color:#007BFF">ver ficha</a>`
          : ''
      }</p>`
    : `<p style="margin:0 0 8px"><strong>Origen:</strong> página de contacto general</p>`

  const subject = ctx.listingTitle
    ? `Nuevo lead: ${ctx.leadName} interesado en "${ctx.listingTitle}"`
    : `Nuevo lead: ${ctx.leadName}`

  const html = `<!doctype html>
<html lang="es-MX">
<body style="font-family:Montserrat,system-ui,sans-serif;color:#0F172A;background:#F8FAFC;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:24px;box-shadow:0 1px 2px rgba(15,23,42,0.05)">
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px;color:#007BFF">Hola ${escapeHtml(ctx.agentName)},</h1>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6">Recibiste un nuevo contacto en Gabana.</p>
    ${listingBlock}
    <hr style="border:none;border-top:1px solid #E2E8F0;margin:16px 0">
    <p style="margin:0 0 8px"><strong>Nombre:</strong> ${escapeHtml(ctx.leadName)}</p>
    <p style="margin:0 0 8px"><strong>Teléfono:</strong> <a href="tel:${escapeAttr(ctx.leadPhone)}" style="color:#007BFF">${escapeHtml(ctx.leadPhone)}</a></p>
    <p style="margin:0 0 8px"><strong>Email:</strong> <a href="mailto:${escapeAttr(ctx.leadEmail)}" style="color:#007BFF">${escapeHtml(ctx.leadEmail)}</a></p>
    <p style="margin:16px 0 8px"><strong>Mensaje:</strong></p>
    <p style="margin:0 0 16px;padding:12px;background:#F8FAFC;border-radius:6px;white-space:pre-wrap">${escapeHtml(ctx.leadMessage)}</p>
    <hr style="border:none;border-top:1px solid #E2E8F0;margin:16px 0">
    <p style="text-align:center;margin:16px 0">
      <a href="${escapeAttr(ctx.adminLeadUrl)}"
         style="display:inline-block;background:#007BFF;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:20px;font-weight:600">
        Ver lead en el panel
      </a>
    </p>
    <p style="font-size:12px;color:#64748B;margin:24px 0 0;text-align:center">
      Te llegó este correo porque eres agente verificado en Gabana. Responde directamente a este email para contactar al lead.
    </p>
  </div>
</body>
</html>`

  return { subject, html }
}

export interface LeadConfirmationEmailContext {
  leadName: string
  agentName: string
  listingTitle?: string | null
}

/** Confirmación opcional al lead que llenó el form. */
export function buildLeadConfirmationEmail(ctx: LeadConfirmationEmailContext): {
  subject: string
  html: string
} {
  const listingLine = ctx.listingTitle
    ? `<p style="margin:0 0 16px">Tu mensaje sobre "<strong>${escapeHtml(ctx.listingTitle)}</strong>" fue enviado a <strong>${escapeHtml(ctx.agentName)}</strong>.</p>`
    : `<p style="margin:0 0 16px">Tu mensaje fue enviado a <strong>${escapeHtml(ctx.agentName)}</strong>.</p>`

  const subject = `Tu mensaje fue enviado a ${ctx.agentName}`

  const html = `<!doctype html>
<html lang="es-MX">
<body style="font-family:Montserrat,system-ui,sans-serif;color:#0F172A;background:#F8FAFC;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:24px;box-shadow:0 1px 2px rgba(15,23,42,0.05)">
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 16px;color:#007BFF">¡Gracias, ${escapeHtml(ctx.leadName)}!</h1>
    ${listingLine}
    <p style="margin:0 0 16px">Te contactará en menos de 24 horas. Mientras tanto, puedes seguir explorando propiedades en Gabana.</p>
    <p style="font-size:12px;color:#64748B;margin:24px 0 0">
      Si no enviaste este mensaje, ignora este correo.
    </p>
  </div>
</body>
</html>`

  return { subject, html }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s: string): string {
  return escapeHtml(s)
}
