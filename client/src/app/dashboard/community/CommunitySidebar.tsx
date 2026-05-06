import { useState } from 'react';

export const SECTIONS = [
  {
    key: 'general',
    label: '일반',
    categories: [
      { key: 'free', label: '자유게시판' },
      { key: 'meditation', label: '묵상나눔' },
      { key: 'prayer', label: '기도제목' },
      { key: 'testimony', label: '간증나눔' },
      { key: 'sheets', label: '악보/자료' },
    ],
  },
  {
    key: 'instrument',
    label: '악기별',
    categories: [
      { key: 'leader', label: '찬양팀 인도자' },
      { key: 'singer', label: '싱어' },
      { key: 'keyboard_main', label: '메인건반' },
      { key: 'keyboard_second', label: '세컨건반' },
      { key: 'electric', label: '일렉' },
      { key: 'bass', label: '베이스' },
      { key: 'acoustic', label: '어쿠스틱' },
      { key: 'drums', label: '드럼' },
    ],
  },
  {
    key: 'team',
    label: '팀별',
    categories: [
      { key: 'worship_team', label: '예배팀' },
      { key: 'broadcast_team', label: '방송팀' },
    ],
  },
];

interface CommunitySidebarProps {
  selected: string;
  onSelect: (key: string) => void;
}

export function CommunitySidebar({ selected, onSelect }: CommunitySidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    general: true,
    instrument: true,
    team: true,
  });

  return (
    <nav className="py-3">
      {SECTIONS.map((section) => (
        <div key={section.key} className="mb-1">
          <button
            onClick={() => setOpenSections((prev) => ({ ...prev, [section.key]: !prev[section.key] }))}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <span>{section.label}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="11"
              height="11"
              fill="currentColor"
              viewBox="0 0 16 16"
              className={`transition-transform ${openSections[section.key] ? '' : '-rotate-90'}`}
            >
              <path
                fillRule="evenodd"
                d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"
              />
            </svg>
          </button>
          {openSections[section.key] && (
            <ul>
              {section.categories.map((cat) => (
                <li key={cat.key}>
                  <button
                    onClick={() => onSelect(cat.key)}
                    className={`w-full text-left px-5 py-2 text-sm transition ${
                      selected === cat.key
                        ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 font-semibold border-r-2 border-violet-500'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );
}
