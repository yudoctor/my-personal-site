import Link from 'next/link';
import { modules } from '@/lib/modules';

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <section className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">欢迎来到朝暮成序</h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          这是一个预留 5 大模块的个人主页。每一个模块都是一段时光、一种生活。
          点击进入感兴趣的主题，开始记录与回顾。
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">模块导航</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((m) => (
            <Link
              key={m.key}
              href={m.path}
              className="group relative block rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-brand-300 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-lg bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-xl">
                  {m.icon}
                </div>
                {m.status === 'placeholder' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    待开发
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-brand-600 transition">
                {m.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">{m.description}</p>
              <div className="mt-4 text-sm text-brand-500 group-hover:translate-x-1 transition-transform">
                进入 →
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
