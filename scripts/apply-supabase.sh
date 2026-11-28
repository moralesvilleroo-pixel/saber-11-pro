#!/usr/bin/env bash
# Aplica al proyecto Supabase lo que falta, sin copiar y pegar SQL desde el telefono:
#   1. migraciones pendientes (detectadas por su efecto en el esquema),
#   2. supabase/seed.sql (taxonomia MBE, idempotente),
#   3. supabase/seed_festivos_co.sql (festivos para plazos ARCO, idempotente),
#   4. supabase/questions/*.sql (banco de preguntas, idempotente).
# Uso: SUPABASE_DB_URL=postgresql://... scripts/apply-supabase.sh [--dry-run]
# Lo ejecuta el flujo .github/workflows/supabase-apply.yml.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${SUPABASE_DB_URL:?Falta SUPABASE_DB_URL}"
export PGSSLMODE="${PGSSLMODE:-require}"
DRY_RUN=false
[ "${1:-}" = "--dry-run" ] && DRY_RUN=true

q() { psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -X -q -At -c "$1"; }
run_file() {
  echo "-> $1"
  if [ "$DRY_RUN" = false ]; then psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -X -q -f "$1"; fi
}

# Cada migracion se reconoce por algo que crea. Una migracion nueva sin regla aqui detiene el flujo
# para que nadie la aplique dos veces por accidente.
migration_applied() {
  case "$(basename "$1")" in
    0001_initial_schema.sql) [ "$(q "select to_regclass('public.subjects') is not null")" = t ] ;;
    0002_fsrs_step.sql)
      [ "$(q "select exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'user_card_fsrs_state' and column_name = 'step')")" = t ] ;;
    *) echo "No hay regla de deteccion para $1 en scripts/apply-supabase.sh" >&2; exit 1 ;;
  esac
}

echo "Conexion: $(q "select current_database() || ' / ' || split_part(version(), ' ', 2)")"
[ "$DRY_RUN" = true ] && echo "Modo prueba: no se escribe nada."

for f in supabase/migrations/*.sql; do
  if migration_applied "$f"; then echo "   ya aplicada: $(basename "$f")"; else run_file "$f"; fi
done
run_file supabase/seed.sql
run_file supabase/seed_festivos_co.sql
for f in supabase/questions/*.sql; do [ -f "$f" ] && run_file "$f"; done

if [ "$DRY_RUN" = false ]; then
  echo "Resumen:"
  q "select 'evidencias: ' || count(code) from public.evidences"
  q "select 'festivos: ' || count(holiday_date) from public.co_public_holidays" 2>/dev/null || true
  q "select 'preguntas: ' || count(id) from public.questions"
fi
