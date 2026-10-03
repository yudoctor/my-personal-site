'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface VideoOpt {
  id: number;
  title: string | null;
  original_name: string;
}

export function MovieCreator({ videos }: { videos: VideoOpt[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    director: '',
    cast: '',
    released_at: '',
    video_media_id: '',
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!form.title || !form.video_media_id) {
      alert('片名和视频必填');
      return;
    }
    setBusy(true);
    const res = await fetch('/api/family/movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        director: form.director.trim() || undefined,
        cast: form.cast.trim() || undefined,
        released_at: form.released_at || undefined,
        video_media_id: Number(form.video_media_id),
      }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setForm({ title: '', description: '', director: '', cast: '', released_at: '', video_media_id: '' });
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      alert('创建失败：' + (j.error || res.status));
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-600"
      >
        + 创建微电影
      </button>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <label className="block md:col-span-2">
          <span className="text-xs text-gray-500">片名 *</span>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="比如：宝贝的第一个春节"
            className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs text-gray-500">选择视频素材 *</span>
          <select
            value={form.video_media_id}
            onChange={(e) => set('video_media_id', e.target.value)}
            className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">请选择</option>
            {videos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title || v.original_name}
              </option>
            ))}
          </select>
          {videos.length === 0 && (
            <div className="mt-1 text-xs text-amber-600">
              暂无可用视频，请先在「视频」页面至少上传一个
            </div>
          )}
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">导演</span>
          <input
            value={form.director}
            onChange={(e) => set('director', e.target.value)}
            className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">上映日期</span>
          <input
            type="date"
            value={form.released_at}
            onChange={(e) => set('released_at', e.target.value)}
            className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs text-gray-500">演员表</span>
          <input
            value={form.cast}
            onChange={(e) => set('cast', e.target.value)}
            placeholder="比如：爸爸、妈妈、宝宝"
            className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs text-gray-500">简介</span>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            placeholder="讲讲这部微电影背后的故事..."
            className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={busy}
          className="px-4 py-1.5 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
        >
          {busy ? '创建中...' : '创建'}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="px-4 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
        >
          取消
        </button>
      </div>
    </div>
  );
}
