import Link from 'next/link';
import { listMedia, listAlbums } from '@/lib/family/repo';
import { MediaUploader } from '@/components/MediaUploader';
import { SearchBox } from '@/components/SearchBox';

function fmtSize(b: number): string {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
  return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

export default async function VideosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const videos = listMedia({ type: 'video', q, limit: 2000 });
  const albums = listAlbums();

  return (
    <div className="space-y-6">
      <SearchBox placeholder="搜索视频标题、文件名、描述..." />
      <MediaUploader type="video" albums={albums} />

      {q && (
        <div className="text-xs text-gray-500">
          搜索 "<span className="text-brand-600">{q}</span>" 找到 {videos.length} 个视频
        </div>
      )}

      {videos.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-10 text-center bg-gray-50/50">
          <div className="text-gray-700 font-medium">
            {q ? '没有匹配的视频' : '还没有视频'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {q ? '换个关键词试试' : '支持 mp4 / mov / webm / mkv，单个最大 500MB'}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v) => (
            <Link
              key={v.id}
              href={`/family/videos/${v.id}`}
              className="block border border-gray-100 rounded-xl overflow-hidden bg-white hover:shadow-md hover:border-brand-300 transition"
            >
              <div className="aspect-video bg-gray-900 flex items-center justify-center text-white">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
                  <div className="w-0 h-0 border-y-8 border-y-transparent border-l-12 border-l-white ml-1" />
                </div>
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {v.title || v.original_name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {v.width && v.height ? `${v.width}×${v.height} · ` : ''}{fmtSize(v.size)}
                </div>
                {v.description && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{v.description}</div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
