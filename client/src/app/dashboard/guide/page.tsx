'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppHeader from '@/components/AppHeader';

const SECTIONS = [
  {
    id: 'songs',
    icon: '🎵',
    title: '찬양 관리',
    color: 'orange',
    steps: [
      {
        title: '찬양 추가하기',
        desc: '찬양검색 페이지에서 [+ 새 찬양 추가] 버튼을 눌러 곡명, 아티스트, 키, 템포, 가사, 말씀 구절을 입력합니다.',
      },
      {
        title: '찬양 검색하기',
        desc: '검색창에 곡명, 아티스트, 또는 말씀 구절(예: 시 23)을 입력하면 해당 곡들이 필터링됩니다.',
      },
      {
        title: '악보 업로드',
        desc: '찬양 카드에서 [악보 업로드] 버튼으로 이미지(JPG, PNG, WEBP) 또는 PDF 파일을 첨부할 수 있습니다.',
      },
      {
        title: '찬양 수정 / 삭제',
        desc: '내가 등록한 찬양만 수정·삭제할 수 있습니다. 카드의 편집 아이콘을 눌러 정보를 변경하세요.',
      },
    ],
  },
  {
    id: 'contis',
    icon: '📋',
    title: '콘티 작성',
    color: 'violet',
    steps: [
      {
        title: '콘티 만들기',
        desc: '콘티 페이지에서 [+ 새 콘티] 버튼을 누르고 제목과 예배 날짜를 입력합니다.',
      },
      {
        title: '찬양 추가 및 순서 변경',
        desc: '[+ 찬양 추가] 버튼으로 곡을 검색해 콘티에 넣고, 각 곡마다 이 콘티에서 사용할 키와 송폼(간주 후 반복 등)을 설정할 수 있습니다. ▲▼ 버튼으로 순서를 조정하세요.',
      },
      {
        title: '악보 여러 장 첨부',
        desc: '각 찬양마다 [+ 악보] 버튼으로 악보를 여러 장 추가할 수 있습니다. 악보가 있으면 [악보 N장] 버튼으로 펼쳐보고, 장별로 개별 삭제도 가능합니다.',
      },
      {
        title: 'PDF 저장 / 인쇄',
        desc: '[PDF 저장] 버튼을 누르면 브라우저 인쇄 창이 열립니다. "PDF로 저장"을 선택하면 콘티 전체가 A4 PDF로 저장됩니다. 모바일인 경우에는 크기 조절은 79%를 권장합니다.',
      },
      {
        title: '팀 공유',
        desc: '콘티 상단의 [팀 공유] 버튼으로 소속 팀에 콘티를 공개할 수 있습니다. 공유된 콘티는 팀원 누구나 조회할 수 있습니다.',
      },
    ],
  },
  {
    id: 'team',
    icon: '👥',
    title: '팀스페이스',
    color: 'blue',
    steps: [
      {
        title: '팀 만들기',
        desc: '팀스페이스 페이지에서 [+ 새 팀 만들기]로 팀을 생성합니다. 팀 이름과 설명을 입력하세요.',
      },
      {
        title: '팀원 초대',
        desc: '팀 상세 페이지에서 [초대 링크 생성]을 누르면 7일 유효한 초대 링크가 만들어집니다. 링크를 카카오톡 등으로 공유하면 상대방이 팀에 가입할 수 있습니다.',
      },
      {
        title: '공유된 콘티 보기',
        desc: '팀원이 공유한 콘티는 팀 페이지 하단 [공유된 콘티] 섹션에서 확인할 수 있습니다.',
      },
      {
        title: '커뮤니티 채팅',
        desc: '팀 페이지의 커뮤니티에서 팀원과 실시간으로 메시지를 주고받을 수 있습니다.',
      },
    ],
  },
  {
    id: 'meditation',
    icon: '📖',
    title: '말씀 묵상',
    color: 'green',
    steps: [
      {
        title: '오늘의 말씀',
        desc: '대시보드 상단에 매일 새로운 성경 구절이 표시됩니다. 로그인하지 않아도 랜덤 구절을 볼 수 있습니다.',
      },
      {
        title: '묵상 기록하기',
        desc: '말씀 묵상 페이지에서 성경 책·장·절을 선택하고, 해당 말씀을 읽으며 느낀 점을 자유롭게 기록합니다.',
      },
      {
        title: '묵상 목록 확인',
        desc: '기록한 묵상은 목록에서 날짜순으로 확인할 수 있으며, 수정과 삭제도 가능합니다.',
      },
    ],
  },
];

const COLOR_MAP: Record<string, { bg: string; ring: string; badge: string; num: string }> = {
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    ring: 'ring-orange-200 dark:ring-orange-800/50',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    num: 'bg-orange-200 text-orange-700 dark:bg-orange-800 dark:text-orange-300',
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    ring: 'ring-violet-200 dark:ring-violet-800/50',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    num: 'bg-violet-200 text-violet-700 dark:bg-violet-800 dark:text-violet-300',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    ring: 'ring-blue-200 dark:ring-blue-800/50',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    num: 'bg-blue-200 text-blue-700 dark:bg-blue-800 dark:text-blue-300',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    ring: 'ring-green-200 dark:ring-green-800/50',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    num: 'bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-300',
  },
};

export default function GuidePage() {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>('songs');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppHeader page="사용 가이드" />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-violet-600 dark:hover:text-violet-400"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path
              fillRule="evenodd"
              d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"
            />
          </svg>
          뒤로가기
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">사용 가이드</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">WorshipLog의 주요 기능을 단계별로 안내합니다.</p>
        </div>

        <div className="space-y-3">
          {SECTIONS.map((section) => {
            const c = COLOR_MAP[section.color];
            const isOpen = open === section.id;
            return (
              <div key={section.id} className={`rounded-2xl ring-1 ${c.ring} overflow-hidden`}>
                <button
                  onClick={() => setOpen(isOpen ? null : section.id)}
                  className={`flex w-full items-center justify-between px-5 py-4 text-left transition ${c.bg}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{section.icon}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{section.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.badge}`}>{section.steps.length}단계</span>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="divide-y divide-gray-100 bg-white px-5 dark:divide-gray-800 dark:bg-gray-900">
                    {section.steps.map((step, i) => (
                      <div key={step.title} className="flex gap-4 py-4">
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${c.num}`}>
                          {i + 1}
                        </span>
                        <div>
                          <p className="mb-0.5 text-sm font-semibold text-gray-800 dark:text-gray-200">{step.title}</p>
                          <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl bg-violet-600 p-6 text-center text-white">
          <p className="mb-1 text-lg font-bold">시작할 준비가 됐나요?</p>
          <p className="mb-4 text-sm text-violet-200">찬양을 등록하는 것부터 시작해보세요.</p>
          <button
            onClick={() => router.push('/dashboard/songs')}
            className="rounded-xl bg-white px-5 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50"
          >
            찬양 등록하러 가기
          </button>
        </div>
      </main>
    </div>
  );
}
