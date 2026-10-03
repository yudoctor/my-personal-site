import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMedia, listMedia, listAlbums } from '@/lib/family/repo';
import { PhotoActions } from '@/components/PhotoActions';
import { PhotoEditor } from '@/components/PhotoEditor';
import { Lightbox } from '@/components/Lightbox';

export default async function PhotoDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lightbox?: string }>;
}) {
  const { id } = await params;
  const { lightbox } = await searchParams;
  const photoId = Number(id);
  const photo = getMedia(photoId);
  if (!photo || photo.type !== 'photo') notFound();

  const all = listMedia({ type: 'photo', limit: 5000 });
  const idx = all.findIndex((m) => m.id === photo.id);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  // 同相册其他照片（最多 12 张）
  const sibling = photo.album_id
    ? listMedia({ type: 'photo', albumId: photo.album_id, limit: 13 }).filter((m) => m.id !== photo.id).slice(0, 12)
    : [];
  const albums = listAlbums();

  return (
    <div className="space-y-4">
      {lightbox === '1' && <Lightbox photos={all} startId={photo.id} />}

      <div className="flex items-center justify-between">
        <Link href="/family/photos" className="text-sm text-brand-600 hover:underline">
          ← 返回照片列表
        </Link>
        <div className="flex items-center gap-3">
          <Link href={`/family/photos/${photo.id}?lightbox=1`} className="text-sm text-gray-500 hover:text-brand-600">
            全屏浏览
          </Link>
          <PhotoEditor photo={photo} albums={albums} />
          <PhotoActions id={photo.id} />
        </div>
      </div>

      <div className="bg-black rounded-lg flex items-center justify-center min-h-[400px] max-h-[80vh] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.title || photo.original_name}
          className="max-w-full max-h-[80vh] object-contain"
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {photo.title || photo.original_name}
        </h2>
        <div className="mt-1 text-xs text-gray-500 space-x-3">
          {photo.width && photo.height && <span>{photo.width} × {photo.height}</span>}
          <span>{(photo.size / 1024 / 1024).toFixed(2)} MB</span>
          {photo.album_name && <span>相册：{photo.album_name}</span>}
          <span>{photo.taken_at || photo.created_at}</span>
        </div>
        {photo.description && (
          <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{photo.description}</p>
        )}
      </div>

      {/* 同相册其他照片 */}
      {sibling.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            同相册的其他照片 {photo.album_name ? `· ${photo.album_name}` : ''}
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
            {sibling.map((s) => (
              <Link
                key={s.id}
                href={`/family/photos/${s.id}?lightbox=1`}
                className="aspect-square block bg-gray-100 rounded-md overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.thumb_url || s.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between text-sm">
        {prev ? (
          <Link href={`/family/photos/${prev.id}?lightbox=1`} className="text-brand-600 hover:underline">
            ← 上一张
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/family/photos/${next.id}?lightbox=1`} className="text-brand-600 hover:underline">
            下一张 →
          </Link>
        ) : <span />}
      </div>
    </div>
  );
}
