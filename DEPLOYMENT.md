# Gabana Backend Deployment

## Railway

Project:

- `refreshing-abundance`

Service:

- `gabanabackadonis`

Production URL:

- `https://gabanabackadonis-production.up.railway.app`

Required variables on the `gabanabackadonis` service:

```env
NODE_ENV=production
APP_KEY=<adonis-app-key>
HOST=0.0.0.0
LOG_LEVEL=info
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
```

Railway injects `PORT` at runtime.

## Commands

Install:

```bash
npm ci
```

Build:

```bash
npm run build
```

Typecheck:

```bash
npm run typecheck
```

Run migrations in production:

```bash
railway ssh --service gabanabackadonis --environment production node ace migration:run --force
```

Check migration status:

```bash
railway ssh --service gabanabackadonis --environment production node ace migration:status
```

Check deployment:

```bash
railway service status
curl -fsSL https://gabanabackadonis-production.up.railway.app/
curl -fsSL https://gabanabackadonis-production.up.railway.app/api/listings
```

## Sprint 0 Verification

- Railway service status: `SUCCESS`
- `/` returns `{ "api": "gabana-backend", "ok": true }`
- `/api/listings` returns an array
- Production migrations are completed
