# WorshipLog – Server (NestJS)

NestJS + TypeScript REST API 서버

---

## 기술 스택

| 항목      | 기술                                                |
| --------- | --------------------------------------------------- |
| Framework | NestJS 11                                           |
| Language  | TypeScript                                          |
| ORM       | Prisma 7 (`@prisma/adapter-pg`)                     |
| Database  | PostgreSQL (Supabase, Supavisor 풀러)               |
| Cache     | Redis (Upstash) — Refresh Token, 이메일 인증 토큰   |
| Auth      | JWT (Access 15m + Refresh 30d)                      |
| Email     | Nodemailer + Gmail SMTP / Resend                    |
| Storage   | Supabase Storage (`sheet-music` bucket)             |
| 외부 API  | Spotify Web API (Client Credentials 방식)           |
| 푸시 알림 | Firebase Admin SDK (FCM)                            |

---

## 배포

- **서버 주소**: 프로덕션 API 서버 (Oracle Cloud, env 참고)
- **인프라**: Oracle Cloud (Ubuntu) + pm2
- **배포 방식**: GitHub Actions SSH 자동 배포 (`.github/workflows/server-deploy.yml`)
  - `server/**` 변경 push 시 자동 실행
  - `pm2 restart worshiplog-server`

---

## 디렉토리 구조

```text
server/src/
├── auth/                   # 인증 전체 (JWT, 이메일 인증)
│   ├── dto/
│   └── strategies/         # jwt.strategy, jwt-refresh.strategy
├── common/
│   ├── guards/             # JwtAuthGuard, JwtRefreshGuard
│   └── decorators/         # @CurrentUser
├── mail/                   # 이메일 발송 (MailService)
├── health/                 # GET /api/health
├── notifications/          # FCM 푸시 알림 (Firebase Admin SDK)
├── prisma/                 # PrismaService
├── redis/                  # RedisService
├── songs/                  # 찬양 CRUD + 악보 업로드
│   ├── dto/
│   ├── songs.controller.ts
│   ├── songs.service.ts
│   ├── sheet-music.controller.ts   # 원본 악보 업로드/삭제 (admin only)
│   └── sheet-music.service.ts
├── contis/                 # 콘티 CRUD + 곡 관리 + 악보 + 팀 공유 + 복제
│   └── dto/
├── organizations/          # 팀(조직) 생성·참여·관리 + 초대 링크
│   └── dto/
├── rooms/                  # 팀 채팅방 CRUD + 메시지 + 읽음 추적 + SSE
│   └── dto/
├── uploads/                # 파일 업로드 (Supabase Storage)
├── bible/                  # 오늘의 말씀 + 묵상 API
├── spotify/                # Spotify 검색 연동
├── history/                # 예배 히스토리 기록 및 조회
├── posts/                  # 커뮤니티 게시판 + 댓글 (전체 공개)
├── users/                  # 사용자 정보 조회
├── app.module.ts
└── main.ts                 # GlobalPrefix: api, ValidationPipe whitelist+transform
```

---

## 환경 변수

`server/.env` (로컬 및 서버 동일하게 유지):

```env
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-x-xx.pooler.supabase.com:6543/postgres

JWT_ACCESS_SECRET=<64바이트 랜덤 hex>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<64바이트 랜덤 hex>
JWT_REFRESH_EXPIRES_IN=30d

REDIS_URL=rediss://default:<password>@<host>.upstash.io:6379

PORT=3000
CLIENT_URL=https://worshiplog.inho.pe.kr,http://localhost:3001

SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role key>

SPOTIFY_CLIENT_ID=<Spotify 앱 Client ID>
SPOTIFY_CLIENT_SECRET=<Spotify 앱 Client Secret>

FIREBASE_PROJECT_ID=<firebase project id>
FIREBASE_CLIENT_EMAIL=<firebase admin sdk email>
FIREBASE_PRIVATE_KEY=<firebase admin sdk private key>
```

> **주의**: `CLIENT_URL`은 쉼표로 구분하여 다중 origin 허용 (CORS)
> **주의**: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` 누락 시 로그인 500 에러 발생

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

| Method | Path                      | 인증         | 설명                                  |
| ------ | ------------------------- | ------------ | ------------------------------------- |
| POST   | /auth/register            | -            | 회원가입 → 인증 이메일 발송           |
| POST   | /auth/login               | -            | 로그인 → accessToken + refreshToken   |
| POST   | /auth/verify-email?token= | -            | 이메일 인증 토큰 확인 → 토큰 발급     |
| POST   | /auth/resend-verification | -            | 인증 이메일 재발송                    |
| POST   | /auth/logout              | AccessToken  | Redis에서 refreshToken 삭제           |
| POST   | /auth/refresh             | RefreshToken | accessToken + refreshToken 재발급     |
| PATCH  | /auth/fcm-token           | AccessToken  | FCM 푸시 토큰 등록/갱신               |

### Songs — `/api/songs`

| Method | Path             | 인증        | 설명                                       |
| ------ | ---------------- | ----------- | ------------------------------------------ |
| GET    | /songs           | AccessToken | 찬양 목록 조회 (검색·가나다순·페이지네이션) |
| POST   | /songs           | AccessToken | 찬양 추가                                  |
| GET    | /songs/:id       | AccessToken | 찬양 단건 조회                             |
| PATCH  | /songs/:id       | AccessToken | 찬양 수정 (admin은 전체, 일반은 본인만)    |
| DELETE | /songs/:id       | AccessToken | 찬양 삭제 (admin은 전체, 일반은 본인만)    |
| POST   | /songs/:id/sheet | Admin only  | 원본 악보 업로드 (PDF·이미지, multipart)   |
| DELETE | /songs/:id/sheet | Admin only  | 원본 악보 삭제                             |

### Bible — `/api/bible`

| Method | Path                   | 인증        | 설명                           |
| ------ | ---------------------- | ----------- | ------------------------------ |
| GET    | /bible/random          | -           | 랜덤 말씀 조회 (비로그인 가능) |
| GET    | /bible/today           | AccessToken | 오늘의 말씀 조회               |
| GET    | /bible/search?ref=     | AccessToken | 말씀 구절 검색                 |
| GET    | /bible/meditations     | AccessToken | 내 묵상 목록                   |
| PATCH  | /bible/meditations/:id | AccessToken | 묵상 기록 수정                 |

### Spotify — `/api/spotify`

| Method | Path               | 인증        | 설명                                 |
| ------ | ------------------ | ----------- | ------------------------------------ |
| GET    | /spotify/search?q= | AccessToken | Spotify 곡 검색 (제목·아티스트·BPM) |

### Contis — `/api/contis`

| Method | Path                                          | 인증        | 설명                                 |
| ------ | --------------------------------------------- | ----------- | ------------------------------------ |
| GET    | /contis                                       | AccessToken | 내 콘티 목록 조회                    |
| POST   | /contis                                       | AccessToken | 콘티 생성                            |
| GET    | /contis/:id                                   | AccessToken | 콘티 단건 조회 (songs + sheets 포함) |
| PATCH  | /contis/:id                                   | AccessToken | 콘티 수정                            |
| DELETE | /contis/:id                                   | AccessToken | 콘티 삭제                            |
| POST   | /contis/:id/clone                             | AccessToken | 콘티 복제 (내 콘티로)                |
| POST   | /contis/:id/songs                             | AccessToken | 콘티에 찬양 추가                     |
| PATCH  | /contis/:id/songs/:songId                     | AccessToken | 콘티 곡 수정 (key·tempo·note)        |
| DELETE | /contis/:id/songs/:songId                     | AccessToken | 콘티에서 찬양 제거                   |
| PUT    | /contis/:id/songs/reorder                     | AccessToken | 콘티 곡 순서 변경                    |
| POST   | /contis/:id/songs/:contiSongId/sheet          | AccessToken | 임시악보 업로드 (multipart)          |
| DELETE | /contis/:id/songs/:contiSongId/sheet/:sheetId | AccessToken | 임시악보 개별 삭제                   |
| POST   | /contis/:id/share                             | AccessToken | 콘티를 채팅방에 공유                 |
| DELETE | /contis/:id/share/:roomId                     | AccessToken | 채팅방 공유 해제                     |

### Organizations — `/api/organizations`

| Method | Path                                          | 인증        | 설명                            |
| ------ | --------------------------------------------- | ----------- | ------------------------------- |
| GET    | /organizations                                | AccessToken | 내 팀 목록                      |
| POST   | /organizations                                | AccessToken | 팀 생성                         |
| GET    | /organizations/:id                            | AccessToken | 팀 단건 조회 (멤버 포함)        |
| DELETE | /organizations/:id                            | AccessToken | 팀 삭제 (방장만)                |
| POST   | /organizations/:id/invite                     | AccessToken | 초대 링크 생성 (24시간, 방장만) |
| POST   | /organizations/:id/invite-email               | AccessToken | 이메일로 초대 발송              |
| POST   | /organizations/join/:token                    | AccessToken | 초대 토큰으로 팀 가입           |
| GET    | /organizations/invites                        | AccessToken | 받은 초대 목록                  |
| POST   | /organizations/invites/:inviteId/accept       | AccessToken | 초대 수락                       |
| POST   | /organizations/invites/:inviteId/reject       | AccessToken | 초대 거절                       |
| DELETE | /organizations/:id/leave                      | AccessToken | 팀 나가기                       |
| DELETE | /organizations/:id/members/:memberId          | AccessToken | 멤버 추방 (방장만)              |
| PATCH  | /organizations/:id/members/:memberId/transfer | AccessToken | 방장 이전 (방장만)              |
| PATCH  | /organizations/:id/members/:memberId/sub-leader | AccessToken | 부방장 설정/해제 (방장만)     |

### Rooms — `/api/rooms`

| Method | Path                           | 인증        | 설명                                        |
| ------ | ------------------------------ | ----------- | ------------------------------------------- |
| POST   | /rooms                         | AccessToken | 채팅방 생성 (방장·부방장만)                 |
| GET    | /rooms?orgId=                  | AccessToken | 팀의 채팅방 목록                            |
| DELETE | /rooms/:id                     | AccessToken | 채팅방 삭제 (방장·부방장만)                 |
| GET    | /rooms/:id/messages            | AccessToken | 메시지 목록 + 메시지별 안읽음 인원 수 포함  |
| POST   | /rooms/:id/messages            | AccessToken | 메시지 전송 (content + fileUrl 선택사항)    |
| DELETE | /rooms/:id/messages/:messageId | AccessToken | 내 메시지 삭제                              |
| GET    | /rooms/:id/contis              | AccessToken | 해당 채팅방에 공유된 콘티 목록              |
| GET    | /rooms/:id/stream              | AccessToken | SSE — 방 단위 실시간 메시지 스트림          |
| GET    | /rooms/stream/org?orgId=       | AccessToken | SSE — 조직 단위 실시간 메시지 스트림        |

### Uploads — `/api/uploads`

| Method | Path     | 인증        | 설명                                       |
| ------ | -------- | ----------- | ------------------------------------------ |
| POST   | /uploads | AccessToken | 파일 업로드 → Supabase Storage URL 반환    |

### History — `/api/history`

| Method | Path          | 인증        | 설명                      |
| ------ | ------------- | ----------- | ------------------------- |
| POST   | /history      | AccessToken | 예배 히스토리 기록        |
| GET    | /history      | AccessToken | 내 히스토리 목록 조회     |
| GET    | /history/:id  | AccessToken | 히스토리 단건 조회        |
| DELETE | /history/:id  | AccessToken | 히스토리 삭제             |

### Health

| Method | Path    | 설명           |
| ------ | ------- | -------------- |
| GET    | /health | 서버 상태 확인 |

---

## Redis 키 구조

| 키                     | 값                 | TTL    |
| ---------------------- | ------------------ | ------ |
| `refresh:{userId}`     | bcrypt 해시된 토큰 | 30일   |
| `email_verify:{token}` | userId             | 24시간 |

---

## DB 주의사항

- `prisma db push`는 Supabase pooler(6543)에서 실패 → Node `pg`로 직접 DDL 후 `npx prisma generate`
- FK 컬럼 타입은 `UUID` 사용 (TEXT 사용 시 FK constraint 오류)
- RLS는 활성화 + policy 없이 설정 (Prisma 서버는 postgres 슈퍼유저로 RLS 우회)
- Spotify `audio-features` API는 2024년 이후 신규 앱에서 차단됨 → BPM은 수동 입력

수동으로 추가해야 하는 컬럼/테이블:

```sql
-- 찬양 말씀 구절
ALTER TABLE songs ADD COLUMN IF NOT EXISTS scripture_ref TEXT;

-- 사용자 role
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- FCM 토큰
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- 채팅 읽음 추적
CREATE TABLE IF NOT EXISTS room_reads (
  room_id UUID NOT NULL,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
ALTER TABLE room_reads ENABLE ROW LEVEL SECURITY;
```
