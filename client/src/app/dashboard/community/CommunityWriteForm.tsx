'use client';

import { useRef, useState } from 'react';
import { communityApi, uploadApi, type Post } from '@/lib/api';
import { SECTIONS } from './CommunitySidebar';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface Props {
  category: string;
  token: string;
  onSubmit: (post: Post) => void;
  onCancel: () => void;
}

export default function CommunityWriteForm({ category: initialCategory, token, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [anon, setAnon] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFileError(null);
    if (f && f.size > MAX_FILE_SIZE) {
      setFileError(`파일 크기가 너무 큽니다. 최대 50MB까지 업로드 가능합니다. (현재: ${(f.size / 1024 / 1024).toFixed(1)}MB)`);
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

  async function submit() {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      let fileUrl: string | undefined;
      if (file) {
        setUploading(true);
        const res = await uploadApi.upload(token, file);
        fileUrl = res.url;
        setUploading(false);
      }
      const post = await communityApi.create(token, {
        title: title.trim().replace(/<[^>]*>/g, ''),
        category,
        content: content.trim().replace(/<[^>]*>/g, ''),
        fileUrl,
        isAnonymous: anon,
      });
      onSubmit(post);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  const allCategories = SECTIONS.flatMap((s) => s.categories);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">글쓰기</h2>
      </div>

      <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {allCategories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="w-full px-5 py-4 text-base font-medium text-gray-900 dark:text-white bg-transparent border-b border-gray-100 dark:border-gray-800 focus:outline-none placeholder-gray-300 dark:placeholder-gray-600"
          autoComplete="off"
          maxLength={100}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요..."
          className="w-full px-5 py-4 text-sm text-gray-800 dark:text-gray-200 bg-transparent resize-none focus:outline-none placeholder-gray-400 min-h-48"
          rows={10}
          autoComplete="off"
        />

        {file && (
          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              {filePreview ? (
                <img src={filePreview} alt="미리보기" className="h-20 w-20 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" className="text-violet-500">
                    <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1L14 4.5z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={removeFile} className="shrink-0 text-gray-400 hover:text-red-500 transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
              <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="rounded" />
              익명으로 게시
            </label>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="currentColor" viewBox="0 0 16 16">
                <path d="M4.502 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" />
                <path d="M14.002 13a2 2 0 0 1-2 2h-10a2 2 0 0 1-2-2V5A2 2 0 0 1 2 3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-1.998 2M14 2H4a1 1 0 0 0-1 1h9.002a2 2 0 0 1 2 2v7A1 1 0 0 0 15 11V3a1 1 0 0 0-1-1M2.002 4a1 1 0 0 0-1 1v8l2.646-2.354a.5.5 0 0 1 .63-.062l2.66 1.773 3.71-3.71a.5.5 0 0 1 .577-.094l1.777 1.947V5a1 1 0 0 0-1-1z" />
              </svg>
              파일 첨부
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/flac,audio/aac,video/mp4,video/quicktime,video/webm,video/x-msvideo"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          {fileError && <p className="w-full px-5 pb-2 text-xs text-red-500">{fileError}</p>}
          <div className="flex items-center gap-2">
            <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition">취소</button>
            <button
              onClick={submit}
              disabled={!title.trim() || !content.trim() || submitting}
              className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-40 transition"
            >
              {uploading ? '업로드 중...' : submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
