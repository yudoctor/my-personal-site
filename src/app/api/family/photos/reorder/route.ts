/**
 * 重排相册内照片
 * POST /api/family/photos/reorder
 *   { album_id, ids: [...] }  -- ids 顺序即新顺序
 */
import { NextRequest, NextResponse } from 'next/server';
import { reorderAlbumPhotos } from '@/lib/family/repo';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.album_id || !Array.isArray(body.ids)) {
    return NextResponse.json({ error: 'album_id and ids required' }, { status: 400 });
  }
  const ids = body.ids.map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x));
  const n = reorderAlbumPhotos(Number(body.album_id), ids);
  return NextResponse.json({ ok: true, affected: n });
}
