# WorshipLog – Server (NestJS)

NestJS + TypeScript REST API 서버

---

## 기술 스택

| 항목      | 기술                                      |
| --------- | ----------------------------------------- |
| Framework | NestJS                                    |
| Language  | TypeScript                                |
| ORM       | Prisma v7 (`@prisma/adapter-pg`)          |
| Database  | PostgreSQL (Supabase, Supavisor 풀러)     |
| Cache     | Redis (Upstash) — Refresh Token, 이메일 인증 토큰 |
| Auth      | JWT (Access 15m + Refresh 7d)             |
| Email     | Nodemailer + Gmail SMTP                   |
| 외부 API  | Spotify Web API (Client Credentials 방식) |

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
│   └── dto/                # CreateSongDto, UpdateSongDto
├── contis/                 # 콘티 CRUD + 팀 공유
│   └── dto/
├── teams/                  # 팀 관리 + 채팅(CommunityPost) + 콘티 공유
│   └── dto/                # CreateTeamDto
├── bible/                  # 오늘의 말씀 API
├── spotify/                # Spotify 검색 연동
├── app.module.ts
└── main.ts
```

---

## 환경 변수

`server/.env` 파일 생성:

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

| Method | Path                          | 인증         | 설명                                      |
| ------ | ----------------------------- | ------------ | ----------------------------------------- |
| POST   | /api/auth/register            | -            | 회원가입 → 인증 이메일 발송               |
| POST   | /api/auth/login               | -            | 로그인 → accessToken + refreshToken       |
| POST   | /api/auth/verify-email?token= | -            | 이메일 인증 토큰 확인 → 토큰 발급         |
| POST   | /api/auth/resend-verification | -            | 인증 이메일 재발송                        |
| POST   | /api/auth/logout              | AccessToken  | Redis에서 refreshToken 삭제               |
| POST   | /api/auth/refresh             | RefreshToken | accessToken + refreshToken 재발급         |

### Songs — `/api/songs`

| Method | Path            | 인증        | 설명                              |
| ------ | --------------- | ----------- | --------------------------------- |
| GET    | /api/songs      | AccessToken | 내 찬양 목록 조회 (검색 지원)     |
| POST   | /api/songs      | AccessToken | 찬양 추가                         |
| GET    | /api/songs/:id  | AccessToken | 찬양 단건 조회                    |
| PATCH  | /api/songs/:id  | AccessToken | 찬양 수정                         |
| DELETE | /api/songs/:id  | AccessToken | 찬양 삭제                         |

### Bible — `/api/bible`

| Method | Path             | 인증        | 설명              |
| ------ | ---------------- | ----------- | ----------------- |
| GET    | /api/bible/today | AccessToken | 오늘의 말씀 조회  |

### Spotify — `/api/spotify`

| Method | Path                   | 인증        | 설명                               |
| ------ | ---------------------- | ----------- | ---------------------------------- |
| GET    | /api/spotify/search?q= | AccessToken | Spotify 곡 검색 (제목·아티스트 반환) |

### Contis — `/api/contis`

| Method | Path                        | 인증        | 설명                              |
| ------ | --------------------------- | ----------- | --------------------------------- |
| GET    | /api/contis                 | AccessToken | 내 콘티 목록 조회                 |
| POST   | /api/contis                 | AccessToken | 콘티 생성                         |
| GET    | /api/contis/:id             | AccessToken | 콘티 단건 조회                    |
| PATCH  | /api/contis/:id             | AccessToken | 콘티 수정                         |
| DELETE | /api/contis/:id             | AccessToken | 콘티 삭제                         |
| POST   | /api/contis/:id/share       | AccessToken | 콘티를 팀에 공유                  |
| DELETE | /api/contis/:id/share       | AccessToken | 팀 공유 해제                      |

### Teams — `/api/teams`

| Method | Path                                  | 인증        | 설명                              |
| ------ | ------------------------------------- | ----------- | --------------------------------- |
| GET    | /api/teams                            | AccessToken | 내 팀 목록                        |
| POST   | /api/teams                            | AccessToken | 팀 생성                           |
| GET    | /api/teams/:id                        | AccessToken | 팀 단건 조회                      |
| DELETE | /api/teams/:id                        | AccessToken | 팀 삭제 (팀장만)                  |
| POST   | /api/teams/:id/invite                 | AccessToken | 초대 링크 생성 (24시간, 팀장만)   |
| POST   | /api/teams/join/:token                | AccessToken | 초대 토큰으로 팀 가입             |
| DELETE | /api/teams/:id/leave                  | AccessToken | 팀 나가기                         |
| DELETE | /api/teams/:id/members/:memberId      | AccessToken | 멤버 추방 (팀장만)                |
| PATCH  | /api/teams/:id/members/:memberId/transfer | AccessToken | 방장 이전 (팀장만)            |
| GET    | /api/teams/:id/contis                 | AccessToken | 팀에 공유된 콘티 목록             |
| GET    | /api/teams/:id/posts                  | AccessToken | 팀 채팅 메시지 목록               |
| POST   | /api/teams/:id/posts                  | AccessToken | 채팅 메시지 전송 (`{ content }`)  |
| DELETE | /api/teams/:id/posts/:postId          | AccessToken | 내 메시지 삭제                    |

### Health

| Method | Path        | 설명              |
| ------ | ----------- | ----------------- |
| GET    | /api/health | 서버 상태 확인    |

---

## Redis 키 구조

| 키                      | 값                  | TTL   |
| ----------------------- | ------------------- | ----- |
| `refresh:{userId}`      | bcrypt 해시된 토큰  | 7일   |
| `email_verify:{token}`  | userId              | 24시간 |

---

## DB 주의사항

- `songs` 테이블에 `scripture_ref` 컬럼이 없으면 수동으로 추가 필요:

  ```sql
  ALTER TABLE songs ADD COLUMN IF NOT EXISTS scripture_ref TEXT;
  ```

- Spotify `audio-features` API는 2024년 이후 신규 앱에서 차단됨 → BPM은 수동 입력
- `community_posts` 테이블의 `team_id` 컬럼은 Supabase pooler FK 제약 불가로 수동 DDL 추가:

  ```sql
  ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS team_id TEXT;
  ```

- `prisma db push`는 Supabase pooler(6543)에서 P1017 오류 발생 → Node `pg`로 직접 DDL 후 `npx prisma generate`
