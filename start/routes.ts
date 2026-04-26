import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const SessionController = () => import('#controllers/session_controller')
const UsersController = () => import('#controllers/users_controller')
const ListingsController = () => import('#controllers/listings_controller')
const ListingPhotosController = () => import('#controllers/listing_photos_controller')
const ListingFavoritesController = () => import('#controllers/listing_favorites_controller')
const MediaController = () => import('#controllers/media_controller')

router.get('/', async () => ({ api: 'gabana-backend', ok: true }))

router
  .group(() => {
    // sesión
    router.post('/session', [SessionController, 'store'])
    router.delete('/session', [SessionController, 'destroy']).use(middleware.auth())
    router.get('/me', [SessionController, 'me']).use(middleware.auth())
    // ❌ OJO: quitamos router.get('/:id/photos', ...) de aquí

    // users (solo superadmin/staff dentro del controller)
    router.get('/users', [UsersController, 'index']).use(middleware.auth())
    router.post('/users', [UsersController, 'store']).use(middleware.auth())

    // admin de listings + fotos + favoritos (auth obligatorio)
    router
      .group(() => {
        router.post('/', [ListingsController, 'store'])
        router.put('/:id', [ListingsController, 'update'])
        router.delete('/:id', [ListingsController, 'destroy'])

        // ✅ AHORA SÍ todas las rutas de fotos bajo /listings
        router.get('/:id/photos', [ListingPhotosController, 'index'])
        router.post('/:id/photos', [ListingPhotosController, 'upload'])
        router.put('/:id/photos/reorder', [ListingPhotosController, 'reorder'])
        router.delete('/:id/photos/:photoId', [ListingPhotosController, 'destroy'])

        // ⭐ Favoritos (siempre autenticado)
        router.get('/favorites', [ListingFavoritesController, 'index'])
        router.post('/:id/favorite', [ListingFavoritesController, 'store'])
        router.delete('/:id/favorite', [ListingFavoritesController, 'destroy'])
      })
      .prefix('/listings')
      .use(middleware.auth())

    // catálogo público de propiedades (debe ir DESPUÉS del grupo /listings)
    router.get('/media/:token', [MediaController, 'show'])
    router.get('/listings', [ListingsController, 'index'])
    router.get('/listings/:slug', [ListingsController, 'show'])
  })
  .prefix('/api')
