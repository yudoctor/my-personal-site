'use client';

import { useRouter } from 'next/navigation';

export function MovieActions({ id }: { id: number }) {
  const router = useRouter();

  async function del() {
    if (!confirm('确定删除这部微电影？视频文件不会被删除（仍可在「视频」页面管理）。')) return;
    const res = await fetch(`/api/family/movies/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/family/movies');
      router.refresh();
    } else {
      alert('删除失败');
    }
  }

  return (
    <button onClick={del} className="text-sm text-red-500 hover:text-red-700">
      删除
    </button>
  );
}
