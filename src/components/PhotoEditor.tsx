'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Media } from '@/lib/family/types';

interface AlbumOpt { id: number; name: string; }

export function PhotoEditor({
  photo,
  albums,
}: {
  photo: Media;
  albums: AlbumOpt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: photo.title || '',
    description: photo.description || '',
    album_id: photo.album_id ?? '' as number | '',
    taken_at: photo.taken_at || '',
  });

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    setBusy(true);
    const res = await fetch(`/api/family/photos/${photo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim() || null,
        description: form.description.trim() || null,
        album_id: form.album_id === '' ? null : Number(form.album_id),
        taken_at: form.taken_at || null,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      alert('保存失败');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
      >
        编辑
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
      <div className="bg-white rounded-xl w-full max-w-lg p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900">编辑照片</h3>

        <label className="block">
          <span className="text-xs text-gray-500">标题</span>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="留空使用文件名"
            className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">描述</span>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            placeholder="讲讲这张照片背后的故事..."
            className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500">所属相册</span>
            <select
              value={form.album_id}
              onChange={(e) => set('album_id', e.target.value ? Number(e.target.value) : '')}
              className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">不归入相册</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">拍摄日期</span>
            <input
              type="date"
              value={form.taken_at?.slice(0, 10) || ''}
              onChange={(e) => set('taken_at', e.target.value)}
              className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => setOpen(false)}
            disabled={busy}
            className="px-4 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-4 py-1.5 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
