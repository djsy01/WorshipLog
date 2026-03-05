# WorshipLog – 예배 콘티 큐레이션 플랫폼

> 개인 및 팀을 위한 **찬양 콘티 기록 및 큐레이션 툴**
> **성경 말씀과 키워드** 기반 찬양 추천
> **악보 업로드 및 PDF 출력**을 통한 팀 협업 중심

---

## 프로젝트 개요

찬양 인도자, 예배자, 교회 공동체를 위한 예배 콘티 관리 플랫폼입니다.
팀/개인이 예배 콘티를 구성하고, 찬양과 말씀을 연결하며, 팀과 공유할 수 있습니다.

---

## 핵심 기능

- **찬양 검색 및 추천** — 곡명/키워드 검색, 랜덤 성경 구절 기반 큐레이션, 유튜브·멜론 링크 연결
- **콘티 생성 및 관리** — Key, Tempo, 송폼 입력, PDF 출력 (A4 기준)
- **악보 업로드** — PDF/이미지 악보 업로드, Key/Tempo/송폼 자동 표기
- **팀 기능** — 팀 생성/초대 (QR or 링크), 팀별 콘티 저장
- **히스토리** — 개인/팀 예배 콘티 히스토리, 예배 일자별 분류
- **커뮤니티** — 말씀 랜덤 추천, 묵상 공유

---

## 기술 스택

| 항목         | 기술                                        | 문서                         |
| ------------ | ------------------------------------------- | ---------------------------- |
| 프론트엔드   | Next.js 15 + TypeScript + Tailwind CSS      | [Client](./client/README.md) |
| 백엔드       | NestJS + TypeScript + Prisma + Redis        | [Server](./server/README.md) |
| 데이터베이스 | PostgreSQL (Supabase) + Redis               |                              |
| 어플리케이션 | Flutter (Android 우선)                      | [App](./app/README.md)       |
| 배포         | Vercel (프론트) + Render/Railway (백엔드)   |                              |
| 기타         | Supabase Storage, 유튜브 API, QR코드, jsPDF |                              |

---

## 디렉토리 구조

```text
WorshipLog/
├── server/             # 백엔드 (NestJS) ✅
├── client/             # 프론트엔드 (Next.js) — 예정
├── app/                # 모바일 앱 (Flutter) — 예정
├── supabase/           # DB 마이그레이션 & RLS 정책 ✅
│   └── migrations/
├── docs/
│   └── plan.md         # 프로젝트 계획서
└── README.md
```

---

## 개발 현황

| Phase   | 내용                                 | 상태      |
| ------- | ------------------------------------ | --------- |
| Phase 1 | DB 스키마 + NestJS 초기화 + 인증 API | ✅        |
| Phase 2 | Next.js + 찬양 검색 + 콘티 생성      | 진행 예정 |
| Phase 3 | 팀 초대 + 히스토리 + 커뮤니티        | 예정      |
| Phase 4 | Flutter 앱 + 최종 배포               | 예정      |

> 자세한 일정은 [docs/plan.md](./docs/plan.md) 참고

---

## 향후 기능 아이디어

- 추천 알고리즘 고도화 (말씀 주제 기반 추천 정확도 향상)
- 공개 콘티 마켓 (다른 팀 콘티 열람 및 참고)
- 일정 기반 콘티 알림, 예배 준비 체크리스트
- PWA (모바일 환경 최적화)
