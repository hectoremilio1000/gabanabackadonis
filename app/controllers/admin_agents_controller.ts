// app/controllers/admin_agents_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import vine from '@vinejs/vine'
import env from '#start/env'
import User from '#models/user'
import AgentDocument from '#models/agent_document'
import {
  getEmailTransport,
  buildAgentApprovedEmail,
  buildAgentRejectedEmail,
} from '#services/email_service'

const isAdmin = (role?: string) => role === 'superadmin' || role === 'staff'

const rejectValidator = vine.compile(
  vine.object({
    reason: vine.string().trim().minLength(5).maxLength(2000),
  })
)

/**
 * Sprint 4 — Gap #7: endpoints admin de verificación de agentes.
 *
 *   GET  /api/admin/agents/pending      — cola de agentes con verification_status='pending'.
 *   POST /api/admin/agents/:id/approve  — aprueba + email "Bienvenido".
 *   POST /api/admin/agents/:id/reject   — rechaza con motivo + email "No aprobado".
 */
export default class AdminAgentsController {
  /** GET /api/admin/agents/pending */
  async pending({ auth, response }: HttpContext) {
    const me = await auth.authenticate()
    if (!isAdmin(me.role)) {
      return response.forbidden({ error: 'Solo superadmin/staff' })
    }

    const agents = await User.query()
      .where('role', 'publisher')
      .where('verification_status', 'pending')
      .orderBy('created_at', 'asc')
      .preload('subscriptionPlan')

    const userIds = agents.map((u) => u.id)
    const docsByUser = userIds.length
      ? await AgentDocument.query().whereIn('user_id', userIds)
      : []

    return response.ok(
      agents.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        slug: u.slug,
        photoUrl: u.photoUrl,
        bio: u.bio,
        whatsapp: u.whatsapp,
        phonePublic: u.phonePublic,
        verificationStatus: u.verificationStatus,
        createdAt: u.createdAt?.toISO(),
        plan: u.subscriptionPlan
          ? { slug: u.subscriptionPlan.slug, name: u.subscriptionPlan.name }
          : null,
        documents: docsByUser
          .filter((d) => d.userId === u.id)
          .map((d) => ({
            id: d.id,
            type: d.type,
            fileUrl: d.fileUrl,
            status: d.status,
            uploadedAt: d.uploadedAt?.toISO(),
          })),
      }))
    )
  }

  /** POST /api/admin/agents/:id/approve */
  async approve({ auth, params, response }: HttpContext) {
    const me = await auth.authenticate()
    if (!isAdmin(me.role)) {
      return response.forbidden({ error: 'Solo superadmin/staff' })
    }

    const agent = await User.find(params.id)
    if (!agent) return response.notFound({ error: 'Agente no encontrado' })
    if (agent.role !== 'publisher') {
      return response.unprocessableEntity({ error: 'Solo se aprueban publishers' })
    }

    agent.verificationStatus = 'approved'
    agent.verifiedAt = DateTime.now()
    await agent.save()

    // Marca todos sus documentos como aprobados.
    await AgentDocument.query()
      .where('user_id', agent.id)
      .update({ status: 'aprobado', reviewed_at: new Date(), reviewed_by: me.id })

    // Email best-effort.
    try {
      const transport = getEmailTransport()
      const adminBaseUrl = env.get('ADMIN_BASE_URL') ?? 'http://localhost:5173'
      const mail = buildAgentApprovedEmail({
        agentName: agent.fullName,
        loginUrl: `${adminBaseUrl}/login`,
      })
      const r = await transport.send({
        to: agent.email,
        subject: mail.subject,
        html: mail.html,
      })
      if (!r.ok) {
        logger.warn({ agentId: agent.id, error: r.error }, '[agents] approve email failed')
      }
    } catch (err) {
      logger.error({ err, agentId: agent.id }, '[agents] approve email exception')
    }

    return response.ok({ ok: true, agent: { id: agent.id, status: agent.verificationStatus } })
  }

  /** POST /api/admin/agents/:id/reject */
  async reject({ auth, params, request, response }: HttpContext) {
    const me = await auth.authenticate()
    if (!isAdmin(me.role)) {
      return response.forbidden({ error: 'Solo superadmin/staff' })
    }

    const { reason } = await request.validateUsing(rejectValidator)

    const agent = await User.find(params.id)
    if (!agent) return response.notFound({ error: 'Agente no encontrado' })
    if (agent.role !== 'publisher') {
      return response.unprocessableEntity({ error: 'Solo se rechazan publishers' })
    }

    agent.verificationStatus = 'rejected'
    agent.verificationNotes = reason
    await agent.save()

    await AgentDocument.query()
      .where('user_id', agent.id)
      .update({ status: 'rechazado', reviewed_at: new Date(), reviewed_by: me.id })

    try {
      const transport = getEmailTransport()
      const mail = buildAgentRejectedEmail({ agentName: agent.fullName, reason })
      const r = await transport.send({
        to: agent.email,
        subject: mail.subject,
        html: mail.html,
      })
      if (!r.ok) {
        logger.warn({ agentId: agent.id, error: r.error }, '[agents] reject email failed')
      }
    } catch (err) {
      logger.error({ err, agentId: agent.id }, '[agents] reject email exception')
    }

    return response.ok({ ok: true, agent: { id: agent.id, status: agent.verificationStatus } })
  }
}
