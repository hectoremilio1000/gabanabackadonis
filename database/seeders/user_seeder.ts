// database/seeders/users_seeder.ts
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import hash from '@adonisjs/core/services/hash'

export default class UsersSeeder extends BaseSeeder {
  // opcional: solo en dev
  public static developmentOnly = true

  public async run() {
    const rows = [
      {
        fullName: 'Super Admin',
        email: 'super@gabana.test',
        role: 'superadmin' as const,
        pass: 'super123',
      },
      {
        fullName: 'Sofía Staff',
        email: 'staff@gabana.test',
        role: 'staff' as const,
        pass: 'staff123',
      },
      {
        fullName: 'Pedro Publisher',
        email: 'publisher@gabana.test',
        role: 'publisher' as const,
        pass: 'pub123456',
      },
    ]

    for (const r of rows) {
      const email = r.email.trim().toLowerCase()
      const password = await hash.use('scrypt').make(r.pass)

      await User.updateOrCreate(
        { email }, // where
        {
          fullName: r.fullName,
          email,
          role: r.role,
          password,
        }
      )
    }
  }
}
