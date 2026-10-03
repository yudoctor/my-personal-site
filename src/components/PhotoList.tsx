'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Media } from '@/lib/family/types';

interface AlbumOpt { id: number; name: string; }

interface Props {
  photos: Media[];
  albums: AlbumOpt[];
  initialView?: 'grid' | 'timeline';
}

type Group = { key: string; label: string; items: Media[] };

function groupByMonth(items: Media[]): Group[] {
  const map = new Map<string, Media[]>();
  for (const m of items) {
    const d = m.taken_at || m.created_at || '';
    const key = d.slice(0, 7); // YYYY-MM
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, arr]) => {
      const [y, mo] = key.split('-');
      return { key, label: `${y} 年 ${parseInt(mo, 10)} 月`, items: arr };
    });
}

export function PhotoList({ photos, albums, initialView = 'grid' }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [view, setView] = useState<'grid' | 'timeline'>(initialView);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<number | ''>('');

  const groups = useMemo(() => groupByMonth(photos), [photos]);

  function toggle(id: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === photos.length) setSelected(new Set());
    else setSelected(new Set(photos.map((p) => p.id)));
  }

  function switchView(v: 'grid' | 'timeline') {
    setView(v);
    const next = new URLSearchParams(sp.toString());
    next.set('view', v);
    router.replace(`?${next.toString()}`, { scroll: false });
  }

  async function batchDelete() {
    if (!confirm(`确定删除选中的 ${selected.size} 张照片？`)) return;
    setBusy(true);
    const res = await fetch('/api/family/photos/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', ids: [...selected] }),
    });
    setBusy(false);
    if (res.ok) {
      setSelected(new Set());
      router.refresh();
    } else {
      alert('删除失败');
    }
  }

  async function batchMove() {
    if (!selected.size) return;
    setBusy(true);
    const res = await fetch('/api/family/photos/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'move',
        ids: [...selected],
        album_id: moveTarget === '' ? null : Number(moveTarget),
      }),
    });
    setBusy(false);
    if (res.ok) {
      setSelected(new Set());
      setMoveOpen(false);
      setMoveTarget('');
      router.refresh();
    } else {
      alert('移动失败');
    }
  }

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleAll}
            className="text-sm px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            {selected.size === photos.length && photos.length > 0 ? '取消全选' : '全选'}
          </button>
          <span className="text-xs text-gray-500">
            已选 {selected.size} 张{photos.length > 0 ? ` / 共 ${photos.length} 张` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1 border border-gray-200 rounded-md overflow-hidden">
          <button
            onClick={() => switchView('grid')}
            className={`text-sm px-3 py-1.5 ${view === 'grid' ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            网格
          </button>
          <button
            onClick={() => switchView('timeline')}
            className={`text-sm px-3 py-1.5 ${view === 'timeline' ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            时间线
          </button>
        </div>
      </div>

      {/* 批量操作浮动工具条 */}
      {selected.size > 0 && (
        <div className="sticky top-14 z-20 bg-brand-50 border border-brand-200 rounded-lg px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-brand-800 font-medium">已选 {selected.size} 张</span>
          <div className="flex gap-2">
            <button
              onClick={() => setMoveOpen(true)}
              disabled={busy}
              className="text-sm px-3 py-1 rounded-md bg-white border border-brand-200 text-brand-700 hover:bg-brand-100 disabled:opacity-50"
            >
              移动到相册
            </button>
            <button
              onClick={batchDelete}
              disabled={busy}
              className="text-sm px-3 py-1 rounded-md bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
            >
              {busy ? '处理中...' : '删除'}
            </button>
          </div>
        </div>
      )}

      {/* 视图渲染 */}
      {photos.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-10 text-center bg-gray-50/50">
          <div className="text-gray-700 font-medium">暂无照片</div>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {photos.map((p) => (
            <PhotoCard
              key={p.id}
              photo={p}
              selected={selected.has(p.id)}
              onToggle={() => toggle(p.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key}>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 sticky top-28 bg-white/80 backdrop-blur py-1 z-10">
                {g.label} <span className="text-gray-400 font-normal">· {g.items.length}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {g.items.map((p) => (
                  <PhotoCard
                    key={p.id}
                    photo={p}
                    selected={selected.has(p.id)}
                    onToggle={() => toggle(p.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* 移动到相册弹层 */}
      {moveOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !busy && setMoveOpen(false)}
        >
          <div className="bg-white rounded-xl w-full max-w-sm p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900">
              移动 {selected.size} 张照片到相册
            </h3>
            <select
              value={moveTarget}
              onChange={(e) => setMoveTarget(e.target.value ? Number(e.target.value) : '')}
              className="block w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">移出相册</option>
              {albums.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setMoveOpen(false)} disabled={busy}
                className="px-4 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                取消
              </button>
              <button onClick={batchMove} disabled={busy}
                className="px-4 py-1.5 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                {busy ? '移动中...' : '确认移动'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoCard({
  photo,
  selected,
  onToggle,
}: {
  photo: Media;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`aspect-square block bg-gray-100 rounded-lg overflow-hidden relative group ${
        selected ? 'ring-2 ring-brand-500' : ''
      }`}
    >
      <Link href={`/family/photos/${photo.id}?lightbox=1`} className="block w-full h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumb_url || photo.url}
          alt={photo.title || photo.original_name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition"
        />
      </Link>
      {/* 选择框 */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
        className={`absolute top-1 left-1 w-6 h-6 rounded border-2 flex items-center justify-center text-xs ${
          selected ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white/70 border-white/80 text-transparent hover:text-gray-300'
        }`}
        title={selected ? '取消选择' : '选择'}
      >
        ✓
      </button>
      {photo.title && (
        <div className="absolute top-1 right-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded truncate max-w-[70%]">
          {photo.title}
        </div>
      )}
      {!photo.title && photo.album_name && (
        <div className="absolute bottom-1 left-1 right-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded truncate">
          {photo.album_name}
        </div>
      )}
    </div>
  );
}
