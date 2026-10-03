import { NextRequest, NextResponse } from 'next/server';
import { listAlbums, createAlbum, deleteAlbum, getMedia } from '@/lib/family/repo';

export const runtime = 'nodejs';

export async function GET() {
  const items = listAlbums();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const album = createAlbum(body.name.trim(), body.description?.trim());
  // 可选设置封面
  if (body.cover_media_id) {
    const m = getMedia(Number(body.cover_media_id));
    if (m) {
      // 用 update 直接写
      const { getDb } = await import('@/lib/db');
      getDb()
        .prepare('UPDATE albums SET cover_media_id = ? WHERE id = ?')
        .run(m.id, album.id);
    }
  }
  return NextResponse.json({ item: { ...album, cover_media_id: body.cover_media_id ?? null } });
}

export async function DELETE(req: NextRequest) {
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  deleteAlbum(id);
  return NextResponse.json({ ok: true });
}
