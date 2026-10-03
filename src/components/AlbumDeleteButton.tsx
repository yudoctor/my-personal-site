'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  albumId: number;
  albumName: string;
  photoCount: number;
}

/**
 * 相册详情页头部的删除按钮
 * 不需要先进编辑弹窗，一键直达；带二次确认 + 是否级联删除照片
 */
export function AlbumDeleteButton({ albumId, albumName, photoCount }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cascade, setCascade] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    const url = `/api/family/albums/${albumId}${cascade ? '?cascade=true' : ''}`;
    const res = await fetch(url, { method: 'DELETE' });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.push('/family/albums');
      router.refresh();
    } else {
      alert('删除失败');
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-red-500 hover:text-red-700"
        title="删除整个相册"
      >
        删除相册
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900">
              删除相册「{albumName}」？
            </h3>
            <div className="text-sm text-gray-600 space-y-1">
              {photoCount > 0 ? (
                <p>本相册里有 <b>{photoCount}</b> 张照片。</p>
              ) : (
                <p>本相册为空。</p>
              )}
              <p className="text-gray-500 text-xs">
                默认：仅删除相册本身，照片会被保留（取消关联）。
              </p>
              {cascade && photoCount > 0 && (
                <p className="text-red-600 text-xs">
                  ⚠ 将一并物理删除 {photoCount} 张照片的原图与缩略图，<b>此操作不可恢复</b>。
                </p>
              )}
            </div>

            {photoCount > 0 && (
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
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
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
                {busy ? '删除中...' : cascade ? `确认删除（连同 ${photoCount} 张照片）` : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}