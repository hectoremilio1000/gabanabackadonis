// /Users/hectoremilio/Proyectos/nodejs/adonis_gabana/gabana-backend/app/controllers/users_controller.ts

import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

const isAdmin = (role?: string) => role === 'superadmin' || role === 'staff'

export default class UsersController {
  public async index({ auth, response }: HttpContext) {
    const me = await auth.authenticate()

    if (!isAdmin(me.role)) {
      return response.forbidden({ error: 'Solo superadmin/staff pueden ver usuarios' })
    }

    const users = await User.query().orderBy('created_at', 'desc')

    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
    }))
  }
  // POST /api/users
  public async store({ auth, request, response }: HttpContext) {
    const me = await auth.authenticate()
    if (!isAdmin(me.role)) {
      return response.forbidden({ error: 'Solo superadmin/staff pueden crear usuarios' })
    }

    const { fullName, email, password, role } = request.only([
      'fullName',
      'email',
      'password',
      'role',
    ])

    if (!fullName || !email || !password) {
      return response.badRequest({ error: 'fullName, email y password son requeridos' })
    }

    // Política: solo superadmin puede crear "superadmin"
    const newRole =
      role === 'superadmin'
        ? me.role === 'superadmin'
          ? 'superadmin'
          : 'staff'
        : role || 'publisher'

    const emailNorm = String(email).trim().toLowerCase()
    const exists = await User.findBy('email', emailNorm)
    if (exists) return response.conflict({ error: 'Email ya registrado' })
    const user = await User.create({
      fullName: String(fullName).trim(),
      email: emailNorm,
      password: String(password), // 👉 TEXTO PLANO
      role: newRole as any,
    })

    return response.created({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    })
  }
}
