BEGIN {
  n = split(allowed, tables, " ")
  for (i = 1; i <= n; i++) keep[tables[i]] = 1
}

function fail(message) {
  print message > "/dev/stderr"
  failed = 1
  exit 1
}

in_copy {
  if (out != "") print > out
  if ($0 == "\\.") {
    in_copy = 0
    if (out != "") close(out)
  }
  next
}

/^INSERT INTO (ONLY )?"?public"?\./ {
  fail("INSERT 형식은 지원하지 않습니다. pg_dump의 기본 COPY 형식을 사용하세요.")
}

/^COPY / {
  in_copy = 1
  out = ""
  if ($0 !~ /^COPY "?public"?\./) next
  if ($0 !~ /^COPY (public|"public")\.([a-z_][a-z0-9_]*|"[a-z_][a-z0-9_]*") \(([a-z_][a-z0-9_]*|"[a-z_][a-z0-9_]*")(, ([a-z_][a-z0-9_]*|"[a-z_][a-z0-9_]*"))*\) FROM stdin;$/) {
    fail("지원하지 않는 COPY 헤더: " $0)
  }
  table = $2
  sub(/^[^.]+\./, "", table)
  gsub(/"/, "", table)
  if (!(table in keep)) {
    if (!(table in skipped)) print "건너뛴 테이블: " table > "/dev/stderr"
    skipped[table] = 1
    next
  }
  if (table in seen) fail("중복된 COPY 블록: " table)
  seen[table] = 1
  found = 1
  out = dir "/" table ".sql"
  print > out
}

END {
  if (failed) exit 1
  if (in_copy) fail("COPY 블록이 끝나기 전에 백업이 종료됐습니다.")
  if (!found) fail("복원할 public 테이블 데이터가 없습니다.")
}
