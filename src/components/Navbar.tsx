'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { modules } from '@/lib/modules';

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg text-brand-600">
          朝暮成序
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {modules.map((m) => {
            const active = pathname === m.path || pathname.startsWith(m.path + '/');
            return (
              <Link
                key={m.key}
                href={m.path}
                className={[
                  'px-3 py-1.5 rounded-md transition',
                  active
                    ? 'bg-brand-100 text-brand-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                ].join(' ')}
              >
                {m.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
