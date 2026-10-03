import Link from 'next/link';
import { listAlbums } from '@/lib/family/repo';
import { AlbumCreator } from '@/components/AlbumCreator';

export default function AlbumsPage() {
  const albums = listAlbums();

  return (
    <div className="space-y-6">
      <AlbumCreator />

      {albums.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-10 text-center bg-gray-50/50">
          <div className="text-gray-700 font-medium">还没有相册</div>
          <div className="text-xs text-gray-500 mt-1">在上面创建一个吧，比如「2024春节」「宝宝成长」</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {albums.map((a) => (
            <Link
              key={a.id}
              href={`/family/albums/${a.id}`}
              className="block border border-gray-100 rounded-xl overflow-hidden bg-white hover:shadow-md hover:border-brand-300 transition"
            >
              <div className="aspect-square bg-brand-50 text-brand-500 flex items-center justify-center text-5xl font-bold">
                {a.name.slice(0, 1)}
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold text-gray-900 truncate">{a.name}</div>
                {a.description && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{a.description}</div>
                )}
                <div className="text-xs text-gray-400 mt-2">
                  {a.photo_count ?? 0} 张照片 · {a.updated_at}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
