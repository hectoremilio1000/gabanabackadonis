### usuarios

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
        { fullName: r.fullName, email, role: r.role, password } // create/update
      )
    }

}
}

###

1. Definición conceptual de cada rol
   🔵 superadmin

Dueño total del sistema.

Puede administrar TODO: usuarios y listings.

No tiene restricciones de “solo lo que creó él”.

🟢 staff

Staff interno de Gabana (operaciones / soporte).

Comparte casi todos los poderes del superadmin excepto:

No puede crear otros superadmin (tu política actual los mapea a staff).

🟠 publisher

Usuario que solo gestiona contenido (propiedades/listings).

Puede crear y editar listings, pero:

Solo los que él creó.

No puede borrar.

No puede publicar directamente si ya están publicados.

###

2. Lo que ya hace tu código HOY (según controllers)
   2.1 UsersController.store (POST /api/users)
   const isAdmin = (role?: string) => role === 'superadmin' || role === 'staff'
   ...
   if (!isAdmin(me.role)) {
   return response.forbidden({ error: 'Solo superadmin/staff pueden crear usuarios' })
   }

Permisos efectivamente:

Acción superadmin staff publisher
Crear usuarios ✅ ✅ ❌
Crear usuario con rol superadmin ✅ ❌ (se fuerza a staff) ❌

###

2.2 ListingsController.store (POST /api/listings)
if (!['superadmin', 'staff', 'publisher'].includes(me.role)) {
return response.forbidden({ error: 'No puedes crear listings' })
}
...
const status: 'draft' | 'published' | 'archived' =
me.role === 'publisher' ? 'draft' : (payload.status as any) || 'published'

Permisos:

Acción superadmin staff publisher
Crear listings ✅ ✅ ✅
Definir libremente el status ✅ ✅ ❌ (siempre draft)

Para publisher:

Aunque mande "status": "published", tú lo conviertes a draft.

####

Permisos:

Acción superadmin staff publisher
Editar cualquier listing ✅ ✅ ❌
Editar solo listings creados por él n/a n/a ✅
Cambiar status libremente (draft/published/archived) ✅ ✅ ⚠️ limitado: solo si aún NO está published

####

Permisos:

Acción superadmin staff publisher
Borrar cualquier listing ✅ ✅ ❌

No hay restricción de “solo los que yo creé” para staff/superadmin: pueden borrar cualquier listing.

####

Permisos:

Acción superadmin staff publisher
Subir fotos (upload) ✅ ✅ ✅
Reordenar fotos ✅ ✅ ✅
Borrar fotos ✅ ✅ ✅

(Todos los autenticados pueden operar fotos del listing, aunque no sean dueños ⇒ si luego quieres endurecer esto, habría que meter lógica por rol y createdBy.)

###

3. Resumen de permisos para documentar / hacer archivos

Te lo dejo como matriz para que puedas copiarlo a un MD, Notion o lo que uses:

👤 superadmin

Usuarios:

Crear usuarios (POST /api/users)

Crear otros superadmin

Listings:

Crear (POST /api/listings)

Editar cualquier listing

Cambiar status libremente

Borrar cualquier listing

Fotos:

Subir, reordenar, borrar fotos en cualquier listing

Favoritos:

Administrar solo sus propios favoritos (como cualquier usuario)

👤 staff

Usuarios:

Crear usuarios (POST /api/users)

Si intenta crear superadmin, se baja a staff

Listings:

Crear (POST /api/listings)

Editar cualquier listing

Cambiar status libremente

Borrar cualquier listing

Fotos:

Subir, reordenar, borrar

Favoritos:

Sus propios favoritos

👤 publisher

Usuarios:

❌ NO puede crear usuarios

Listings:

Crear listings (forzados a draft)

Editar solo listings que creó él (createdBy === me.id)

Puede jugar con status, pero:

Si aún no es published, solo draft/archived.

Una vez published por staff/superadmin, ya no controla el status.

❌ Nunca puede borrar listings

Fotos:

Puede subir, reordenar, borrar fotos (hoy sin restricción extra).

Favoritos:

Sus propios favoritos.
# gabanabackadonis
