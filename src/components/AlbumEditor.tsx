'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Album } from '@/lib/family/types';

export function AlbumEditor({ album }: { album: Album }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(album.name);
  const [description, setDescription] = useState(album.description || '');

  // 删除确认弹窗的独立状态
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cascade, setCascade] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/family/albums/${album.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      alert('保存失败');
    }
  }

  async function del() {
    setBusy(true);
    const url = `/api/family/albums/${album.id}${cascade ? '?cascade=true' : ''}`;
    const res = await fetch(url, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setConfirmOpen(false);
      router.push('/family/albums');
      router.refresh();
    } else {
      alert('删除失败');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-gray-500 hover:text-brand-600"
      >
        编辑
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={() => !busy && !confirmOpen && setOpen(false)}
    >
      <div
        className="bg-white rounded-xl w-full max-w-md p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900">编辑相册</h3>
        <label className="block">
          <span className="text-xs text-gray-500">名称</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">描述</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
          />
        </label>
        <div className="flex justify-between gap-2 pt-2">
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            className="px-3 py-1.5 rounded-md text-sm text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            删除相册
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              disabled={busy}
              className="px-4 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={save}
              disabled={busy}
              className="px-4 py-1.5 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
            >
              {busy ? '保存中...' : '保存'}
            </button>
          </div>
        </div>

        {/* 删除确认嵌套弹窗 */}
        {confirmOpen && (
          <div
            className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
            onClick={() => !busy && setConfirmOpen(false)}
          >
            <div
              className="bg-white rounded-xl w-full max-w-sm p-5 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-gray-900">删除相册「{album.name}」？</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>默认行为：仅删除相册本身，相册内的照片会被保留（取消关联）。</p>
                <p className="text-red-600">
                  若勾选下方选项，<b>会一并物理删除相册内所有照片的原图与缩略图，此操作不可恢复</b>。
                </p>
              </div>
              <label className="flex items-start gap-2 p-2 rounded bg-red-50 border border-red-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cascade}
                  onChange={(e) => setCascade(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm text-red-700">
                  同时删除相册内的所有照片（包括物理文件）
                </span>
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setConfirmOpen(false)}
                  disabled={busy}
                  className="px-4 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={del}
                  disabled={busy}
                  className="px-4 py-1.5 rounded-md bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {busy ? '删除中...' : cascade ? '确认删除（含照片）' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}