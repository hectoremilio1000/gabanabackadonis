-- /Users/hectoremilio/.../gabanabackadonis/database/sql/verify_sprint_1.sql
--
-- Sprint 1 — Verificación manual del schema y los seeds.
-- Ejecutar después de `node ace migration:fresh --seed` para confirmar que
-- el modelo Listing rico (Gap #1) quedó bien aplicado.
--
-- Uso:
--   mysql -u <user> -p <db_name> < database/sql/verify_sprint_1.sql

-- 1. Las 12 migraciones deben aparecer todas en `adonis_schema`.
SELECT name, batch FROM adonis_schema ORDER BY name;

-- 2. La tabla listings debe tener todos los campos del nuevo modelo MLS.
SHOW COLUMNS FROM listings;

-- 3. Los 5 índices nuevos deben aparecer en SHOW INDEX.
SHOW INDEX FROM listings WHERE Key_name LIKE 'idx_listings_%';

-- 4. Counts de cada catálogo (esperado: 3 / 32 / >=20 / >=30).
-- Nota: usamos `total` en vez de `rows` porque ROWS es palabra reservada
-- en MySQL 8+ (window functions: ROWS BETWEEN ... PRECEDING).
SELECT 'subscription_plans' AS tabla, COUNT(*) AS total FROM subscription_plans
UNION ALL SELECT 'states', COUNT(*) FROM states
UNION ALL SELECT 'municipalities', COUNT(*) FROM municipalities
UNION ALL SELECT 'amenities', COUNT(*) FROM amenities
UNION ALL SELECT 'users (publishers)', COUNT(*) FROM users WHERE role = 'publisher'
UNION ALL SELECT 'listings (published)', COUNT(*) FROM listings WHERE status = 'published';

-- 5. Sanity check de los planes (precios canónicos).
SELECT slug, name, price_mxn, listings_limit, featured_limit
FROM subscription_plans ORDER BY price_mxn;
-- Esperado:
-- slug    name      price_mxn  listings_limit  featured_limit
-- free    Free      0          3               0
-- pro     Pro       499        25              1
-- premium Premium   1499       100             5

-- 6. Distribución por operación + tipo (sanity de los 30 listings).
SELECT operation_type, property_type, COUNT(*) AS n
FROM listings WHERE status = 'published'
GROUP BY operation_type, property_type
ORDER BY operation_type, property_type;

-- 7. Cobertura geográfica.
SELECT state, COUNT(*) AS listings
FROM listings WHERE status = 'published'
GROUP BY state ORDER BY listings DESC;

-- 8. Que cada listing tenga al menos 1 foto y un agente.
SELECT
  COUNT(*) AS total_listings,
  SUM(CASE WHEN agent_id IS NULL THEN 1 ELSE 0 END) AS without_agent,
  SUM(CASE WHEN media_count = 0 THEN 1 ELSE 0 END) AS without_photos
FROM listings WHERE status = 'published';
-- Esperado: without_agent = 0, without_photos = 0.

-- 9. EXPLAIN del query más caliente (operación + tipo + estado) para confirmar
--    que pega el índice idx_listings_status_op_type.
EXPLAIN
SELECT id, slug, title, price
FROM listings
WHERE status = 'published'
  AND operation_type = 'venta'
  AND property_type = 'casa'
ORDER BY created_at DESC
LIMIT 20;
