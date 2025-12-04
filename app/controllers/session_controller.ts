// app/controllers/session_controller.ts
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'

export default class SessionController {
  public async store({ request, auth, response }: HttpContext) {
    const { email, password } = request.only(['email', 'password'])

    const emailNorm = String(email || '')
      .trim()
      .toLowerCase()
    const plain = String(password || '')

    try {
      // 🔐 Delega a AuthFinder (usa scrypt + columna "password" que definiste en el modelo)
      const user = await User.verifyCredentials(emailNorm, plain)

      const token = await auth.use('api').createToken(user)

      return response.ok({
        token: token.value!.release(),
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      })
    } catch {
      // Respuesta uniforme para email o password incorrectos
      return response.unauthorized({ error: 'Credenciales inválidas' })
    }
  }

  public async destroy({ auth, response }: HttpContext) {
    await auth.use('api').invalidateToken()
    return response.ok({ ok: true })
  }

  public async me({ auth, response }: HttpContext) {
    try {
      const user = await auth.authenticate()
      return {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      }
    } catch {
      return response.unauthorized({ error: 'No autenticado' })
    }
  }
}
