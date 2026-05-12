# WorshipLog – Client (Next.js)

Next.js 15 + TypeScript + Tailwind CSS v4 기반 프론트엔드

---

## 기술 스택

| 항목      | 기술                                                          |
| --------- | ------------------------------------------------------------- |
| Framework | Next.js 15 (App Router)                                       |
| Language  | TypeScript                                                    |
| Style     | Tailwind CSS v4                                               |
| Font      | Geist (Vercel)                                                |
| 다크모드  | class 기반 (`html.dark`) — 시스템 `prefers-color-scheme` 자동 적용 |

---

## 디렉토리 구조

```text
client/src/
├── app/
│   ├── layout.tsx                  # 루트 레이아웃 (FOUC 방지 테마 스크립트)
│   ├── page.tsx                    # / → /dashboard 리다이렉트
│   ├── globals.css                 # Tailwind + dark variant + html 배경색 (오버스크롤)
│   ├── icon.svg                    # 파비콘
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── verify-email/
│   │       ├── page.tsx            # 이메일 인증 안내 + 재발송
│   │       └── confirm/page.tsx    # 인증 토큰 처리 → 대시보드 이동
│   └── dashboard/
│       ├── page.tsx                # 메인 대시보드
│       ├── guide/page.tsx          # 사용 가이드 (아코디언)
│       ├── songs/page.tsx          # 찬양 검색/관리
│       ├── contis/
│       │   ├── page.tsx            # 콘티 목록
│       │   └── [id]/page.tsx       # 콘티 상세/편집
│       ├── team/                   # 팀스페이스
│       │   ├── page.tsx
│       │   ├── TeamChatTab.tsx     # 채팅 (버블 UI, 안읽음, 이미지 인라인)
│       │   ├── TeamContiTab.tsx    # 공유 콘티 목록
│       │   ├── TeamDetailPanel.tsx
│       │   ├── TeamList.tsx
│       │   └── ...모달들
│       ├── community/page.tsx      # 커뮤니티 게시판
│       ├── meditation/page.tsx     # 말씀 묵상
│       └── history/page.tsx        # 예배 히스토리
├── components/
│   ├── AppHeader.tsx               # 공통 헤더 (로그아웃)
│   └── ServerWakeup.tsx            # 서버 슬립 해제 로딩 화면
└── lib/
    └── api/                        # API 클라이언트 모듈
        ├── index.ts                # 공통 request 헬퍼 + 전체 export
        ├── orgs.ts                 # orgsApi, roomsApi, Message 타입
        ├── community.ts            # communityApi
        └── ...
```

---

## 환경 변수

`client/.env.local`:

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

| localStorage 키 | 내용                       |
| --------------- | -------------------------- |
| `accessToken`   | JWT Access Token (15분)    |
| `refreshToken`  | JWT Refresh Token (30일)   |
| `user`          | `{ id, email, name }` JSON |

---

## 구현된 주요 기능

### 찬양 페이지 (`/dashboard/songs`)

- 곡명 / 아티스트 / 말씀 구절 검색
- **초성·알파벳 카테고리 사이드바** — 한글(ㄱ~ㅎ) / 영어(A~Z), 섹션 접기/펼치기
- **가나다순 정렬** + 페이지네이션 (20곡씩)
- **Spotify 자동완성** — 곡명 검색 시 제목·아티스트·BPM 자동 입력
- **오늘의 말씀 카드** — 구절 클릭 시 관련 찬양 검색
- 찬양 카드 클릭 → **상세 모달** (가사 스크롤, 말씀 배지 클릭 검색, 수정/삭제)
- 찬양 추가/수정 모달:
  - 기본 정보 (제목·아티스트·키·BPM·말씀구절·가사)
  - **악보 업로드 섹션** — 현재 악보 보기/삭제 + PDF·이미지 업로드
- **관리자 role** — admin은 전체 곡 수정·삭제, 일반 유저는 본인 곡만

### 콘티 상세 페이지 (`/dashboard/contis/[id]`)

- 찬양 추가·삭제·순서 변경, Key·Tempo·송폼 개별 설정
- **악보 이중 구조**
  - 기본악보 (`song.sheetMusicUrl`) — 콘티에 임시악보 없을 때 자동 표시
  - 임시악보 (`conti_song_sheets`) — 콘티 전용, 추가·장별 삭제 자유
  - 배지: `기본악보` / `임시악보 N장`
- **PDF 저장** — 임시악보 우선, 없으면 기본악보 fallback 자동 적용
- **공유하기** — 모바일: Web Share API / 데스크탑: URL 클립보드 복사
- **팀 공유** — 소유자만 팀 채팅방 선택 모달로 콘티 공유/해제
- **콘티 복제** — 타인 콘티를 내 콘티로 복사 (본인 콘티는 버튼 숨김)

### 팀스페이스 (`/dashboard/team`)

- 2단 레이아웃 (팀 목록 좌측 + 콘텐츠 우측)
- 팀 생성 / 초대 링크 (24시간) / QR코드 / 이메일 초대 / 팀 참여
- 방장: 멤버 추방, 방장 이전, 부방장 설정 / 일반: 팀 나가기
- **채팅 탭** — 채팅방별 메시지
  - 날짜 구분선 (`yyyy-mm-dd`), 시간 표시 (`HH:MM`)
  - 이미지 인라인 표시, 일반 파일 링크
  - **안읽음 인원 수 노란색 표시** (카톡 스타일, 서버 기반 집계)
  - 안읽음 메시지 구분선 (`N개의 읽지 않은 메시지`)
  - 메시지 검색
  - 파일 첨부 (최대 50MB)
- **콘티 공유 탭** — 해당 채팅방에 공유된 콘티 목록 (2열 그리드)

### 말씀 묵상 (`/dashboard/meditation`)

- 오늘의 말씀 표시 + 랜덤 말씀 추천
- 묵상 기록 / 목록 조회
- 묵상 완료 시 커뮤니티 묵상나눔 카테고리로 자동 이동

### 히스토리 (`/dashboard/history`)

- 예배 콘티 사용 기록 목록 조회
- 날짜별 표시

### 사용 가이드 (`/dashboard/guide`)

- 아코디언 방식 (섹션 클릭으로 펼침/접힘)
- 찬양 관리 / 콘티 작성 / 팀스페이스 / 말씀 묵상 4개 섹션

---

## API 엔드포인트 연결

서버 API 문서: [server/README.md](../server/README.md)
