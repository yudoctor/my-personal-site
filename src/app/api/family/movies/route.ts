import { NextRequest, NextResponse } from 'next/server';
import { listMovies, createMovie } from '@/lib/family/repo';
import { getMedia } from '@/lib/family/repo';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ items: listMovies() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.title) return NextResponse.json({ error: 'title required' }, { status: 400 });
  if (!body.video_media_id)
    return NextResponse.json({ error: 'video_media_id required' }, { status: 400 });

  // 校验视频存在
  const video = getMedia(Number(body.video_media_id));
  if (!video || video.type !== 'video') {
    return NextResponse.json({ error: 'video_media_id invalid' }, { status: 400 });
  }

  const movie = createMovie({
    title: body.title,
    description: body.description,
    poster_media_id: body.poster_media_id ? Number(body.poster_media_id) : null,
    video_media_id: video.id,
    duration: video.duration ?? body.duration ?? null,
    director: body.director,
    cast: body.cast,
    released_at: body.released_at,
  });
  return NextResponse.json({ item: movie });
}
