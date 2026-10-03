import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4 text-gray-300 font-bold">A</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">关于我</h1>
      <p className="text-gray-500 mb-6">自我介绍、联系方式。规划中，敬请期待。</p>
      <Link href="/" className="text-brand-600 hover:underline text-sm">← 返回首页</Link>
    </div>
  );
}
