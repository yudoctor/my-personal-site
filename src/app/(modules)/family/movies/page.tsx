import Link from 'next/link';
import { listMovies, listMedia } from '@/lib/family/repo';
import { MovieCreator } from '@/components/MovieCreator';

export default async function MoviesPage() {
  const movies = listMovies();
  // 给创建表单用的可选视频
  const videos = listMedia({ type: 'video', limit: 500 }).filter(
    (v) => !movies.some((m) => m.video_media_id === v.id),
  );

  return (
    <div className="space-y-6">
      <MovieCreator videos={videos} />

      {movies.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-lg p-10 text-center bg-gray-50/50">
          <div className="text-gray-700 font-medium">还没有微电影</div>
          <div className="text-xs text-gray-500 mt-1">
            先在「视频」页面上传一段视频素材，然后在这里创建作品（可加海报、简介、演员表）
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {movies.map((m) => (
            <Link
              key={m.id}
              href={`/family/movies/${m.id}`}
              className="block border border-gray-100 rounded-xl overflow-hidden bg-white hover:shadow-md hover:border-brand-300 transition"
            >
              <div className="aspect-[2/3] bg-gray-100 relative">
                {m.poster_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.poster_url} alt={m.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    暂无海报
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <div className="text-white text-sm font-semibold truncate">{m.title}</div>
                  {m.director && (
                    <div className="text-white/80 text-xs">导演：{m.director}</div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
