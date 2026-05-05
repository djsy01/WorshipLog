# WorshipLog – Server (NestJS)

NestJS + TypeScript REST API 서버

---

## 기술 스택

| 항목      | 기술                                                  |
| --------- | ----------------------------------------------------- |
| Framework | NestJS                                                |
| Language  | TypeScript                                            |
| ORM       | Prisma v7 (`@prisma/adapter-pg`)                      |
| Database  | PostgreSQL (Supabase, Supavisor 풀러)                 |
| Cache     | Redis (Upstash) — Refresh Token, 이메일 인증 토큰     |
| Auth      | JWT (Access 15m + Refresh 7d)                         |
| Email     | Nodemailer + Gmail SMTP                               |
| Storage   | Supabase Storage (`sheet-music` bucket)               |
| 외부 API  | Spotify Web API (Client Credentials 방식)             |

---

## 디렉토리 구조

```text
server/src/
├── auth/                   # 인증 전체
│   ├── dto/                # RegisterDto, LoginDto
│   └── strategies/         # jwt.strategy, jwt-refresh.strategy
├── common/
│   ├── guards/             # JwtAuthGuard, JwtRefreshGuard
│   └── decorators/         # @CurrentUser
├── mail/                   # 이메일 발송 (MailService)
├── health/                 # GET /api/health
├── prisma/                 # PrismaService
├── redis/                  # RedisService
├── songs/                  # 찬양 CRUD
│   ├── dto/                # CreateSongDto, UpdateSongDto
│   ├── songs.controller.ts
│   ├── songs.service.ts
│   ├── sheet-music.controller.ts   # 찬양 원본 악보 업로드/삭제
│   └── sheet-music.service.ts      # Supabase Storage 연동
├── contis/                 # 콘티 CRUD + 악보 + 팀 공유
│   └── dto/
├── teams/                  # 팀 관리 + 채팅(CommunityPost) + 콘티 공유
│   └── dto/
├── uploads/                # 파일 업로드 (커뮤니티 이미지 등)
├── bible/                  # 오늘의 말씀 + 묵상 API
├── spotify/                # Spotify 검색 연동
├── app.module.ts
└── main.ts                 # GlobalPrefix: api, ValidationPipe whitelist+transform
```

---

## 환경 변수

`server/.env`:

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-x-xx.pooler.supabase.com:6543/postgres

JWT_ACCESS_SECRET=<64바이트 랜덤 hex>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<64바이트 랜덤 hex>
JWT_REFRESH_EXPIRES_IN=7d

REDIS_HOST=<upstash-host>
REDIS_PORT=6379
REDIS_PASSWORD=<upstash-password>
REDIS_TLS=true

PORT=3000
CLIENT_URL=http://localhost:3001

GMAIL_USER=your@gmail.com
GMAIL_APP_PASSWORD=<앱비밀번호 16자리, 공백/대시 제거>

SPOTIFY_CLIENT_ID=<Spotify 앱 Client ID>
SPOTIFY_CLIENT_SECRET=<Spotify 앱 Client Secret>

SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role key>
```

> `DATABASE_URL`은 Supabase pooler URL 사용 (`?pgbouncer=true` 파라미터 제거)

---

## 실행 방법

```bash
npm install
npm run start:dev    # 개발 (hot reload) — http://localhost:3000/api
npm run build
npm run start:prod
```

---

## API 엔드포인트

> 모든 라우트는 `/api` 접두사 적용

### Auth — `/api/auth`

| Method | Path                          | 인증         | 설명                                |
| ------ | ----------------------------- | ------------ | ----------------------------------- |
| POST   | /auth/register                | -            | 회원가입 → 인증 이메일 발송         |
| POST   | /auth/login                   | -            | 로그인 → accessToken + refreshToken |
| POST   | /auth/verify-email?token=     | -            | 이메일 인증 토큰 확인 → 토큰 발급   |
| POST   | /auth/resend-verification     | -            | 인증 이메일 재발송                  |
| POST   | /auth/logout                  | AccessToken  | Redis에서 refreshToken 삭제         |
| POST   | /auth/refresh                 | RefreshToken | accessToken + refreshToken 재발급   |

### Songs — `/api/songs`

| Method | Path                  | 인증        | 설명                                        |
| ------ | --------------------- | ----------- | ------------------------------------------- |
| GET    | /songs                | AccessToken | 찬양 목록 조회 (검색 지원, 가나다순 정렬)   |
| POST   | /songs                | AccessToken | 찬양 추가                                   |
| GET    | /songs/:id            | AccessToken | 찬양 단건 조회                              |
| PATCH  | /songs/:id            | AccessToken | 찬양 수정 (admin은 전체, 일반은 본인만)     |
| DELETE | /songs/:id            | AccessToken | 찬양 삭제 (admin은 전체, 일반은 본인만)     |
| POST   | /songs/:id/sheet      | AccessToken | 원본 악보 업로드 (PDF·이미지, multipart)    |
| DELETE | /songs/:id/sheet      | AccessToken | 원본 악보 삭제                              |

### Bible — `/api/bible`

| Method | Path                      | 인증        | 설명                              |
| ------ | ------------------------- | ----------- | --------------------------------- |
| GET    | /bible/random             | -           | 랜덤 말씀 조회 (비로그인 가능)    |
| GET    | /bible/today              | AccessToken | 오늘의 말씀 조회                  |
| GET    | /bible/search?ref=        | AccessToken | 말씀 구절 검색                    |
| GET    | /bible/meditations        | AccessToken | 내 묵상 목록                      |
| PATCH  | /bible/meditations/:id    | AccessToken | 묵상 기록 수정                    |

### Spotify — `/api/spotify`

| Method | Path                   | 인증        | 설명                                 |
| ------ | ---------------------- | ----------- | ------------------------------------ |
| GET    | /spotify/search?q=     | AccessToken | Spotify 곡 검색 (제목·아티스트·BPM) |

### Contis — `/api/contis`

| Method | Path                                        | 인증        | 설명                                  |
| ------ | ------------------------------------------- | ----------- | ------------------------------------- |
| GET    | /contis                                     | AccessToken | 내 콘티 목록 조회                     |
| POST   | /contis                                     | AccessToken | 콘티 생성                             |
| GET    | /contis/:id                                 | AccessToken | 콘티 단건 조회 (songs + sheets 포함)  |
| PATCH  | /contis/:id                                 | AccessToken | 콘티 수정                             |
| DELETE | /contis/:id                                 | AccessToken | 콘티 삭제                             |
| POST   | /contis/:id/songs                           | AccessToken | 콘티에 찬양 추가                      |
| PATCH  | /contis/:id/songs/:songId                   | AccessToken | 콘티 곡 수정 (key·tempo·note)         |
| DELETE | /contis/:id/songs/:songId                   | AccessToken | 콘티에서 찬양 제거                    |
| PUT    | /contis/:id/songs/reorder                   | AccessToken | 콘티 곡 순서 변경                     |
| POST   | /contis/:id/songs/:contiSongId/sheet        | AccessToken | 임시악보 업로드 (multipart)           |
| DELETE | /contis/:id/songs/:contiSongId/sheet/:sheetId | AccessToken | 임시악보 개별 삭제                  |
| POST   | /contis/:id/share                           | AccessToken | 콘티를 팀에 공유                      |
| DELETE | /contis/:id/share                           | AccessToken | 팀 공유 해제                          |

### Teams — `/api/teams`

| Method | Path                                       | 인증        | 설명                            |
| ------ | ------------------------------------------ | ----------- | ------------------------------- |
| GET    | /teams                                     | AccessToken | 내 팀 목록                      |
| POST   | /teams                                     | AccessToken | 팀 생성                         |
| GET    | /teams/:id                                 | AccessToken | 팀 단건 조회                    |
| DELETE | /teams/:id                                 | AccessToken | 팀 삭제 (팀장만)                |
| POST   | /teams/:id/invite                          | AccessToken | 초대 링크 생성 (24시간, 팀장만) |
| POST   | /teams/join/:token                         | AccessToken | 초대 토큰으로 팀 가입           |
| DELETE | /teams/:id/leave                           | AccessToken | 팀 나가기                       |
| DELETE | /teams/:id/members/:memberId               | AccessToken | 멤버 추방 (팀장만)              |
| PATCH  | /teams/:id/members/:memberId/transfer      | AccessToken | 방장 이전 (팀장만)              |
| GET    | /teams/:id/contis                          | AccessToken | 팀에 공유된 콘티 목록           |
| GET    | /teams/:id/posts                           | AccessToken | 팀 채팅 메시지 목록             |
| POST   | /teams/:id/posts                           | AccessToken | 채팅 메시지 전송                |
| DELETE | /teams/:id/posts/:postId                   | AccessToken | 내 메시지 삭제                  |

### Health

| Method | Path        | 설명           |
| ------ | ----------- | -------------- |
| GET    | /health     | 서버 상태 확인 |

---

## Redis 키 구조

| 키                      | 값                  | TTL    |
| ----------------------- | ------------------- | ------ |
| `refresh:{userId}`      | bcrypt 해시된 토큰  | 7일    |
| `email_verify:{token}`  | userId              | 24시간 |

---

## DB 주의사항

- `prisma db push`는 Supabase pooler(6543)에서 P1017 오류 발생 → Node `pg`로 직접 DDL 후 `npx prisma generate`
- Spotify `audio-features` API는 2024년 이후 신규 앱에서 차단됨 → BPM은 수동 입력

수동으로 추가해야 하는 컬럼/테이블:

```sql
-- 찬양 말씀 구절
ALTER TABLE songs ADD COLUMN IF NOT EXISTS scripture_ref TEXT;

-- 커뮤니티 팀 구분
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS team_id TEXT NOT NULL DEFAULT '';
ALTER TABLE community_posts ALTER COLUMN team_id DROP DEFAULT;
ALTER TABLE community_posts ALTER COLUMN title DROP NOT NULL;

-- 콘티 임시악보 (conti_song_sheets)
CREATE TABLE conti_song_sheets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conti_song_id UUID NOT NULL REFERENCES conti_songs(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  order_index   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 사용자 role
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
```
