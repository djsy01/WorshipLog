'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { roomsApi, uploadApi, type Message } from '@/lib/api';

interface Props {
  roomId: string;
  token: string;
  messages: Message[];
  loading: boolean;
  myUserId: string;
  onNewMessage: (msg: Message) => void;
  onDeleteMessage: (msgId: string) => void;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
}

type RenderItem =
  | { kind: 'date'; label: string; key: string }
  | { kind: 'unread'; count: number; key: string }
  | { kind: 'msg'; msg: Message };

export function TeamChatTab({ roomId, token, messages, loading, myUserId, onNewMessage, onDeleteMessage }: Props) {
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initializedRoomRef = useRef<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSeenAt, setLastSeenAt] = useState<Date | null>(null);
  // 방 입장 시: 이전 읽은 시각 캡처 → 현재 시각으로 업데이트
  // Strict Mode 이중 실행 방지: 같은 roomId에 대해 한 번만 실행
  useEffect(() => {
    if (initializedRoomRef.current === roomId) return;
    initializedRoomRef.current = roomId;

    setSearchOpen(false);
    setSearchQuery('');
    const key = `chatLastSeen_${roomId}`;
    const stored = localStorage.getItem(key);
    setLastSeenAt(stored ? new Date(stored) : null);
    localStorage.setItem(key, new Date().toISOString());
  }, [roomId]);

  // 검색 중이 아닐 때만 자동 스크롤
  useEffect(() => {
    if (!searchQuery) chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, searchQuery]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const firstUnreadIndex = useMemo(() => {
    if (!lastSeenAt) return -1;
    return messages.findIndex((m) => new Date(m.createdAt) > lastSeenAt && m.userId !== myUserId);
  }, [messages, lastSeenAt, myUserId]);

  const unreadCount = useMemo(() => {
    if (firstUnreadIndex < 0) return 0;
    return messages.slice(firstUnreadIndex).filter((m) => m.userId !== myUserId).length;
  }, [messages, firstUnreadIndex, myUserId]);
  const firstUnreadMsgId = firstUnreadIndex >= 0 && !searchQuery.trim() ? messages[firstUnreadIndex]?.id : null;

  const renderItems = useMemo<RenderItem[]>(() => {
    const items: RenderItem[] = [];
    const sorted = [...filteredMessages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    let lastDateKey = '';
    for (const msg of sorted) {
      const dateKey = new Date(msg.createdAt).toDateString();
      if (dateKey !== lastDateKey) {
        items.push({ kind: 'date', label: formatDateLabel(msg.createdAt), key: `date-${dateKey}` });
        lastDateKey = dateKey;
      }
      if (firstUnreadMsgId && msg.id === firstUnreadMsgId) {
        items.push({ kind: 'unread', count: unreadCount, key: 'unread-divider' });
      }
      items.push({ kind: 'msg', msg });
    }
    return items;
  }, [filteredMessages, firstUnreadMsgId, unreadCount]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    if (f && f.size > 50 * 1024 * 1024) {
      setFileError(`최대 50MB까지 업로드 가능합니다. (현재: ${(f.size / 1024 / 1024).toFixed(1)}MB)`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(f);
    setFilePreview(f && f.type.startsWith('image/') ? URL.createObjectURL(f) : null);
  }

  function removeFile() {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSend(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!input.trim() && !file) return;
    setSending(true);
    try {
      let fileUrl: string | undefined;
      if (file) {
        const res = await uploadApi.upload(token, file);
        fileUrl = res.url;
      }
      const msg = await roomsApi.createMessage(token, roomId, { content: input.trim() || '', fileUrl });
      onNewMessage(msg);
      setInput('');
      setFile(null);
      setFilePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(messageId: string) {
    await roomsApi.deleteMessage(token, roomId, messageId);
    onDeleteMessage(messageId);
  }

  return (
    <div className="flex flex-col h-[calc(100svh-300px)] min-h-75 md:h-[calc(100svh-270px)] lg:h-[calc(100svh-260px)]">
      {/* 검색 바 */}
      {searchOpen && (
        <div className="mb-2 flex shrink-0 items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="메시지 검색..."
            autoFocus
            className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="button"
            onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            취소
          </button>
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* 검색 아이콘 (상단 우측 고정) */}
        <div className="flex items-center justify-between pb-1 sticky top-0 z-10 bg-white dark:bg-gray-900">
          <span className="text-xs text-gray-400">
            {searchQuery ? `"${searchQuery}" 검색 결과 ${filteredMessages.length}개` : ''}
          </span>
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            title="메시지 검색"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
            </svg>
          </button>
        </div>

        {loading && <div className="py-4 text-center text-sm text-gray-400">로딩 중...</div>}
        {!loading && messages.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-500">메시지가 없습니다.</div>
        )}
        {!loading && searchQuery && filteredMessages.length === 0 && (
          <div className="py-4 text-center text-sm text-gray-500">검색 결과가 없습니다.</div>
        )}

        <div className="space-y-3 pb-2">
          {renderItems.map((item) => {
            if (item.kind === 'date') {
              return (
                <div key={item.key} className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{item.label}</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                </div>
              );
            }
            if (item.kind === 'unread') {
              return (
                <div key={item.key} className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-violet-300 dark:bg-violet-700" />
                  <span className="text-xs text-violet-500 shrink-0 whitespace-nowrap">{item.count}개의 읽지 않은 메시지</span>
                  <div className="flex-1 h-px bg-violet-300 dark:bg-violet-700" />
                </div>
              );
            }
            const { msg } = item;
            const isMine = msg.userId === myUserId;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {isMine ? (
                  <div className="flex items-end gap-1.5">
                    <div className="group flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="hidden group-hover:block text-xs text-gray-400 hover:text-red-500 shrink-0"
                      >
                        삭제
                      </button>
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="max-w-xs rounded-lg bg-violet-600 px-4 py-2 text-sm text-white">
                          {msg.content && <p>{msg.content}</p>}
                          {msg.fileUrl && (
                            isImageUrl(msg.fileUrl) ? (
                              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                <img src={msg.fileUrl} alt="첨부 이미지" className="mt-1 max-w-50 rounded-lg" />
                              </a>
                            ) : (
                              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-violet-200 underline">
                                파일 보기
                              </a>
                            )
                          )}
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
                        {msg.fileUrl && (
                          isImageUrl(msg.fileUrl) ? (
                            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                              <img src={msg.fileUrl} alt="첨부 이미지" className="mt-1 max-w-50 rounded-lg" />
                            </a>
                          ) : (
                            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-violet-600 underline">
                              파일 보기
                            </a>
                          )
                        )}
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
          })}
        </div>
        <div ref={chatBottomRef} />
      </div>

      {/* 입력 폼 */}
      <form onSubmit={handleSend} className="mt-2 shrink-0 space-y-2">
        {fileError && <div className="rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">{fileError}</div>}
        {filePreview && (
          <div className="relative h-24 w-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <img src={filePreview} alt="preview" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={removeFile}
              className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
              </svg>
            </button>
          </div>
        )}
        {file && !filePreview && (
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
            <span className="text-xs text-gray-700 dark:text-gray-300">{file.name}</span>
            <button type="button" onClick={removeFile} className="text-xs text-gray-500 hover:text-gray-700">×</button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지 입력..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-violet-500"
          />
          <label className="rounded-lg bg-gray-200 p-2 cursor-pointer hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5" />
              <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z" />
            </svg>
            <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
          </label>
          <button
            type="submit"
            disabled={sending || (!input.trim() && !file)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
          >
            {sending ? '...' : '전송'}
          </button>
        </div>
      </form>
    </div>
  );
}
