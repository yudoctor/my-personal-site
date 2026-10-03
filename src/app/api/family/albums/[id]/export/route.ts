/**
 * 相册打包 ZIP 导出
 * GET /api/family/albums/[id]/export
 *   - 包含相册内所有照片原图
 *   - 附带 manifest.json（相册元数据 + 每张照片信息）
 *   - 文件名：相册名-日期.zip
 */
import { NextRequest } from 'next/server';
import { Readable } from 'node:stream';
import { getAlbum, listMedia } from '@/lib/family/repo';
import { config } from '@/lib/config';
import path from 'node:path';
import fs from 'node:fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const albumId = Number(id);
  const album = getAlbum(albumId);
  if (!album) return new Response('album not found', { status: 404 });

  const photos = listMedia({ type: 'photo', albumId, limit: 99999 });

  // archiver 7.x 用 dynamic import + ZipArchive 类
  const archiverMod = await import('archiver');
  const ZipArchive = (archiverMod as any).ZipArchive;

  // ZIP 文件名（去不安全字符）
  const safeName = album.name.replace(/[\\/:*?"<>|]/g, '_');
  const filename = `${safeName}-${new Date().toISOString().slice(0, 10)}.zip`;

  const archive = new ZipArchive({ zlib: { level: 6 } });

  // 添加照片
  for (const p of photos) {
    const abs = path.join(config.uploadDir, p.filename);
    if (!fs.existsSync(abs)) continue;
    // 用原文件名（已经包含扩展名），前面加 taken_at 日期便于排序
    const baseName = sanitize(p.original_name);
    const insideName = p.taken_at
      ? `${p.taken_at.replace(/[: ]/g, '-')}_${p.id}_${baseName}`
      : `${p.id}_${baseName}`;
    archive.file(abs, { name: `photos/${insideName}` });
  }

  // 添加 manifest
  const manifest = {
    album: {
      id: album.id,
      name: album.name,
      description: album.description,
      created_at: album.created_at,
      updated_at: album.updated_at,
    },
    exported_at: new Date().toISOString(),
    photo_count: photos.length,
    photos: photos.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      taken_at: p.taken_at,
      filename: p.filename,
      original_name: p.original_name,
      size: p.size,
      width: p.width,
      height: p.height,
    })),
  };
  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

  archive.finalize();

  // archiver 返回的 archive 是 Node stream
  const webStream = Readable.toWeb(archive) as ReadableStream;

  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'no-store',
    },
  });
}

function sanitize(s: string): string {
  return s.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80);
}
