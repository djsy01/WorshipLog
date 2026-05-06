import { CommunityPost } from '@/lib/api';
import { useRef, useEffect } from 'react';

interface TeamChatTabProps {
  messages: CommunityPost[];
  loading: boolean;
  chatInput: string;
  onChatInputChange: (text: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  sending: boolean;
  chatFile: File | null;
  chatFilePreview: string | null;
  chatFileError: string | null;
  onChatFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveChatFile: () => void;
  chatFileInputRef: React.RefObject<HTMLInputElement>;
  onDeleteMessage: (msgId: string) => void;
  myUserId: string;
}

export function TeamChatTab({
  messages,
  loading,
  chatInput,
  onChatInputChange,
  onSendMessage,
  sending,
  chatFile,
  chatFilePreview,
  chatFileError,
  onChatFileChange,
  onRemoveChatFile,
  chatFileInputRef,
  onDeleteMessage,
  myUserId,
}: TeamChatTabProps) {
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex-1 overflow-y-auto space-y-3 max-h-96">
        {loading && <div className="py-4 text-center text-sm text-gray-400">로딩 중...</div>}
        {!loading && messages.length === 0 && <div className="py-8 text-center text-sm text-gray-500">메시지가 없습니다.</div>}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.userId === myUserId ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs rounded-lg px-4 py-2 text-sm ${
                msg.userId === myUserId ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
              }`}
            >
              {msg.content && <p>{msg.content}</p>}
              {msg.fileUrl && (
                <a
                  href={msg.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-block text-xs underline ${msg.userId === myUserId ? 'text-violet-200' : 'text-violet-600'}`}
                >
                  파일 보기
                </a>
              )}
              {msg.userId === myUserId && (
                <button onClick={() => onDeleteMessage(msg.id)} className="ml-2 text-xs opacity-70 hover:opacity-100">
                  삭제
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      <form onSubmit={onSendMessage} className="space-y-2">
        {chatFileError && <div className="rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">{chatFileError}</div>}
        {chatFilePreview && (
          <div className="relative h-24 w-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <img src={chatFilePreview} alt="preview" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={onRemoveChatFile}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
              </svg>
            </button>
          </div>
        )}
        {chatFile && !chatFilePreview && (
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
            <span className="text-xs text-gray-700 dark:text-gray-300">{chatFile.name}</span>
            <button type="button" onClick={onRemoveChatFile} className="text-xs text-gray-500 hover:text-gray-700">
              ×
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => onChatInputChange(e.target.value)}
            placeholder="메시지 입력..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
          />
          <label className="rounded-lg bg-gray-200 p-2 cursor-pointer hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393" />
            </svg>
            <input ref={chatFileInputRef} type="file" onChange={onChatFileChange} className="hidden" />
          </label>
          <button
            type="submit"
            disabled={sending || (!chatInput.trim() && !chatFile)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {sending ? '...' : '전송'}
          </button>
        </div>
      </form>
    </div>
  );
}
