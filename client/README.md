# WorshipLog – Client (Next.js)

Next.js 16 + TypeScript + Tailwind CSS v4 기반 프론트엔드

---

## 기술 스택

| 항목      | 기술                          |
| --------- | ----------------------------- |
| Framework | Next.js 16 (App Router)       |
| Language  | TypeScript                    |
| Style     | Tailwind CSS v4               |
| Font      | Geist (Vercel)                |
| 다크모드  | class 기반 (`localStorage` 저장) |

---

## 디렉토리 구조

```text
client/src/
├── app/
│   ├── layout.tsx              # 루트 레이아웃 (FOUC 방지 테마 스크립트 포함)
│   ├── page.tsx                # / → /dashboard 리다이렉트
│   ├── globals.css             # Tailwind + dark variant 설정
│   ├── (auth)/
│   │   ├── layout.tsx          # 인증 페이지 공통 레이아웃 (중앙 정렬 + ThemeToggle)
│   │   ├── login/page.tsx      # 로그인
│   │   ├── register/page.tsx   # 회원가입
│   │   └── verify-email/
│   │       ├── page.tsx        # 이메일 인증 안내 + 재발송
│   │       └── confirm/page.tsx # 인증 토큰 처리 → 대시보드 이동
│   └── dashboard/
│       └── page.tsx            # 메인 대시보드 (인증 필요)
├── components/
│   └── ThemeToggle.tsx         # 라이트/다크 모드 전환 버튼
└── lib/
    └── api.ts                  # API 클라이언트 (authApi)
```

---

## 환경 변수

`client/.env.local` 파일 생성:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

## 실행 방법

```bash
npm install
npm run dev      # http://localhost:3001
npm run build
npm run start
```

---

## 인증 플로우

```text
회원가입 → 이메일 발송 → /verify-email (안내 + 재발송)
                              ↓
                    이메일 링크 클릭
                              ↓
               /verify-email/confirm?token=xxx
                              ↓
               JWT 저장 (localStorage) → /dashboard
```

| localStorage 키 | 내용                     |
| --------------- | ------------------------ |
| `accessToken`   | JWT Access Token (15분)  |
| `refreshToken`  | JWT Refresh Token (7일)  |
| `user`          | `{ id, email, name }` JSON |
| `theme`         | `"light"` \| `"dark"`   |

---

## API 엔드포인트 연결

서버 API 문서: [server/README.md](../server/README.md)
