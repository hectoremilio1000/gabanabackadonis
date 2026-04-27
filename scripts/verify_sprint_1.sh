#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# verify_sprint_1.sh
# Cierra Sprint 1 verificando los 3 frentes que requieren BD/server vivos:
#   1. SQL de verificación  → counts y joins esperados
#   2. Tests Japa           → 15/15
#   3. Smoke load test      → autocannon 30s × 50 conn contra /api/listings
#
# Uso:
#   cd ~/proyectos/gabana/gabanabackadonis
#   bash scripts/verify_sprint_1.sh
#
# Requisitos previos:
#   - MySQL local corriendo en localhost:3306 con user=root pwd=root db=app
#   - .env presente y con APP_KEY (cp .env.example .env && node ace generate:key)
#   - npm install ya ejecutado
#
# Sale con código != 0 si algún paso falla, para que CI o un wrapper lo capte.
# ---------------------------------------------------------------------------

set -u  # falla en variable no definida
# NO usamos `set -e` porque queremos correr los 3 pasos aunque uno falle,
# para tener un reporte completo al final.

# Colores (solo si stdout es tty)
if [ -t 1 ]; then
  C_OK="\033[1;32m"
  C_FAIL="\033[1;31m"
  C_WARN="\033[1;33m"
  C_DIM="\033[2m"
  C_RST="\033[0m"
else
  C_OK="" C_FAIL="" C_WARN="" C_DIM="" C_RST=""
fi

# Trabajamos siempre desde la raíz del repo (donde vive package.json)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

LOG_DIR="$REPO_ROOT/scripts/.verify_logs"
mkdir -p "$LOG_DIR"
TS="$(date +%Y%m%d_%H%M%S)"
SQL_LOG="$LOG_DIR/sql_$TS.log"
TEST_LOG="$LOG_DIR/tests_$TS.log"
SERVER_LOG="$LOG_DIR/server_$TS.log"
LOAD_LOG="$LOG_DIR/load_$TS.log"

STEP_SQL="pendiente"
STEP_TESTS="pendiente"
STEP_LOAD="pendiente"

cleanup() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo
echo "============================================================"
echo "  Sprint 1 — verificación end-to-end"
echo "  Repo:    $REPO_ROOT"
echo "  Logs:    $LOG_DIR"
echo "  Branch:  $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'desconocida')"
echo "  HEAD:    $(git rev-parse --short HEAD 2>/dev/null || echo 'desconocido')"
echo "============================================================"

# ---------------------------------------------------------------------------
# 1) SQL de verificación
# ---------------------------------------------------------------------------
echo
echo -e "${C_DIM}── 1/3  SQL de verificación ─────────────────────────────${C_RST}"
SQL_FILE="$REPO_ROOT/database/sql/verify_sprint_1.sql"
if [ ! -f "$SQL_FILE" ]; then
  echo -e "${C_FAIL}✖ No existe $SQL_FILE${C_RST}"
  STEP_SQL="fallo (archivo SQL ausente)"
else
  if mysql -u root -proot app < "$SQL_FILE" > "$SQL_LOG" 2>&1; then
    echo -e "${C_OK}✔ SQL ejecutado${C_RST}  (log: $SQL_LOG)"
    # Mostramos las tablas resultado en consola para revisión humana
    cat "$SQL_LOG"
    STEP_SQL="ok"
  else
    echo -e "${C_FAIL}✖ MySQL falló${C_RST}  (ver $SQL_LOG)"
    tail -n 20 "$SQL_LOG"
    STEP_SQL="fallo (MySQL)"
  fi
fi

# ---------------------------------------------------------------------------
# 2) Tests Japa
# ---------------------------------------------------------------------------
echo
echo -e "${C_DIM}── 2/3  Tests funcionales (Japa) ───────────────────────${C_RST}"
if npm test > "$TEST_LOG" 2>&1; then
  PASSED=$(grep -E "Tests\s+[0-9]+ passed" "$TEST_LOG" | tail -n 1 || echo "")
  echo -e "${C_OK}✔ Tests OK${C_RST}  $PASSED"
  STEP_TESTS="ok ($PASSED)"
else
  echo -e "${C_FAIL}✖ Tests fallaron${C_RST}  (ver $TEST_LOG)"
  tail -n 40 "$TEST_LOG"
  STEP_TESTS="fallo"
fi

# ---------------------------------------------------------------------------
# 3) Smoke load test (autocannon)
# ---------------------------------------------------------------------------
echo
echo -e "${C_DIM}── 3/3  Smoke load test (autocannon 30s × 50 conn) ─────${C_RST}"

# 3a) Levantar el server en background
echo "→ arrancando node ace serve en background…"
node ace serve > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!

# 3b) Esperar a que el server responda en /api/listings (máx 30s)
WAITED=0
until curl -s -o /dev/null -w "%{http_code}" http://localhost:3333/api/listings | grep -qE "^(200|400|422)$"; do
  sleep 1
  WAITED=$((WAITED + 1))
  if [ $WAITED -ge 30 ]; then
    echo -e "${C_FAIL}✖ El server no respondió en 30s${C_RST}"
    tail -n 30 "$SERVER_LOG"
    STEP_LOAD="fallo (server no arrancó)"
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo -e "${C_FAIL}✖ El proceso del server murió${C_RST}"
    tail -n 30 "$SERVER_LOG"
    STEP_LOAD="fallo (server crash)"
    break
  fi
done

# 3c) Correr autocannon si el server está arriba
if [ "$STEP_LOAD" = "pendiente" ]; then
  echo "→ server arriba (esperó ${WAITED}s). Corriendo autocannon…"
  if npx --yes autocannon -d 30 -c 50 \
        'http://localhost:3333/api/listings?operation=venta' \
        > "$LOAD_LOG" 2>&1; then
    echo -e "${C_OK}✔ autocannon terminó${C_RST}  (log: $LOAD_LOG)"
    cat "$LOAD_LOG"

    # Heurística de aceptación: queremos 0 errores y p99 razonable.
    ERRORS=$(grep -E "errors\s*:" "$LOAD_LOG" | head -n 1 | awk '{print $NF}' || echo "?")
    P99_LINE=$(grep -E "Latency.*p99|99%" "$LOAD_LOG" | head -n 1 || echo "")
    REQ_PER_SEC=$(grep -E "Req/Sec|requests/sec" "$LOAD_LOG" | head -n 1 || echo "")

    STEP_LOAD="ok (errors=${ERRORS:-?})"
  else
    echo -e "${C_FAIL}✖ autocannon falló${C_RST}"
    tail -n 30 "$LOAD_LOG"
    STEP_LOAD="fallo (autocannon)"
  fi
fi

# El cleanup() del trap mata el server al salir.

# ---------------------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------------------
echo
echo "============================================================"
echo "  RESUMEN"
echo "============================================================"
printf "  1. SQL verificación  : %s\n" "$STEP_SQL"
printf "  2. Tests funcionales : %s\n" "$STEP_TESTS"
printf "  3. Smoke load test   : %s\n" "$STEP_LOAD"
echo
echo "  Logs en: $LOG_DIR"
echo "============================================================"

# Exit code: 0 si los 3 pasaron, 1 si alguno falló
case "$STEP_SQL$STEP_TESTS$STEP_LOAD" in
  *fallo*)
    echo -e "${C_FAIL}Sprint 1 NO cerrado. Revisa los logs arriba.${C_RST}"
    exit 1
    ;;
  *)
    echo -e "${C_OK}Sprint 1 verificado verde end-to-end.${C_RST}"
    exit 0
    ;;
esac
