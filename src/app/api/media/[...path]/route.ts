/**
 * 媒体文件流接口（支持 HTTP Range 断点续传 / 视频拖动）
 * GET /api/media/<year>/<month>/<file>
 */
import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { config } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
};

function guessMime(name: string): string {
  const ext = path.extname(name).toLowerCase();
  return MIME[ext] || 'application/octet-stream';
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  if (!parts || !parts.length) return new NextResponse('not found', { status: 404 });

  // 防穿越：不允许 ..
  if (parts.some((p) => p === '..' || p.includes('\0'))) {
    return new NextResponse('bad path', { status: 400 });
  }
  const key = parts.join('/');
  const abs = path.join(config.uploadDir, key);

  if (!fs.existsSync(abs)) return new NextResponse('not found', { status: 404 });
  const stat = fs.statSync(abs);
  if (!stat.isFile()) return new NextResponse('not found', { status: 404 });

  const size = stat.size;
  const mime = guessMime(abs);
  const range = req.headers.get('range');

  // 无 Range：完整返回
  if (!range) {
    const stream = fs.createReadStream(abs);
    return new NextResponse(Readable.toWeb(stream) as any, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(size),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }

  // 解析 bytes=start-end
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  if (!m) return new NextResponse('invalid range', { status: 416 });

  const start = m[1] ? parseInt(m[1], 10) : 0;
  const end = m[2] ? parseInt(m[2], 10) : size - 1;
  if (start >= size || end >= size || start > end) {
    return new NextResponse('range not satisfiable', {
      status: 416,
      headers: { 'Content-Range': `bytes */${size}` },
    });
  }
  const chunk = end - start + 1;
  const stream = fs.createReadStream(abs, { start, end });

  return new NextResponse(Readable.toWeb(stream) as any, {
    status: 206,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(chunk),
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
