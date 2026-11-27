import { safeAttachmentUrl } from '@/lib/attachment-url';

interface Props {
  currentUrl?: string | null;
  sheetFile: File | null;
  onSheetFileChange: (file: File | null) => void;
  onSheetRemove: () => Promise<void>;
  sheetRemoving: boolean;
}

export function SongSheetInput({ currentUrl, sheetFile, onSheetFileChange, onSheetRemove, sheetRemoving }: Props) {
  const sheetUrl = safeAttachmentUrl(currentUrl);
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">악보 (PDF / 이미지)</p>
      {currentUrl && !sheetFile && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2">
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-xs text-violet-600 dark:text-violet-400 hover:underline"
            >
              현재 악보 보기
            </a>
          )}
          <button
            type="button"
            onClick={onSheetRemove}
            disabled={sheetRemoving}
            className="shrink-0 text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
          >
            {sheetRemoving ? '...' : '삭제'}
          </button>
        </div>
      )}
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 px-3 py-2 text-xs text-gray-500 dark:text-gray-400 hover:border-violet-400 hover:text-violet-600 dark:hover:border-violet-500 dark:hover:text-violet-400 transition">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5" />
          <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z" />
        </svg>
        {sheetFile ? sheetFile.name : currentUrl ? '악보 교체' : '악보 업로드'}
        <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => onSheetFileChange(e.target.files?.[0] ?? null)} />
      </label>
      {sheetFile && (
        <button type="button" onClick={() => onSheetFileChange(null)} className="text-xs text-gray-400 hover:text-gray-600">
          선택 취소
        </button>
      )}
    </div>
  );
}
