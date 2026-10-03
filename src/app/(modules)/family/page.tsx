import Link from 'next/link';
import { getStats, listMedia, listAlbums, listMovies, findOnThisDay } from '@/lib/family/repo';

function formatSize(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1024 * 1024 * 1024) return (b / 1024 / 1024).toFixed(1) + ' MB';
  return (b / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function yearsAgo(date: string): number {
  // taken_at 形如 "2024-10-02 14:30:00"
  const y = parseInt(date.slice(0, 4), 10);
  return new Date().getFullYear() - y;
}

export default async function FamilyOverview() {
  const stats = getStats();
  const recentPhotos = listMedia({ type: 'photo', limit: 8 });
  const recentVideos = listMedia({ type: 'video', limit: 4 });
  const movies = listMovies();
  const albums = listAlbums().slice(0, 6);
  const onThisDay = findOnThisDay(8);

  return (
    <div className="space-y-10">
      {/* 统计卡片 */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="照片" value={stats.photo_count} href="/family/photos" />
        <Stat label="视频" value={stats.video_count} href="/family/videos" />
        <Stat label="微电影" value={stats.movie_count} href="/family/movies" />
        <Stat label="相册" value={stats.album_count} href="/family/albums" />
        <Stat label="已用空间" value={formatSize(stats.storage_used)} href={null} />
      </section>

      {/* 一年前的今天 */}
      {onThisDay.length > 0 && (
        <section className="bg-gradient-to-r from-brand-50 to-orange-50 border border-brand-100 rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">
              一年前的今天 · {onThisDay[0] && yearsAgo(onThisDay[0].taken_at || onThisDay[0].created_at) > 0
                ? `${yearsAgo(onThisDay[0].taken_at || onThisDay[0].created_at)} 年前`
                : '回忆'}
            </h2>
            <span className="text-xs text-brand-600">{new Date().getMonth() + 1} 月 {new Date().getDate()} 日</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {onThisDay.map((p) => (
              <Link
                key={p.id}
                href={`/family/photos/${p.id}?lightbox=1`}
                className="aspect-square block bg-gray-100 rounded-lg overflow-hidden relative group"
                title={`${yearsAgo(p.taken_at || p.created_at)} 年前 · ${p.title || p.original_name}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumb_url || p.url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
                <div className="absolute top-1 right-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                  {yearsAgo(p.taken_at || p.created_at)}y
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 最近照片 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">最近照片</h2>
          <Link href="/family/photos" className="text-sm text-brand-600 hover:underline">
            查看全部 →
          </Link>
        </div>
        {recentPhotos.length === 0 ? (
          <Empty
            title="还没有照片"
            tip="去「照片」页面上传第一张，或者上传到指定相册。"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {recentPhotos.map((p) => (
              <Link
                key={p.id}
                href={`/family/photos/${p.id}?lightbox=1`}
                className="aspect-square block bg-gray-100 rounded-lg overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumb_url || p.url}
                  alt={p.title || p.original_name}
                  className="w-full h-full object-cover hover:scale-105 transition"
                  loading="lazy"
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 最近视频 + 微电影 */}
      <section className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">最近视频</h2>
            <Link href="/family/videos" className="text-sm text-brand-600 hover:underline">
              查看全部 →
            </Link>
          </div>
          {recentVideos.length === 0 ? (
            <Empty title="还没有视频" tip="去「视频」页面上传。" />
          ) : (
            <div className="space-y-3">
              {recentVideos.map((v) => (
                <Link
                  key={v.id}
                  href={`/family/videos/${v.id}`}
                  className="flex gap-3 p-2 rounded-lg border border-gray-100 hover:border-brand-300 transition"
                >
                  <div className="w-24 h-16 bg-gray-900 rounded flex items-center justify-center text-white text-xs">
                    VIDEO
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {v.title || v.original_name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {v.width}×{v.height} · {formatSize(v.size)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">微电影作品</h2>
            <Link href="/family/movies" className="text-sm text-brand-600 hover:underline">
              查看全部 →
            </Link>
          </div>
          {movies.length === 0 ? (
            <Empty title="还没有微电影" tip="先上传视频，再在「微电影」页面创建作品。" />
          ) : (
            <div className="space-y-3">
              {movies.map((m) => (
                <Link
                  key={m.id}
                  href={`/family/movies/${m.id}`}
                  className="flex gap-3 p-2 rounded-lg border border-gray-100 hover:border-brand-300 transition"
                >
                  <div className="w-16 h-20 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    {m.poster_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.poster_url} alt={m.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        海报
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{m.title}</div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {m.description || '暂无简介'}
                    </div>
                    {m.director && (
                      <div className="text-xs text-gray-400 mt-1">导演：{m.director}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 相册 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">相册</h2>
          <Link href="/family/albums" className="text-sm text-brand-600 hover:underline">
            管理相册 →
          </Link>
        </div>
        {albums.length === 0 ? (
          <Empty title="还没有相册" tip="去「相册」页面创建你的第一个相册。" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {albums.map((a) => (
              <Link
                key={a.id}
                href={`/family/albums/${a.id}`}
                className="block border border-gray-100 rounded-lg p-3 hover:border-brand-300 hover:shadow-sm transition"
              >
                <div className="aspect-square rounded-md bg-brand-50 text-brand-500 flex items-center justify-center text-2xl font-bold mb-2">
                  {a.name.slice(0, 1)}
                </div>
                <div className="text-sm font-medium text-gray-900 truncate">{a.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">{a.photo_count ?? 0} 张</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number | string; href: string | null }) {
  const inner = (
    <div className="border border-gray-100 rounded-lg p-4 bg-white">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-900 mt-1">{value}</div>
    </div>
  );
  return href ? <Link href={href} className="block hover:shadow-sm transition">{inner}</Link> : inner;
}

function Empty({ title, tip }: { title: string; tip: string }) {
  return (
    <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50/50">
      <div className="text-gray-700 font-medium">{title}</div>
      <div className="text-xs text-gray-500 mt-1">{tip}</div>
    </div>
  );
}
