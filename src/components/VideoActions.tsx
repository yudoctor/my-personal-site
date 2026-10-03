'use client';

import { useRouter } from 'next/navigation';

export function VideoActions({ id }: { id: number }) {
  const router = useRouter();

  async function del() {
    if (!confirm('确定删除这个视频？')) return;
    const res = await fetch(`/api/family/videos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/family/videos');
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
