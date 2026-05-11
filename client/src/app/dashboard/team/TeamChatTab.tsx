'use client';

import { useRef, useEffect, useState } from 'react';
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

export function TeamChatTab({ roomId, token, messages, loading, myUserId, onNewMessage, onDeleteMessage }: Props) {
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() && !file) return;
    setSending(true);
    try {
      let fileUrl: string | undefined;
      if (file) { const res = await uploadApi.upload(token, file); fileUrl = res.url; }
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

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    if (isToday) return time;
    return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) + ' ' + time;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex-1 overflow-y-auto space-y-3 max-h-96">
        {loading && <div className="py-4 text-center text-sm text-gray-400">로딩 중...</div>}
        {!loading && messages.length === 0 && <div className="py-8 text-center text-sm text-gray-500">메시지가 없습니다.</div>}
        {messages.map((msg) => {
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
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-violet-200 underline">
                            파일 보기
                          </a>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-start gap-0.5">
                  <span className="ml-1 text-xs text-gray-400">{msg.user.name}</span>
                  <div className="max-w-xs rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-900 dark:bg-gray-800 dark:text-gray-100">
                    {msg.content && <p>{msg.content}</p>}
                    {msg.fileUrl && (
                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-violet-600 underline">
                        파일 보기
                      </a>
                    )}
                  </div>
                  <span className="ml-1 text-xs text-gray-400">{formatTime(msg.createdAt)}</span>
                </div>
              )}
            </div>
          );
        })}
        <div ref={chatBottomRef} />
      </div>

      <form onSubmit={handleSend} className="space-y-2">
        {fileError && <div className="rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">{fileError}</div>}
        {filePreview && (
          <div className="relative h-24 w-24 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <img src={filePreview} alt="preview" className="h-full w-full object-cover" />
            <button type="button" onClick={removeFile} className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition">
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
              <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
              <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/>
            </svg>
            <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
          </label>
          <button type="submit" disabled={sending || (!input.trim() && !file)} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50">
            {sending ? '...' : '전송'}
          </button>
        </div>
      </form>
    </div>
  );
}
