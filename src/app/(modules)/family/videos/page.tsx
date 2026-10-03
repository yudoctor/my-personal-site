import Link from 'next/link';
import { listMedia, listAlbums } from '@/lib/family/repo';
import { MediaUploader } from '@/components/MediaUploader';
import { SearchBox } from '@/components/SearchBox';

function fmtSize(b: number): string {
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
  return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

// 秒 → "1:23:45" / "12:34"
function fmtDuration(s: number): string {
  const total = Math.round(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
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
              <div className="aspect-video bg-gray-900 relative overflow-hidden">
                {v.thumb_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={v.thumb_url}
                      alt={v.title || v.original_name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    {/* 播放图标浮层 */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/15 group-hover:bg-black/30 transition">
                      <div className="w-14 h-14 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow-lg">
                        <div className="w-0 h-0 border-y-8 border-y-transparent border-l-12 border-l-gray-900 ml-1" />
                      </div>
                    </div>
                    {/* 时长角标 */}
                    {v.duration != null && (
                      <div className="absolute bottom-2 right-2 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded tabular-nums">
                        {fmtDuration(v.duration)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
                      <div className="w-0 h-0 border-y-8 border-y-transparent border-l-12 border-l-white ml-1" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {v.title || v.original_name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {v.width && v.height ? `${v.width}×${v.height} · ` : ''}{fmtSize(v.size)}{v.duration != null ? ` · ${fmtDuration(v.duration)}` : ''}
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
