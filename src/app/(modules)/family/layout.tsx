'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/family', label: '概览', exact: true },
  { href: '/family/albums', label: '相册' },
  { href: '/family/photos', label: '照片' },
  { href: '/family/videos', label: '视频' },
  { href: '/family/movies', label: '微电影' },
];

export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">家庭生活记录</h1>
        <p className="text-sm text-gray-500 mt-1">用照片、视频、微电影，把日子过得有据可查。</p>
      </div>

      <nav className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={[
                'px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition',
                active
                  ? 'border-brand-500 text-brand-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-800',
              ].join(' ')}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
