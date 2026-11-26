# Oracle VM에서 Supabase DB 데이터 복원

서버를 중지한 상태에서 새 PostgreSQL 데이터베이스에 적용합니다.
`DATABASE_URL`은 Oracle VM의 대상 DB 연결 문자열입니다. 스키마와 데이터는 각각 한 트랜잭션으로 처리합니다.

```bash
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -1 -f prisma/bootstrap.sql
scripts/restore-supabase-backup.sh backup.sql.gz "$DATABASE_URL"
```

- 자체 생성한 신뢰할 수 있는 pg_dump 백업을 사용합니다. 기본 COPY 형식의 SQL, gzip SQL 또는 pg_dump 아카이브를 지원합니다. INSERT 형식은 중단합니다.
- 아카이브에는 덤프 생성 도구와 같은 버전 이상의 `pg_restore`가 필요합니다. 임시 디스크에는 필터링한 데이터와 실행할 SQL을 저장할 여유가 필요합니다.
- 대상의 모든 앱 테이블을 잠그고 비어 있는지 확인합니다. 외래 키 순서로 COPY를 실행하며, 제약 조건 위반이나 호환되지 않는 열이 발견되면 전체 데이터 적재를 롤백합니다. 복원 계정에 대상 테이블의 쓰기·잠금 권한이 필요합니다.
- 롤백이나 복원 성공 여부는 명령 종료 코드로 판단합니다. 성공 시 테이블별 행 수와 Supabase Storage URL 수가 출력됩니다.
- 고정된 테이블 및 외래 키 순서는 `prisma/schema.prisma`에 맞춥니다. 스키마가 바뀌면 복원 순서도 함께 검토합니다.

## 기존 데이터 호환성

| 기존 데이터 | 처리 |
|---|---|
| 앱에서 제거한 `teams`, `team_members`, `team_invites`, `community_posts`, `community_comments` | 건너뛴 테이블의 이름을 출력합니다. |
| `contis.team_id`, `history.team_id` | 백업에 이 열이 남아 있으면 복원을 중단합니다. 원본 스키마와 FK를 확인하고 각각 `room_id`, `org_id` 매핑을 준비한 후 다시 덤프합니다. |
| 신규 nullable 열 또는 DB 기본값이 있는 열 | 백업에 해당 열이 없으면 대상 기본값을 사용합니다. |
| UUID → TEXT | 기존 UUID 문자열을 보존합니다. |
| TIMESTAMPTZ → TIMESTAMP(3) | PostgreSQL은 입력의 시간대 오프셋을 무시합니다. UTC 세션에서 내보낸 덤프를 사용합니다. |
| RLS, Supabase 전용 역할, `auth`, `storage` | 데이터 복원의 대상은 Prisma 앱 테이블입니다. |

Supabase Storage의 파일과 기존 링크는 별도 이전이 필요합니다. 파일을 업로드 저장소로 복사하고 공개 URL을 DB 행에 반영한 뒤, 링크를 검증하고 기존 스토리지를 종료합니다.
