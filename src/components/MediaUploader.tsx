'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AlbumOpt {
  id: number;
  name: string;
}

export function MediaUploader({
  type,
  albums,
  defaultAlbumId,
}: {
  type: 'photo' | 'video';
  albums: AlbumOpt[];
  defaultAlbumId?: number;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [albumId, setAlbumId] = useState<number | ''>(defaultAlbumId ?? '');
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    if (!files.length) return setError('请先选择文件');
    setUploading(true);
    setError('');
    setProgress(`准备上传 ${files.length} 个文件...`);

    let ok = 0, fail = 0;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setProgress(`(${i + 1}/${files.length}) 上传 ${f.name} ...`);
      try {
        const form = new FormData();
        form.append('file', f);
        form.append('type', type);
        if (albumId) form.append('album_id', String(albumId));
        if (title) form.append('title', title);
        const res = await fetch('/api/family/upload', { method: 'POST', body: form });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        ok++;
      } catch (e: any) {
        fail++;
        console.error(e);
      }
    }
    setUploading(false);
    setProgress(`完成：成功 ${ok}，失败 ${fail}`);
    if (ok > 0) {
      setFiles([]);
      setTitle('');
      router.refresh();
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="md:col-span-3 block">
          <span className="text-xs text-gray-500">选择{type === 'photo' ? '照片' : '视频'}（可多选）</span>
          <input
            type="file"
            multiple
            accept={type === 'photo' ? 'image/*' : 'video/*'}
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="mt-1 block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-brand-50 file:text-brand-700"
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">归入相册（可选）</span>
          <select
            value={albumId}
            onChange={(e) => setAlbumId(e.target.value ? Number(e.target.value) : '')}
            className="mt-1 block w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white"
          >
            <option value="">不归入相册</option>
            {albums.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs text-gray-500">统一标题（可选，留空用文件名）</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="比如：国庆假期第一天"
            className="mt-1 block w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={submit}
          disabled={uploading || !files.length}
          className="px-4 py-1.5 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? '上传中...' : `上传 ${files.length || ''} 个文件`}
        </button>
        {progress && <span className="text-xs text-gray-500">{progress}</span>}
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}
