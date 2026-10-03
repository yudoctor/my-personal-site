import { NextRequest, NextResponse } from 'next/server';
import { listMedia } from '@/lib/family/repo';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') || 500);
  const items = listMedia({ type: 'video', limit });
  return NextResponse.json({ items });
}
