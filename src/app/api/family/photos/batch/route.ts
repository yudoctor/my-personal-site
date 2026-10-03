/**
 * 批量操作照片
 * POST /api/family/photos/batch
 *   { action: 'delete', ids: [...] }
 *   { action: 'move',  ids: [...], album_id: number | null }
 */
import { NextRequest, NextResponse } from 'next/server';
import { batchDeletePhotos, batchUpdateAlbum } from '@/lib/family/repo';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!Array.isArray(body.ids) || !body.ids.length) {
    return NextResponse.json({ error: 'ids required' }, { status: 400 });
  }
  const ids = body.ids.map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x));

  if (body.action === 'delete') {
    const n = await batchDeletePhotos(ids);
    return NextResponse.json({ ok: true, affected: n });
  }
  if (body.action === 'move') {
    const albumId = body.album_id == null ? null : Number(body.album_id);
    const n = batchUpdateAlbum(ids, albumId);
    return NextResponse.json({ ok: true, affected: n });
  }
  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
