import { NextResponse } from 'next/server';
import { getStats } from '@/lib/family/repo';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(getStats());
}
