import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const SessionController = () => import('#controllers/session_controller')
const UsersController = () => import('#controllers/users_controller')
const ListingsController = () => import('#controllers/listings_controller')
const ListingPhotosController = () => import('#controllers/listing_photos_controller')
const ListingFavoritesController = () => import('#controllers/listing_favorites_controller')
const MediaController = () => import('#controllers/media_controller')
const CatalogsController = () => import('#controllers/catalogs_controller')
const LeadsController = () => import('#controllers/leads_controller')
const AdminLeadsController = () => import('#controllers/admin_leads_controller')
const AgentsController = () => import('#controllers/agents_controller')
const AdminAgentsController = () => import('#controllers/admin_agents_controller')
const BillingController = () => import('#controllers/billing_controller')
const PublicAuthController = () => import('#controllers/public_auth_controller')
const PublicFavoritesController = () => import('#controllers/public_favorites_controller')
const SitemapController = () => import('#controllers/sitemap_controller')

router.get('/', async () => ({ api: 'gabana-backend', ok: true }))

// Sprint 7 — sitemap dinámico SEO (fuera del prefijo /api).
router.get('/sitemap-dynamic.xml', [SitemapController, 'show'])

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
        // Sprint 4 — Gap #6: RLS formal en mutaciones por id.
        router
          .put('/:id', [ListingsController, 'update'])
          .use(middleware.enforceListingOwnership())
        router
          .delete('/:id', [ListingsController, 'destroy'])
          .use(middleware.enforceListingOwnership())

        // ✅ AHORA SÍ todas las rutas de fotos bajo /listings
        router.get('/:id/photos', [ListingPhotosController, 'index'])
        router
          .post('/:id/photos', [ListingPhotosController, 'upload'])
          .use(middleware.enforceListingOwnership())
        router
          .put('/:id/photos/reorder', [ListingPhotosController, 'reorder'])
          .use(middleware.enforceListingOwnership())
        router
          .delete('/:id/photos/:photoId', [ListingPhotosController, 'destroy'])
          .use(middleware.enforceListingOwnership())

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

    // Catálogos públicos (Sprint 1, Gap #1)
    router.get('/states', [CatalogsController, 'states'])
    router.get('/states/:id/municipalities', [CatalogsController, 'municipalitiesByState'])
    router.get('/amenities', [CatalogsController, 'amenities'])

    // Leads — endpoint público (Sprint 2, Gap #3)
    // Validación + Turnstile (stub) + rate limit 5/min/IP en el controller.
    router.post('/leads', [LeadsController, 'store'])

    // Sprint 4 — Gap #8: agentes públicos.
    router.get('/agents', [AgentsController, 'index'])
    router.get('/agents/:slug', [AgentsController, 'show'])

    // Sprint 5 — billing webhook (público, valida firma Stripe).
    router.post('/billing/webhook', [BillingController, 'webhook'])

    // Sprint 6 — auth pública (magic link) y favoritos públicos.
    router.post('/auth/public/request', [PublicAuthController, 'request'])
    router.post('/auth/public/consume', [PublicAuthController, 'consume'])
    router.get('/auth/public/me', [PublicAuthController, 'me'])

    router.get('/public/favorites', [PublicFavoritesController, 'index'])
    router.post('/public/listings/:id/favorite', [PublicFavoritesController, 'store'])
    router.delete('/public/listings/:id/favorite', [PublicFavoritesController, 'destroy'])

    // Leads — endpoints admin (Sprint 2, Gap #3 cont.)
    // RLS suave: superadmin/staff ven todo; publisher solo where agent_id = me.id.
    router
      .group(() => {
        router.get('/leads/mine', [AdminLeadsController, 'mine'])
        router
          .group(() => {
            router.get('/leads', [AdminLeadsController, 'index'])
            router.get('/leads/:id', [AdminLeadsController, 'show'])
            router.put('/leads/:id', [AdminLeadsController, 'update'])
            router.put('/leads/:id/status', [AdminLeadsController, 'updateStatus'])

            // Sprint 4 — Gap #7: aprobación de agentes.
            router.get('/agents/pending', [AdminAgentsController, 'pending'])
            router.post('/agents/:id/approve', [AdminAgentsController, 'approve'])
            router.post('/agents/:id/reject', [AdminAgentsController, 'reject'])
          })
          .prefix('/admin')

        // Sprint 5 — billing del agente (auth).
        router.get('/billing/me', [BillingController, 'me'])
        router.post('/billing/checkout', [BillingController, 'checkout'])
        router.post('/billing/portal', [BillingController, 'portal'])
      })
      .use(middleware.auth())
  })
  .prefix('/api')
