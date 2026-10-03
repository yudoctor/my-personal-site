'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Media } from '@/lib/family/types';

export function VideoEditor({ video }: { video: Media }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: video.title || '',
    description: video.description || '',
    taken_at: video.taken_at || '',
  });

  async function submit() {
    setBusy(true);
    const res = await fetch(`/api/family/videos/${video.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim() || null,
        description: form.description.trim() || null,
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
        <h3 className="text-lg font-semibold text-gray-900">编辑视频</h3>
        <label className="block">
          <span className="text-xs text-gray-500">标题</span>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">描述</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">拍摄日期</span>
          <input
            type="date"
            value={form.taken_at?.slice(0, 10) || ''}
            onChange={(e) => setForm((f) => ({ ...f, taken_at: e.target.value }))}
            className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => setOpen(false)} disabled={busy}
            className="px-4 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            取消
          </button>
          <button onClick={submit} disabled={busy}
            className="px-4 py-1.5 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
            {busy ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
