'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MoviePosterEditor({ movieId, hasPoster }: { movieId: number; hasPoster: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  async function upload(file: File) {
    setBusy(true);
    setProgress(`上传 ${file.name} ...`);
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`/api/family/movies/${movieId}/poster`, {
      method: 'POST',
      body: form,
    });
    setBusy(false);
    setProgress('');
    if (res.ok) {
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      alert('上传失败：' + (j.error || res.status));
    }
  }

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <span className={`px-3 py-1.5 rounded-md text-sm ${busy ? 'bg-gray-200' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}>
        {busy ? '上传中...' : hasPoster ? '更换海报' : '上传海报'}
      </span>
      <input
        type="file"
        accept="image/*"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = '';
        }}
        className="hidden"
      />
      {progress && <span className="text-xs text-gray-500">{progress}</span>}
    </label>
  );
}
