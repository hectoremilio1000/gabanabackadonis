# scripts/ — Verificación end-to-end por sprint

Scripts bash que cierran cada sprint corriendo en orden los 3 frentes que requieren entorno vivo (BD + server) y que no se pueden validar solo con `tsc` o `eslint`:

1. **SQL fixture** — counts y EXPLAIN del schema contra MySQL local.
2. **Tests funcionales** — `npm test` (Japa).
3. **Smoke load test** — autocannon contra el endpoint público que el sprint introduce o modifica.

Cada paso loggea a `.verify_logs/<paso>_<timestamp>.log` (gitignored) y al final imprime un resumen `ok/fallo` por paso. Exit code 0 si los 3 pasan, 1 si alguno falla — apto para CI o un wrapper.

## Scripts disponibles

| Script | Sprint | Qué valida |
|---|---|---|
| `verify_sprint_1.sh` | Sprint 1 — Modelo Listing rico + API búsqueda | Schema con 28 columnas + 5 índices, 15 tests funcionales, autocannon 30s × 50 conn contra `GET /api/listings?operation=venta` |

## Cómo correr

```bash
cd ~/proyectos/gabana/gabanabackadonis
bash scripts/verify_sprint_<N>.sh
```

## Pre-requisitos para correr cualquier `verify_sprint_*.sh`

- MySQL local en `127.0.0.1:3306` con user `root` / pwd `root` / db `app` (homebrew default después de `brew install mysql`).
- `.env` con `APP_KEY` ya seteada (ver `.env.example`).
- `node_modules` instalado (`npm install`).
- El branch del sprint correspondiente checked out.

## Cómo agregar un script para un sprint nuevo

1. Copia `verify_sprint_<N-1>.sh` como base.
2. Cambia las 3 etapas para validar el gap del sprint:
   - SQL: nuevo archivo en `database/sql/verify_sprint_<N>.sql` con counts esperados de las tablas que el sprint introduce.
   - Tests: el `npm test` ya corre todos los specs, pero asegúrate que los nuevos `tests/functional/<feature>.spec.ts` existan.
   - Load test: cambia el endpoint a uno introducido o tocado por el sprint. Para endpoints `POST` (como `/api/leads`), usa `autocannon -m POST -b '<body>' -H 'Content-Type=application/json'`.
3. Documenta en este README qué valida.
4. Commitea junto con el resto del sprint.

## Patrón al fallar

Si un paso falla, el script:

- Imprime las últimas 20-40 líneas del log a stdout.
- Marca el paso como `fallo` en el resumen final.
- Continúa con los siguientes pasos (no usa `set -e`) para que veas el cuadro completo en una sola corrida.
- Sale con exit code 1.

Los logs completos quedan en `.verify_logs/` para diagnóstico posterior.

## Por qué esto vive en el repo y no en CI

A 26 de abril 2026 (Sprint 1) no hay todavía pipeline de CI configurado (eso es trabajo de Sprint 7 según `SPRINT_PLAN.md`). Los `verify_sprint_*.sh` cierran el gap mientras tanto: cualquier persona puede pegar un solo comando y validar que el branch está verde sin tener que recordar la combinación específica de SQL + tests + autocannon de cada sprint. Cuando llegue Sprint 7, estos scripts se convierten en el primer step de CI y solo cambia el invocador.
