'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export function SearchBox({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [val, setVal] = useState(sp.get('q') || '');

  useEffect(() => {
    setVal(sp.get('q') || '');
  }, [sp]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const next = new URLSearchParams(sp.toString());
    if (val.trim()) next.set('q', val.trim());
    else next.delete('q');
    router.push(`?${next.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        type="search"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border border-gray-200 rounded-md px-3 py-1.5 text-sm bg-white"
      />
      <button type="submit" className="px-4 py-1.5 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-600">
        搜索
      </button>
      {sp.get('q') && (
        <button
          type="button"
          onClick={() => { setVal(''); router.push('?'); }}
          className="px-3 py-1.5 rounded-md border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
        >
          清除
        </button>
      )}
    </form>
  );
}
