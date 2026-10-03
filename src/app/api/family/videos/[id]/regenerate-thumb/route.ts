/**
 * 视频缩略图回填端点
 * POST /api/family/videos/[id]/regenerate-thumb
 *   - 重新抽取视频第 1 秒帧，生成 WebP 缩略图，写回 DB
 *   - 用于：上传链路没生成 thumb 的历史视频，或 thumb 文件损坏
 *
 * 适用条件：当前是 local 存储（绝对路径能拿到原文件）
 */
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getStorage, absolutePath } from '@/lib/storage';
import { getMedia, updateMedia } from '@/lib/family/repo';
import { getDb } from '@/lib/db';

ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const videoId = Number(id);
  const m = getMedia(videoId);
  if (!m || m.type !== 'video') {
    return NextResponse.json({ error: 'video not found' }, { status: 404 });
  }

  // 抽帧 + 写 thumb（与 upload 路由同流程）
  let tmpDir: string | null = null;
  try {
    const videoAbsPath = absolutePath(m.filename);
    try {
      await readFile(videoAbsPath); // 探一下文件存在
    } catch {
      return NextResponse.json({ error: 'video file missing on disk' }, { status: 410 });
    }

    tmpDir = await mkdtemp(path.join(tmpdir(), 'regen-'));
    const framePath = path.join(tmpDir, 'frame.jpg');

    // 抽帧
    let width: number | null = null;
    let height: number | null = null;
    let duration: number | null = null;

    await new Promise<void>((resolve) => {
      const cmd = ffmpeg(videoAbsPath)
        .on('end', () => resolve())
        .on('error', (e) => {
          console.error('ffmpeg regen error:', e.message);
          resolve();
        })
        .screenshots({
          timestamps: ['1'],
          filename: path.basename(framePath),
          folder: path.dirname(framePath),
          size: '600x?',
        });
      cmd.ffprobe((err, data) => {
        if (err) return;
        const vstream = data.streams?.find((s: any) => s.codec_type === 'video');
        if (vstream) {
          width = vstream.width ?? null;
          height = vstream.height ?? null;
        }
        if (data.format?.duration) {
          duration = Math.round(parseFloat(String(data.format.duration)) * 10) / 10;
        }
      });
    });

    const frameBuf = await readFile(framePath);
    const webp = await sharp(frameBuf, { failOn: 'none' })
      .resize({ width: 600, height: 600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const storage = getStorage();
    const thumbName = m.filename.replace(/\.[^.]+$/, '') + '.thumb.webp';
    const savedThumbKey = await storage.save(webp, path.basename(thumbName), 'image/webp');

    // 写回 DB：thumb_filename + width/height/duration
    const db = getDb();
    db.prepare('UPDATE media SET thumb_filename = ?, width = COALESCE(?, width), height = COALESCE(?, height), duration = COALESCE(?, duration) WHERE id = ?')
      .run(savedThumbKey, width, height, duration, videoId);

    const updated = updateMedia(videoId, {}); // 触发 withUrls 重新计算 url/thumb_url
    return NextResponse.json({ ok: true, item: updated });
  } catch (e: any) {
    console.error('regenerate-thumb error:', e);
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  } finally {
    if (tmpDir) rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}