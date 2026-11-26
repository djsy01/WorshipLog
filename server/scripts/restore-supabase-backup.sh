#!/usr/bin/env bash
# Usage: scripts/restore-supabase-backup.sh <backup.sql|backup.sql.gz|backup.dump> <DATABASE_URL>
set -euo pipefail

if [[ $# -ne 2 || -z "$2" ]]; then sed -n '2p' "$0" >&2; exit 1; fi
BACKUP="$1"
[[ -e "$BACKUP" ]] || { echo "백업을 찾을 수 없습니다: $BACKUP" >&2; exit 1; }
DB_URL="$2"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

# Prisma 외래 키의 참조 대상 테이블부터 복원한다.
TABLES=(users organizations org_members org_invites rooms room_reads messages
  songs contis conti_shares conti_songs conti_song_sheets history meditations posts comments)

dump_sql() {
  if [[ -d "$BACKUP" ]] || pg_restore -l -- "$BACKUP" >/dev/null 2>&1; then
    pg_restore --data-only --schema=public --no-owner --no-privileges -- "$BACKUP"
  elif [[ "$BACKUP" == *.gz ]]; then
    gzip -dc -- "$BACKUP"
  else
    cat -- "$BACKUP"
  fi
}

dump_sql | awk -v allowed="${TABLES[*]}" -v dir="$WORK" -f "$SCRIPT_DIR/split-backup-copy.awk"

restore_sql() {
  printf "SET LOCAL client_encoding = 'UTF8';\n"
  for table in "${TABLES[@]}"; do
    printf 'LOCK TABLE public.%s IN SHARE ROW EXCLUSIVE MODE;\n' "$table"
  done
  for table in "${TABLES[@]}"; do
    printf 'DO $$ BEGIN IF EXISTS (SELECT 1 FROM public.%s) THEN RAISE EXCEPTION '\''대상 테이블이 비어 있지 않습니다: %s'\''; END IF; END $$;\n' "$table" "$table"
  done
  for table in "${TABLES[@]}"; do
    if [[ -f "$WORK/$table.sql" ]]; then cat -- "$WORK/$table.sql" || return; fi
  done
  for table in "${TABLES[@]}"; do
    printf "SELECT '%s' AS restored_table, count(*) AS rows FROM public.%s;\n" "$table" "$table"
  done
  cat -- "$SCRIPT_DIR/supabase-storage-counts.sql"
}

restore_sql > "$WORK/restore.sql"
psql "$DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction -f "$WORK/restore.sql"
