'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Media } from '@/lib/family/types';

interface Props {
  albumId: number;
  photos: Media[];
  currentCoverId: number | null;
}

export function AlbumPhotoGrid({ albumId, photos: initial, currentCoverId }: Props) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Media[]>(initial);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const dragIdRef = useRef<number | null>(null);

  async function persistOrder(next: Media[]) {
    setBusy(true);
    const res = await fetch('/api/family/photos/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ album_id: albumId, ids: next.map((p) => p.id) }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert('排序保存失败');
  }

  function onDragStart(e: React.DragEvent, id: number) {
    dragIdRef.current = id;
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    // FF 需要 setData
    e.dataTransfer.setData('text/plain', String(id));
  }

  function onDragOver(e: React.DragEvent, id: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIdRef.current !== id) setOverId(id);
  }

  function onDrop(e: React.DragEvent, targetId: number) {
    e.preventDefault();
    const src = dragIdRef.current;
    if (src == null || src === targetId) {
      setDragId(null); setOverId(null); dragIdRef.current = null;
      return;
    }
    const next = [...photos];
    const srcIdx = next.findIndex((p) => p.id === src);
    const tgtIdx = next.findIndex((p) => p.id === targetId);
    if (srcIdx < 0 || tgtIdx < 0) return;
    const [moved] = next.splice(srcIdx, 1);
    next.splice(tgtIdx, 0, moved);
    setPhotos(next);
    setDragId(null); setOverId(null); dragIdRef.current = null;
    persistOrder(next);
  }

  function onDragEnd() {
    setDragId(null); setOverId(null); dragIdRef.current = null;
  }

  async function setCover(id: number) {
    if (!confirm('把这张照片设为相册封面？')) return;
    const res = await fetch(`/api/family/albums/${albumId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_media_id: id }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      alert('设置失败');
    }
  }

  if (photos.length === 0) {
    return (
      <div className="border border-dashed border-gray-200 rounded-lg p-10 text-center bg-gray-50/50">
        <div className="text-gray-700 font-medium">这个相册还空着</div>
        <div className="text-xs text-gray-500 mt-1">上传第一张照片吧</div>
      </div>
    );
  }

  return (
    <>
      {busy && <div className="text-xs text-amber-600">保存排序中...</div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {photos.map((p) => (
          <div
            key={p.id}
            draggable
            onDragStart={(e) => onDragStart(e, p.id)}
            onDragOver={(e) => onDragOver(e, p.id)}
            onDrop={(e) => onDrop(e, p.id)}
            onDragEnd={onDragEnd}
            className={[
              'aspect-square bg-gray-100 rounded-lg overflow-hidden relative group cursor-move',
              overId === p.id ? 'ring-2 ring-brand-500' : '',
              dragId === p.id ? 'opacity-40' : '',
              p.id === currentCoverId ? 'ring-2 ring-amber-400' : '',
            ].join(' ')}
            title="拖动可排序"
          >
            <Link href={`/family/photos/${p.id}?lightbox=1`} className="block w-full h-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.thumb_url || p.url}
                alt={p.title || p.original_name}
                loading="lazy"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </Link>
            {/* 封面徽章 */}
            {p.id === currentCoverId && (
              <div className="absolute top-1 left-1 text-[10px] bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded font-medium">
                封面
              </div>
            )}
            {/* 标题 */}
            {p.title && (
              <div className="absolute top-1 right-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded truncate max-w-[70%]">
                {p.title}
              </div>
            )}
            {/* 操作按钮：设为封面 */}
            <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition flex gap-1">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCover(p.id); }}
                className="text-[10px] bg-white/90 hover:bg-amber-100 text-gray-700 hover:text-amber-700 px-1.5 py-0.5 rounded border border-gray-200"
                title="设为封面"
              >
                设封面
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
