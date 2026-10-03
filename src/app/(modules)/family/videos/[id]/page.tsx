import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMedia, listMedia } from '@/lib/family/repo';
import { VideoActions } from '@/components/VideoActions';
import { VideoEditor } from '@/components/VideoEditor';

export default async function VideoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = getMedia(Number(id));
  if (!video || video.type !== 'video') notFound();

  const all = listMedia({ type: 'video', limit: 5000 });
  const idx = all.findIndex((m) => m.id === video.id);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/family/videos" className="text-sm text-brand-600 hover:underline">
          ← 返回视频列表
        </Link>
        <div className="flex items-center gap-3">
          <VideoEditor video={video} />
          <VideoActions id={video.id} />
        </div>
      </div>

      <div className="bg-black rounded-lg overflow-hidden">
        <video
          src={video.url}
          controls
          preload="metadata"
          className="w-full max-h-[80vh]"
        />
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {video.title || video.original_name}
        </h2>
        <div className="mt-1 text-xs text-gray-500 space-x-3">
          {video.width && video.height && <span>{video.width} × {video.height}</span>}
          <span>{(video.size / 1024 / 1024).toFixed(2)} MB</span>
          <span>{video.taken_at || video.created_at}</span>
        </div>
        {video.description && (
          <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{video.description}</p>
        )}
      </div>

      <div className="flex justify-between text-sm">
        {prev ? (
          <Link href={`/family/videos/${prev.id}`} className="text-brand-600 hover:underline">
            ← 上一个
          </Link>
        ) : <span />}
        {next ? (
          <Link href={`/family/videos/${next.id}`} className="text-brand-600 hover:underline">
            下一个 →
          </Link>
        ) : <span />}
      </div>
    </div>
  );
}
