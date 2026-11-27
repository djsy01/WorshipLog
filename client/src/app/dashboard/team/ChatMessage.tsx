import type { Message } from '@/lib/api';
import { safeAttachmentUrl } from '@/lib/attachment-url';

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
}

function ChatAttachment({ url, isMine }: { url: string; isMine: boolean }) {
  const linkClass = isMine ? 'text-violet-200' : 'text-violet-600';
  if (isImageUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt="첨부 이미지" className="mt-1 max-w-50 rounded-lg" />
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={'inline-block text-xs underline ' + linkClass}>
      파일 보기
    </a>
  );
}

interface Props {
  msg: Message;
  isMine: boolean;
  onDelete: (messageId: string) => void;
}

export function ChatMessage({ msg, isMine, onDelete }: Props) {
  const fileUrl = safeAttachmentUrl(msg.fileUrl);
  return (
    <div className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
      {isMine ? (
        <div className="flex items-end gap-1.5">
          <div className="group flex items-center gap-1">
            <button
              onClick={() => onDelete(msg.id)}
              className="hidden group-hover:block text-xs text-gray-400 hover:text-red-500 shrink-0"
            >
              삭제
            </button>
            <div className="flex flex-col items-end gap-0.5">
              <div className="max-w-xs rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">
                {msg.content && <p>{msg.content}</p>}
                {fileUrl && <ChatAttachment url={fileUrl} isMine={isMine} />}
              </div>
              <div className="flex items-center gap-1">
                {msg.unreadCount > 0 && (
                  <span className="text-xs font-semibold text-yellow-400">{msg.unreadCount}</span>
                )}
                <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-0.5">
          <span className="ml-1 text-xs text-gray-400">{msg.user.name}</span>
          <div className="flex items-end gap-1">
            <div className="max-w-xs rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100">
              {msg.content && <p>{msg.content}</p>}
              {fileUrl && <ChatAttachment url={fileUrl} isMine={isMine} />}
            </div>
            <div className="flex flex-col items-start gap-0.5 pb-0.5">
              {msg.unreadCount > 0 && (
                <span className="text-xs font-semibold text-yellow-400">{msg.unreadCount}</span>
              )}
              <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
