import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { config } from '@/lib/config';

export const metadata: Metadata = {
  title: config.site.title,
  description: config.site.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-500">
          <p>
            {config.site.name} · 用心记录，慢慢生活
          </p>
        </footer>
      </body>
    </html>
  );
}
