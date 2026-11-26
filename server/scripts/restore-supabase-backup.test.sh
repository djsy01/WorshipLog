#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
export RESTORE_CAPTURE="$WORK/restore.sql"
export PATH="$WORK:$PATH"
printf '#!/usr/bin/env bash\nexit 1\n' > "$WORK/pg_restore"
cat > "$WORK/psql" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
[[ "$*" == *"ON_ERROR_STOP=1 --single-transaction -f"* ]]
cp "${@: -1}" "$RESTORE_CAPTURE"
STUB
chmod +x "$WORK/pg_restore" "$WORK/psql"

run_restore() { "$SCRIPT_DIR/restore-supabase-backup.sh" "$1" 'mock-db'; }

cat > "$WORK/data.sql" <<'SQL'
COPY public.posts (id, user_id) FROM stdin;
post	user
\.
COPY public.teams (id) FROM stdin;
old
\.
COPY "public"."users" ("id") FROM stdin;
user
\.
SQL
gzip -c "$WORK/data.sql" > "$WORK/data.sql.gz"
for backup in "$WORK/data.sql" "$WORK/data.sql.gz"; do
  run_restore "$backup"
  [[ "$(awk '/^COPY / {print $2}' "$RESTORE_CAPTURE")" == $'"public"."users"\npublic.posts' ]]
  [[ "$(awk '/^LOCK TABLE / { n++ } END {print n}' "$RESTORE_CAPTURE")" == 16 ]]
done

rm "$RESTORE_CAPTURE"
printf 'INSERT INTO public.users (id) VALUES (1);\n' > "$WORK/invalid.sql"
if run_restore "$WORK/invalid.sql"; then exit 1; fi
printf 'COPY public.users (id) FROM stdin;\nmissing-terminator\n' > "$WORK/invalid.sql"
if run_restore "$WORK/invalid.sql"; then exit 1; fi
[[ ! -e "$RESTORE_CAPTURE" ]]
