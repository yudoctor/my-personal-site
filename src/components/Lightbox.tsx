'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Media } from '@/lib/family/types';

/**
 * 照片 Lightbox 大图浏览（参照主流相册设计）
 * - 纯黑背景
 * - Chrome（顶栏/底栏/箭头）2 秒无操作自动淡出，鼠标移动再次显示
 * - 点击图片循环缩放 1x→2x→3x；缩放时可拖动平移
 * - 滚轮缩放；右键 / 重置按钮 / 0 键回到 1x
 * - Esc 关闭；← / → 切换
 */
export function Lightbox({
  photos,
  startId,
  onClose,
}: {
  photos: Media[];
  startId: number;
  onClose?: () => void;
}) {
  const router = useRouter();
  const idx = photos.findIndex((p) => p.id === startId);
  const cur = idx >= 0 ? photos[idx] : null;

  const [zoom, setZoom] = useState(1); // 1, 2, 3
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [chrome, setChrome] = useState(true); // 顶栏/底栏/箭头可见
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{ active: boolean; sx: number; sy: number; ox: number; oy: number }>({
    active: false, sx: 0, sy: 0, ox: 0, oy: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  function close() {
    if (onClose) onClose();
    else router.push('/family/photos');
  }

  function goto(i: number) {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    router.push(`/family/photos/${photos[i].id}?lightbox=1`, { scroll: false });
  }

  function prev() { if (idx > 0) goto(idx - 1); }
  function next() { if (idx >= 0 && idx < photos.length - 1) goto(idx + 1); }

  function cycleZoom() {
    if (zoom === 1) setZoom(2);
    else if (zoom === 2) setZoom(3);
    else { setZoom(1); setPan({ x: 0, y: 0 }); }
  }

  function reset() { setZoom(1); setPan({ x: 0, y: 0 }); }

  // 切换照片重置缩放
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [startId]);

  // chrome 自动隐藏（2 秒）
  function bumpChrome() {
    setChrome(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChrome(false), 2000);
  }
  useEffect(() => {
    bumpChrome();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  // 键盘
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(3, z + 1));
      else if (e.key === '-') setZoom((z) => Math.max(1, z - 1));
      else if (e.key === '0') reset();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, zoom]);

  // 拖动平移（仅缩放时）
  function onMouseDown(e: React.MouseEvent) {
    if (zoom === 1) return;
    dragRef.current = {
      active: true,
      sx: e.clientX, sy: e.clientY,
      ox: pan.x, oy: pan.y,
    };
  }
  function onMouseMove(e: React.MouseEvent) {
    bumpChrome();
    if (!dragRef.current.active) return;
    setPan({
      x: dragRef.current.ox + (e.clientX - dragRef.current.sx),
      y: dragRef.current.oy + (e.clientY - dragRef.current.sy),
    });
  }
  function onMouseUp() { dragRef.current.active = false; }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    if (e.deltaY < 0) setZoom((z) => Math.min(3, z + 1));
    else setZoom((z) => Math.max(1, z - 1));
  }

  if (!cur) return null;

  const cursor = zoom > 1
    ? (dragRef.current.active ? 'grabbing' : 'grab')
    : 'zoom-in';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onClick={(e) => {
        // 点击背景（非图片）关闭；图片的 onClick 会 stopPropagation
        if (e.target === e.currentTarget) close();
      }}
      onMouseMove={onMouseMove}
    >
      {/* 顶栏：左 1/N 标题，右 × 关闭。淡入淡出 */}
      <div
        className={`absolute top-0 right-0 left-0 z-10 flex items-center justify-between px-5 py-4 text-white bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300 ${
          chrome ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="text-sm font-medium drop-shadow">
          <span className="text-white/90">{idx + 1}</span>
          <span className="text-white/50 mx-1.5">/</span>
          <span className="text-white/90">{photos.length}</span>
        </div>
        <button
          onClick={close}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur text-xl leading-none flex items-center justify-center"
          title="关闭（Esc）"
        >
          ×
        </button>
      </div>

      {/* 主图区 */}
      <div className="flex-1 overflow-hidden relative select-none" onWheel={onWheel}>
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ cursor }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cur.url}
            alt={cur.title || cur.original_name}
            draggable={false}
            onClick={(e) => { e.stopPropagation(); cycleZoom(); }}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: dragRef.current.active ? 'none' : 'transform 0.2s ease-out',
              maxWidth: '95%',
              maxHeight: '95%',
              objectFit: 'contain',
            }}
            className="select-none"
          />
        </div>

        {/* 左右切换箭头：边缘触发区 + chrome 一致淡入淡出 */}
        {idx > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            onMouseEnter={bumpChrome}
            className={`absolute left-0 top-0 bottom-0 w-1/4 flex items-center justify-start pl-4 text-white/70 hover:text-white transition-opacity duration-300 ${
              chrome ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            title="上一张（←）"
          >
            <span className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur text-2xl flex items-center justify-center">‹</span>
          </button>
        )}
        {idx < photos.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            onMouseEnter={bumpChrome}
            className={`absolute right-0 top-0 bottom-0 w-1/4 flex items-center justify-end pr-4 text-white/70 hover:text-white transition-opacity duration-300 ${
              chrome ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            title="下一张（→）"
          >
            <span className="w-10 h-10 rounded-full bg-black/30 hover:bg-black/60 backdrop-blur text-2xl flex items-center justify-center">›</span>
          </button>
        )}

        {/* 浮在图上的缩放指示 + 重置（缩放 > 1x 时才出现，自动隐藏） */}
        {zoom > 1 && (
          <div
            className={`absolute bottom-6 right-6 flex items-center gap-2 transition-opacity duration-300 ${
              chrome ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <button
              onClick={(e) => { e.stopPropagation(); reset(); }}
              className="px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur text-white text-xs"
              title="重置缩放（0）"
            >
              重置
            </button>
            <span className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-white/80 text-xs tabular-nums">
              {zoom}x
            </span>
          </div>
        )}
      </div>

      {/* 底栏：标题 + 元数据。淡入淡出 */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-10 px-5 py-4 text-white bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${
          chrome ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-sm font-medium truncate drop-shadow">
            {cur.title || cur.original_name}
          </div>
          {(cur.description || cur.width || cur.album_name || cur.taken_at) && (
            <div className="mt-1.5 text-xs text-white/60 flex flex-wrap gap-x-4 gap-y-1 drop-shadow">
              {cur.width && cur.height && (
                <span className="tabular-nums">{cur.width} × {cur.height}</span>
              )}
              {cur.album_name && <span>相册：{cur.album_name}</span>}
              <span>{cur.taken_at || cur.created_at}</span>
            </div>
          )}
          {cur.description && (
            <div className="mt-1.5 text-xs text-white/50 line-clamp-2 drop-shadow">
              {cur.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}