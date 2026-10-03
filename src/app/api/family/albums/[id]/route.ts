import { NextRequest, NextResponse } from 'next/server';
import { getAlbum, updateAlbum, deleteAlbum, cascadeDeleteAlbum } from '@/lib/family/repo';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const a = getAlbum(Number(id));
  if (!a) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ item: a });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const a = updateAlbum(Number(id), {
    name: body.name?.trim(),
    description: body.description,
    cover_media_id: body.cover_media_id,
  });
  if (!a) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ item: a });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const albumId = Number(id);
  if (!albumId) return NextResponse.json({ error: 'invalid id' }, { status: 400 });

  const url = new URL(req.url);
  const cascade = url.searchParams.get('cascade') === 'true';

  if (cascade) {
    const result = await cascadeDeleteAlbum(albumId);
    return NextResponse.json({ ok: true, ...result });
  }
  deleteAlbum(albumId);
  return NextResponse.json({ ok: true });
}
