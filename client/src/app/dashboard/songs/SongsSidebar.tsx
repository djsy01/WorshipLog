import { useState } from 'react';

const CAT_SECTIONS = [
  { key: 'ko', label: '한글', items: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅎ'] },
  {
    key: 'en',
    label: '영어',
    items: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  },
];

export function SidebarContent({ selected, onSelect }: { selected: string | null; onSelect: (cat: string | null) => void }) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ ko: true, en: false });
  return (
    <nav className="py-3">
      <button
        onClick={() => onSelect(null)}
        className={`w-full text-left px-5 py-2 text-sm transition ${
          selected === null
            ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 font-semibold border-r-2 border-violet-500'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
        }`}
      >
        전체
      </button>
      {CAT_SECTIONS.map((section) => (
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
              {section.items.map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => onSelect(selected === cat ? null : cat)}
                    className={`w-full text-left px-5 py-2 text-sm transition ${
                      selected === cat
                        ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 font-semibold border-r-2 border-violet-500'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {cat}
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
