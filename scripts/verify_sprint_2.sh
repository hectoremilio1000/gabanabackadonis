#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# verify_sprint_2.sh
# Cierra Sprint 2 (Gaps #3, #5 parcial, #11 parcial) verificando:
#   1. SQL  → tabla leads existe con schema esperado.
#   2. Tests Japa → 15/15 Sprint 1 + 8 nuevos de Sprint 2 = 23/23.
#   3. Smoke endpoint público:
#        a) payload válido → 201
#        b) payload sin accept_terms → 422
#        c) 6 hits seguidos misma IP → último 429 (rate limit 5/min/IP)
#   4. Schema.org JSON-LD: curl al HTML de una ficha y grep "RealEstateListing".
#
# Uso:
#   cd ~/proyectos/gabana/gabanabackadonis
#   bash scripts/verify_sprint_2.sh
#
# Requisitos:
#   - MySQL local en :3306 con user=root pwd=root db=app
#   - .env con APP_KEY y RESEND_API_KEY (puede ser el real; los tests
#     mockean el transport, no llaman a Resend de verdad)
#   - El sitio público (mexicosquared) corriendo en :3000 si quieres
#     verificar el JSON-LD (paso 4 opcional).
#
# Sale con código != 0 si algún paso falla.
# ---------------------------------------------------------------------------

set -u

if [ -t 1 ]; then
  C_OK="\033[1;32m"; C_FAIL="\033[1;31m"; C_WARN="\033[1;33m"
  C_DIM="\033[2m"; C_RST="\033[0m"
else
  C_OK=""; C_FAIL=""; C_WARN=""; C_DIM=""; C_RST=""
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

LOG_DIR="$SCRIPT_DIR/.verify_logs"
mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d_%H%M%S)"

step() { echo -e "\n${C_DIM}─── $* ───${C_RST}"; }
ok()   { echo -e "${C_OK}✔ $*${C_RST}"; }
fail() { echo -e "${C_FAIL}✘ $*${C_RST}"; }
warn() { echo -e "${C_WARN}! $*${C_RST}"; }

EXIT_CODE=0

# ── 0. Pre-flight: cargar .env ────────────────────────────────────────────
if [ -f "$REPO_ROOT/.env" ]; then
  set -a; . "$REPO_ROOT/.env"; set +a
fi
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-root}"
DB_DATABASE="${DB_DATABASE:-app}"

# ── 1. SQL — schema de leads ──────────────────────────────────────────────
step "Paso 1/4 — SQL: tabla leads"
SQL_LOG="$LOG_DIR/01_sql_$TS.log"

mysql --protocol=TCP -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
  -p"$DB_PASSWORD" "$DB_DATABASE" \
  -e "DESCRIBE leads;" > "$SQL_LOG" 2>&1

if [ $? -ne 0 ]; then
  fail "No pudimos consultar la tabla leads. ¿Corriste \`node ace migration:run\`?"
  cat "$SQL_LOG"
  EXIT_CODE=1
else
  for col in id listing_id agent_id name phone email message source ip user_agent status notes created_at updated_at; do
    if ! grep -q "^$col" "$SQL_LOG"; then
      fail "Columna esperada \`$col\` no aparece en leads."
      EXIT_CODE=1
    fi
  done
  if [ $EXIT_CODE -eq 0 ]; then
    ok "leads tiene 14 columnas esperadas."
  fi
fi

# ── 2. Tests Japa ─────────────────────────────────────────────────────────
step "Paso 2/4 — Tests funcionales (npm test)"
TEST_LOG="$LOG_DIR/02_tests_$TS.log"

npm test > "$TEST_LOG" 2>&1
TEST_EXIT=$?
if [ $TEST_EXIT -ne 0 ]; then
  fail "Tests fallaron. Ver $TEST_LOG"
  tail -40 "$TEST_LOG"
  EXIT_CODE=1
else
  PASS_LINE="$(grep -E "^Tests" "$TEST_LOG" | tail -1)"
  ok "Tests OK — $PASS_LINE"
fi

# ── 3. Smoke endpoint público ─────────────────────────────────────────────
step "Paso 3/4 — Smoke POST /api/leads"
SMOKE_LOG="$LOG_DIR/03_smoke_$TS.log"

API_BASE="${API_PUBLIC_BASE_URL:-http://localhost:3333}"

# 3a. Payload válido sobre /contacto (no requiere listing real).
echo "3a. Payload válido a /contacto..." | tee "$SMOKE_LOG"
RES_VALID="$(curl -s -o /tmp/leads_3a.json -w '%{http_code}' \
  -X POST "$API_BASE/api/leads" \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"Smoke Test",
    "phone":"5500000000",
    "email":"smoke@example.com",
    "message":"Mensaje de smoke test del verify_sprint_2.sh",
    "source":"contact_page",
    "accept_terms":true
  }')"
echo "  status=$RES_VALID" | tee -a "$SMOKE_LOG"
if [ "$RES_VALID" = "201" ]; then
  ok "Payload válido → 201."
else
  fail "Esperaba 201, llegó $RES_VALID. Body:"
  cat /tmp/leads_3a.json | tee -a "$SMOKE_LOG"
  EXIT_CODE=1
fi

# 3b. Payload SIN accept_terms → 422.
echo "3b. Payload sin accept_terms..." | tee -a "$SMOKE_LOG"
RES_INVALID="$(curl -s -o /tmp/leads_3b.json -w '%{http_code}' \
  -X POST "$API_BASE/api/leads" \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"Sin terms",
    "phone":"5500000000",
    "email":"noterms@example.com",
    "message":"Mensaje sin aceptar T&C",
    "source":"contact_page"
  }')"
echo "  status=$RES_INVALID" | tee -a "$SMOKE_LOG"
if [ "$RES_INVALID" = "422" ]; then
  ok "Sin accept_terms → 422."
else
  fail "Esperaba 422, llegó $RES_INVALID."
  EXIT_CODE=1
fi

# 3c. Rate limit (6 hits seguidos misma IP → último 429).
echo "3c. 6 hits seguidos con misma X-Forwarded-For..." | tee -a "$SMOKE_LOG"
LAST_STATUS=""
for i in 1 2 3 4 5 6; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' \
    -X POST "$API_BASE/api/leads" \
    -H 'Content-Type: application/json' \
    -H 'X-Forwarded-For: 198.51.100.42' \
    -d '{
      "name":"Spam",
      "phone":"5599999999",
      "email":"spam@example.com",
      "message":"Mensaje spam de prueba para rate limit.",
      "source":"contact_page",
      "accept_terms":true
    }')"
  echo "  hit $i → $CODE" | tee -a "$SMOKE_LOG"
  LAST_STATUS=$CODE
done
if [ "$LAST_STATUS" = "429" ]; then
  ok "Hit #6 → 429 (rate limit funcionando)."
else
  warn "Hit #6 fue $LAST_STATUS (esperaba 429). Si reiniciaste el server entre tests, rearranca y vuelve a correr."
  EXIT_CODE=1
fi

# ── 4. Schema.org JSON-LD (opcional, si :3000 está corriendo) ──────────────
step "Paso 4/4 — Schema.org JSON-LD en ficha pública (opcional)"
JSONLD_LOG="$LOG_DIR/04_jsonld_$TS.log"

PUBLIC_BASE="${PUBLIC_SITE_BASE_URL:-http://localhost:3000}"

# Buscamos el primer slug de venta publicado en el catálogo.
SLUG="$(curl -s "$API_BASE/api/listings?operation=venta&per_page=1" | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['slug'] if d.get('data') else '')")"

if [ -z "$SLUG" ]; then
  warn "No encontré ningún listing de venta publicado para verificar JSON-LD."
else
  HTML="$(curl -s "$PUBLIC_BASE/venta/$SLUG")"
  echo "$HTML" > "$JSONLD_LOG"
  if echo "$HTML" | grep -q '"@type":"RealEstateListing"'; then
    ok "JSON-LD RealEstateListing presente en /venta/$SLUG."
  else
    warn "No encontré '\"@type\":\"RealEstateListing\"' en /venta/$SLUG. ¿Está :3000 corriendo?"
    # No marcamos exit 1: el sitio público puede no estar arriba.
  fi
fi

# ── Resultado final ───────────────────────────────────────────────────────
echo
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${C_OK}✔ Sprint 2 verde — todos los pasos pasaron.${C_RST}"
else
  echo -e "${C_FAIL}✘ Sprint 2 con errores — revisa los logs en $LOG_DIR.${C_RST}"
fi
exit $EXIT_CODE
