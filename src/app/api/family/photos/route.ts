import { NextRequest, NextResponse } from 'next/server';
import { listMedia } from '@/lib/family/repo';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const albumId = url.searchParams.get('album_id');
  const limit = Number(url.searchParams.get('limit') || 500);
  const q = url.searchParams.get('q') || undefined;
  const items = listMedia({
    type: 'photo',
    albumId: albumId ? Number(albumId) : undefined,
    limit,
    q,
  });
  return NextResponse.json({ items });
}
