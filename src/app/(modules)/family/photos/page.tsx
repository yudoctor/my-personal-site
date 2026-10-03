import { listMedia, listAlbums } from '@/lib/family/repo';
import { MediaUploader } from '@/components/MediaUploader';
import { SearchBox } from '@/components/SearchBox';
import { PhotoList } from '@/components/PhotoList';

export default async function PhotosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const { q, view } = await searchParams;
  const photos = listMedia({ type: 'photo', q, limit: 2000 });
  const albums = listAlbums();
  const initialView = view === 'timeline' ? 'timeline' : 'grid';

  return (
    <div className="space-y-6">
      <SearchBox placeholder="搜索照片标题、文件名、描述..." />
      <MediaUploader type="photo" albums={albums} />

      {q && (
        <div className="text-xs text-gray-500">
          搜索 "<span className="text-brand-600">{q}</span>" 找到 {photos.length} 张照片
        </div>
      )}

      <PhotoList photos={photos} albums={albums} initialView={initialView} />
    </div>
  );
}
