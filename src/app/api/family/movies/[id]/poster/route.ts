/**
 * 微电影海报上传
 * POST /api/family/movies/[id]/poster
 * multipart: file
 * 行为：上传为 photo 类型 media，关联 poster_media_id
 */
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { getStorage } from '@/lib/storage';
import { createMedia, getMovie, updateMovie } from '@/lib/family/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const movieId = Number(id);
  const movie = getMovie(movieId);
  if (!movie) return NextResponse.json({ error: 'movie not found' }, { status: 404 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }
  const ext = (file.name.slice(file.name.lastIndexOf('.')).toLowerCase() || '');
  if (!PHOTO_EXTS.includes(ext)) {
    return NextResponse.json({ error: `unsupported format: ${ext}` }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const img = sharp(buf, { failOn: 'none' });
  const meta = await img.metadata();

  // 海报保存为竖图限制最大 800px（保留原比例）
  const poster = await img
    .resize({ width: 800, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  const storage = getStorage();
  const filename = await storage.save(poster, file.name.replace(/\.[^.]+$/, '') + '.poster.webp', 'image/webp');

  const media = createMedia({
    type: 'photo',
    filename,
    original_name: file.name,
    mime_type: 'image/webp',
    size: poster.length,
    width: meta.width ?? null,
    height: meta.height ?? null,
    thumb_filename: null,
    title: (movie.title || '') + ' 海报',
  });

  // 关联到电影
  updateMovie(movieId, { poster_media_id: media.id });

  return NextResponse.json({ item: { ...movie, poster_media_id: media.id, poster_url: media.url } });
}
