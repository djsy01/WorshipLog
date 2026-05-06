function formatMonthLabel(key: string) {
  const [y, m] = key.split('-');
  return `${y}년 ${Number(m)}월`;
}

interface MonthSidebarProps {
  months: string[];
  selected: string;
  onSelect: (key: string) => void;
  counts: Record<string, number>;
}

export function MonthSidebar({ months, selected, onSelect, counts }: MonthSidebarProps) {
  if (months.length === 0) return null;

  return (
    <nav className="py-3">
      <p className="px-4 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">기간별</p>
      <ul>
        {months.map((key) => (
          <li key={key}>
            <button
              onClick={() => onSelect(key)}
              className={`w-full flex items-center justify-between px-5 py-2.5 text-sm transition ${
                selected === key
                  ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 font-semibold border-r-2 border-violet-500'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span>{formatMonthLabel(key)}</span>
              <span
                className={`text-xs rounded-full px-1.5 py-0.5 ${
                  selected === key
                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}
              >
                {counts[key]}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
