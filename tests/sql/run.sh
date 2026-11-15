#!/usr/bin/env bash
# Verifica migrazioni + seed (due volte, idempotenza) + test RLS su Postgres locale.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
TMP=$(mktemp -d)
chown -R postgres "$TMP" 2>/dev/null || true
RUN="runuser -u postgres --"
$RUN $PGBIN/initdb -D "$TMP/db" -A trust -U postgres >/dev/null
$RUN $PGBIN/pg_ctl -D "$TMP/db" -o "-p 54329 -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
trap '$RUN $PGBIN/pg_ctl -D "$TMP/db" stop -m fast >/dev/null; rm -rf "$TMP"' EXIT
P="psql -h $TMP -p 54329 -U postgres -v ON_ERROR_STOP=1 -q -X"
$P -c "create database vs" >/dev/null
P="$P -d vs"
$P -f "$ROOT/tests/sql/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do echo "migrazione $(basename "$f")"; $P -f "$f"; done
$P -f "$ROOT/supabase/seed.sql"
$P -f "$ROOT/supabase/seed.sql"
echo "seed eseguito due volte"
$P -f "$ROOT/supabase/catalog/2026-11-15_catalogo_ufficiale.sql"
$P -f "$ROOT/supabase/catalog/2026-11-15_catalogo_ufficiale.sql"
echo "aggiornamento catalogo eseguito due volte"
$P -o /dev/null -f "$ROOT/tests/sql/10_tests.sql" 2>&1 | sed 's/^psql:.*NOTICE:  //'
