import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAlbum, listMedia, listAlbums } from '@/lib/family/repo';
import { MediaUploader } from '@/components/MediaUploader';
import { AlbumEditor } from '@/components/AlbumEditor';
import { AlbumDeleteButton } from '@/components/AlbumDeleteButton';
import { AlbumPhotoGrid } from '@/components/AlbumPhotoGrid';

export default async function AlbumDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const album = getAlbum(Number(id));
  if (!album) notFound();

  const photos = listMedia({ type: 'photo', albumId: album.id, limit: 1000 });
  const albums = listAlbums();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/family/albums" className="text-sm text-brand-600 hover:underline">
          ← 返回相册列表
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{album.name}</h2>
            {album.description && (
              <p className="text-sm text-gray-600 mt-1">{album.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              共 {photos.length} 张照片 · 创建于 {album.created_at}
              {album.cover_media_id && <span className="ml-2">· 封面已设置</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/api/family/albums/${album.id}/export`}
              download
              className="text-sm text-gray-500 hover:text-brand-600"
              title="导出相册为 ZIP（含原图 + manifest.json）"
            >
              导出 ZIP
            </a>
            <AlbumEditor album={album} />
            <AlbumDeleteButton
              albumId={album.id}
              albumName={album.name}
              photoCount={photos.length}
            />
          </div>
        </div>
      </div>

      <MediaUploader type="photo" albums={albums} defaultAlbumId={album.id} />

      <div className="text-xs text-gray-400">
        提示：拖动照片可重排顺序；hover 后点击「设封面」可设置相册封面。
      </div>

      <AlbumPhotoGrid
        albumId={album.id}
        photos={photos}
        currentCoverId={album.cover_media_id}
      />
    </div>
  );
}
