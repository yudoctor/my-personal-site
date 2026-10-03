import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMovie } from '@/lib/family/repo';
import { MovieActions } from '@/components/MovieActions';
import { MoviePosterEditor } from '@/components/MoviePosterEditor';

export default async function MovieDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = getMovie(Number(id));
  if (!movie) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/family/movies" className="text-sm text-brand-600 hover:underline">
          ← 返回微电影列表
        </Link>
        <MovieActions id={movie.id} />
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* 左侧：海报 */}
        <aside className="md:col-span-1">
          <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-100 shadow">
            {movie.poster_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                暂无海报
              </div>
            )}
          </div>
          <div className="mt-3">
            <MoviePosterEditor movieId={movie.id} hasPoster={!!movie.poster_url} />
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {movie.director && <div><span className="text-gray-500">导演：</span>{movie.director}</div>}
            {movie.cast && <div><span className="text-gray-500">演员：</span>{movie.cast}</div>}
            {movie.released_at && <div><span className="text-gray-500">上映：</span>{movie.released_at}</div>}
            {movie.duration != null && (
              <div><span className="text-gray-500">时长：</span>{formatDuration(movie.duration)}</div>
            )}
          </div>
        </aside>

        {/* 右侧：标题 + 简介 + 播放器 */}
        <main className="md:col-span-2 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{movie.title}</h1>
          </div>

          {movie.description && (
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{movie.description}</p>
          )}

          <div className="bg-black rounded-lg overflow-hidden">
            <video
              src={movie.video_url}
              controls
              preload="metadata"
              className="w-full max-h-[70vh]"
              poster={movie.poster_url || undefined}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
