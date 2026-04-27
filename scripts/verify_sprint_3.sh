#!/usr/bin/env bash
# verify_sprint_3.sh — Sprint 3 (Gaps #4 + #15 + lightbox prep).
#
# IMPORTANTE: para que `npm test` no choque con EADDRINUSE, mata el server
# (`node ace serve`) antes de correr este script.
#
# Pasos:
#   1. SQL — confirma que `idx_listings_lat_lng` existe.
#   2. Tests Japa — debe seguir pasando 23/23 (Sprint 3 no agregó tests
#      backend nuevos; el Gap #4 se valida en frontend).
#   3. Smoke bbox — POST /api/listings?bbox=... acepta y responde con data.

set -u

if [ -t 1 ]; then
  C_OK="\033[1;32m"; C_FAIL="\033[1;31m"; C_WARN="\033[1;33m"
  C_DIM="\033[2m"; C_RST="\033[0m"
else C_OK=""; C_FAIL=""; C_WARN=""; C_DIM=""; C_RST=""; fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

LOG_DIR="$SCRIPT_DIR/.verify_logs"
mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
EXIT_CODE=0

step() { echo -e "\n${C_DIM}─── $* ───${C_RST}"; }
ok()   { echo -e "${C_OK}✔ $*${C_RST}"; }
fail() { echo -e "${C_FAIL}✘ $*${C_RST}"; }
warn() { echo -e "${C_WARN}! $*${C_RST}"; }

if [ -f "$REPO_ROOT/.env" ]; then
  set -a; . "$REPO_ROOT/.env"; set +a
fi
DB_HOST="${DB_HOST:-127.0.0.1}"; DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"; DB_PASSWORD="${DB_PASSWORD:-root}"
DB_DATABASE="${DB_DATABASE:-app}"
API_BASE="${API_PUBLIC_BASE_URL:-http://localhost:3333}"

# 1. SQL — índice geo
step "Paso 1/3 — SQL: idx_listings_lat_lng existe"
SQL_OUT="$(mysql --protocol=TCP -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
  -p"$DB_PASSWORD" "$DB_DATABASE" \
  -e "SHOW INDEX FROM listings WHERE Key_name='idx_listings_lat_lng';" 2>&1)"
echo "$SQL_OUT" > "$LOG_DIR/01_sql_$TS.log"
if echo "$SQL_OUT" | grep -q idx_listings_lat_lng; then
  ok "Índice idx_listings_lat_lng presente."
else
  fail "Falta el índice. ¿Corriste \`node ace migration:run\`?"
  EXIT_CODE=1
fi

# 2. Tests
step "Paso 2/3 — npm test (sin server corriendo)"
TEST_LOG="$LOG_DIR/02_tests_$TS.log"
npm test > "$TEST_LOG" 2>&1
if [ $? -ne 0 ]; then
  fail "Tests fallaron. Si dice EADDRINUSE, mata el server local primero."
  tail -30 "$TEST_LOG"
  EXIT_CODE=1
else
  ok "$(grep -E '^Tests' "$TEST_LOG" | tail -1)"
fi

# 3. Smoke bbox
step "Paso 3/3 — Smoke GET /api/listings?bbox=..."
# bbox CDMX aprox: lat 19.3-19.5, lng -99.3 a -99.0
RES="$(curl -s -o /tmp/bbox.json -w '%{http_code}' \
  "$API_BASE/api/listings?bbox=19.3,-99.3,19.5,-99.0&per_page=5")"
if [ "$RES" = "200" ]; then
  COUNT=$(python3 -c "import json,sys;d=json.load(open('/tmp/bbox.json'));print(len(d['data']))" 2>/dev/null || echo 0)
  ok "bbox query → 200 (devolvió $COUNT items)"
else
  fail "bbox query → $RES (esperaba 200). ¿Está el server arriba en :3333?"
  EXIT_CODE=1
fi

echo
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${C_OK}✔ Sprint 3 verde${C_RST}"
else
  echo -e "${C_FAIL}✘ Sprint 3 con errores — ver $LOG_DIR${C_RST}"
fi
exit $EXIT_CODE
