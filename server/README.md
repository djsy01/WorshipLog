# WorshipLog – Server (NestJS)

NestJS + TypeScript REST API server

---

## Tech Stack

| Item      | Technology                        |
| --------- | --------------------------------- |
| Framework | NestJS                            |
| Language  | TypeScript                        |
| ORM       | Prisma                            |
| Database  | PostgreSQL (Supabase)             |
| Cache     | Redis (JWT Refresh Token storage) |
| Auth      | JWT (Access 15m + Refresh 7d)     |

---

## Directory Structure

```text
server/src/
├── auth/                   # Register, Login, Logout, Token refresh
│   ├── dto/                # RegisterDto, LoginDto
│   └── strategies/         # jwt.strategy, jwt-refresh.strategy
├── common/
│   ├── guards/             # JwtAuthGuard, JwtRefreshGuard
│   ├── decorators/         # @CurrentUser
│   └── data/
│       └── bible.json      # Full Bible (66 books, ~7MB)
├── health/                 # GET /api/health
├── prisma/                 # PrismaService
├── redis/                  # RedisService
├── users/                  # User CRUD (WIP)
├── app.module.ts
└── main.ts
```

---

## Environment Variables

Create `server/.env`:

```env
DATABASE_URL=postgresql://...

JWT_ACCESS_SECRET=your_access_secret
JWT_ACCESS_EXPIRES_IN=15m

JWT_REFRESH_SECRET=your_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

REDIS_HOST=localhost
REDIS_PORT=6379

CLIENT_URL=http://localhost:3001
PORT=3000
```

---

## Running the Server

```bash
npm install           # install dependencies
npm run start:dev     # development (hot reload)
npm run build         # production build
npm run start:prod    # production run
```

## Tests

```bash
npm run test        # unit tests
npm run test:e2e    # e2e tests
npm run test:cov    # coverage
```

---

## API Endpoints

> All routes are prefixed with `/api`

### Auth — `/api/auth`

| Method | Path                | Auth          | Description                             |
| ------ | ------------------- | ------------- | --------------------------------------- |
| POST   | /api/auth/register  | -             | Register with email, password, name     |
| POST   | /api/auth/login     | -             | Login → accessToken + refreshToken      |
| POST   | /api/auth/logout    | AccessToken   | Delete refreshToken from Redis          |
| POST   | /api/auth/refresh   | RefreshToken  | Reissue accessToken + refreshToken      |

### Health

| Method | Path        | Description         |
| ------ | ----------- | ------------------- |
| GET    | /api/health | Server health check |

> Songs, Contis, Teams, History, Community, Bible endpoints — coming soon
