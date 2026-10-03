import { NextRequest, NextResponse } from 'next/server';
import { getMovie, updateMovie, deleteMovie } from '@/lib/family/repo';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const m = getMovie(Number(id));
  if (!m) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ item: m });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const m = updateMovie(Number(id), body);
  if (!m) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ item: m });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  deleteMovie(Number(id));
  return NextResponse.json({ ok: true });
}
