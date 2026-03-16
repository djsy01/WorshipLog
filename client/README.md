# WorshipLog – Client (Next.js)

Next.js 15 + TypeScript + Tailwind CSS v4 기반 프론트엔드

---

## 기술 스택

| 항목      | 기술                             |
| --------- | -------------------------------- |
| Framework | Next.js 15 (App Router)          |
| Language  | TypeScript                       |
| Style     | Tailwind CSS v4                  |
| Font      | Geist (Vercel)                   |
| 다크모드  | class 기반 (시스템 `prefers-color-scheme` 자동 적용) |

---

## 디렉토리 구조

```text
client/src/
├── app/
│   ├── layout.tsx              # 루트 레이아웃 (FOUC 방지 테마 스크립트 포함)
│   ├── page.tsx                # / → /dashboard 리다이렉트
│   ├── globals.css             # Tailwind + dark variant 설정
│   ├── icon.svg                # 파비콘 (Prism 로고, Next.js 자동 인식)
│   ├── (auth)/
│   │   ├── layout.tsx          # 인증 페이지 공통 레이아웃 (중앙 정렬)
│   │   ├── login/page.tsx      # 로그인 (Prism 로고 포함)
│   │   ├── register/page.tsx   # 회원가입 (Prism 로고 포함)
│   │   └── verify-email/
│   │       ├── page.tsx        # 이메일 인증 안내 + 재발송
│   │       └── confirm/page.tsx # 인증 토큰 처리 → 대시보드 이동
│   └── dashboard/
│       ├── page.tsx            # 메인 대시보드 (인증 필요)
│       ├── songs/
│       │   └── page.tsx        # 찬양 목록/검색/추가/수정/삭제
│       ├── contis/
│       │   ├── page.tsx        # 콘티 목록
│       │   └── [id]/page.tsx   # 콘티 상세/편집 (악보 뷰어, PDF 출력, 공유, 팀 공유)
│       └── team/
│           └── page.tsx        # 팀스페이스 (팀 목록 + 채팅 + 콘티 공유 탭)
├── components/
│   ├── AppHeader.tsx           # 공통 헤더 (로그아웃)
│   └── ServerWakeup.tsx        # 서버 슬립 해제 로딩 화면 (Render cold start 대응)
└── lib/
    └── api.ts                  # API 클라이언트 (authApi, songsApi, bibleApi, spotifyApi, contisApi, teamsApi)
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

---

## 구현된 주요 기능

### 찬양 페이지 (`/dashboard/songs`)

- 찬양 목록 조회 (곡명 / 아티스트 / 말씀 구절 검색)
- **Spotify 자동완성** — 곡 검색 시 제목·아티스트 자동 입력
- **오늘의 말씀 카드** — 구절 클릭 시 관련 찬양 검색
- 찬양 추가 / **수정** (연필 아이콘) / 삭제 (휴지통 아이콘)
- 성경구절 여러 개 입력 가능 (예: "시 23:1, 빌 4:13")

### 콘티 상세 페이지 (`/dashboard/contis/[id]`)

- 곡 추가/삭제/순서 변경, Key·송폼 설정
- **악보 인라인 뷰어** — PDF는 iframe, 이미지는 img로 카드 하단에 인라인 표시
- **PDF 저장** — `window.print()` 전용 레이아웃, 모바일은 80% 축소 출력
- **공유하기** — 모바일: Web Share API, 데스크탑: URL 클립보드 복사 ("복사됨!" 2초)
- **팀 공유** — 소유자만 팀 선택 모달로 콘티 공유/해제

### 팀스페이스 (`/dashboard/team`)

- 2단 레이아웃 (팀 목록 좌측 + 콘텐츠 우측)
- 팀 생성 / 초대 링크 생성(24시간) / 팀 참여
- 방장: 멤버 추방, 방장 이전 / 일반: 팀 나가기
- **커뮤니티 탭** — 카카오톡 스타일 채팅 버블, 날짜 구분선, 메시지 삭제
- **콘티 공유 탭** — 해당 팀에 공유된 콘티 목록 (2열 그리드)

---

## API 엔드포인트 연결

서버 API 문서: [server/README.md](../server/README.md)
