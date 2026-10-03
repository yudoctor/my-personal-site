'use client';

import { useRouter } from 'next/navigation';

export function PhotoActions({ id }: { id: number }) {
  const router = useRouter();

  async function del() {
    if (!confirm('确定删除这张照片？此操作不可撤销。')) return;
    const res = await fetch(`/api/family/photos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/family/photos');
      router.refresh();
    } else {
      alert('删除失败');
    }
  }

  return (
    <button
      onClick={del}
      className="text-sm text-red-500 hover:text-red-700"
    >
      删除
    </button>
  );
}
