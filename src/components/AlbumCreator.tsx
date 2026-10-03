'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AlbumCreator() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch('/api/family/albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      setName('');
      setDescription('');
      setOpen(false);
      router.refresh();
    } else {
      alert('创建失败');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-600"
      >
        + 新建相册
      </button>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-3">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="相册名称，比如：2024春节"
        className="block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="相册描述（可选）"
        rows={2}
        className="block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={busy || !name.trim()}
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
