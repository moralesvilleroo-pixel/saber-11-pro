#!/usr/bin/env bash
# Aplica las migraciones sobre un Postgres local vacio y corre las pruebas de RLS/RPC.
# Uso: PGHOST=... PGUSER=postgres scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${TEST_DB:-saber11_test}"
psql -v ON_ERROR_STOP=1 -q -c "drop database if exists $DB" -c "create database $DB"
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f supabase/tests/00_supabase_stub.sql
for f in supabase/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -q -d "$DB" -f "$f"; done
[ -f supabase/seed.sql ] && psql -v ON_ERROR_STOP=1 -q -d "$DB" -f supabase/seed.sql
psql -v ON_ERROR_STOP=1 -q -d "$DB" -f supabase/tests/01_behavior.sql 2>&1 | tee /dev/stderr | grep -q "FALLO" && exit 1
echo "Pruebas de base de datos: OK"
