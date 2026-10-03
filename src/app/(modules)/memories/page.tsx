import Link from 'next/link';

export default function MemoriesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4 text-gray-300 font-bold">M</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">时光收藏</h1>
      <p className="text-gray-500 mb-6">精选回忆、人生里程碑。规划中，敬请期待。</p>
      <Link href="/" className="text-brand-600 hover:underline text-sm">← 返回首页</Link>
    </div>
  );
}
