import { NextRequest, NextResponse } from 'next/server';
import { deleteMedia, getMedia, updateMedia } from '@/lib/family/repo';

export const runtime = 'nodejs';

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const m = getMedia(Number(id));
  if (!m || m.type !== 'photo') return NextResponse.json({ error: 'not found' }, { status: 404 });
  await deleteMedia(m.id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const m = updateMedia(Number(id), body);
  if (!m) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ item: m });
}
