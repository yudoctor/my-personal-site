/**
 * 通用媒体上传接口
 * POST /api/family/upload
 *   formData: file, type=photo|video, album_id?, title?, description?, taken_at?
 * 返回: { item: Media }
 *
 * 自动行为：
 *  - 照片：sharp 解析宽高 + 生成 WebP 缩略图
 *  - 照片：尝试从 EXIF 提取 DateTimeOriginal 作为 taken_at（仅当用户未手动指定）
 *  - 视频：ffmpeg 抽帧（第 1 秒）作为 WebP 缩略图 + 获取宽高/时长
 */
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import exifr from 'exifr';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getStorage, absolutePath } from '@/lib/storage';
import { createMedia } from '@/lib/family/repo';
import { config } from '@/lib/config';

// 把 ffmpeg-static 的二进制路径交给 fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif'];
const VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.m4v'];

function extOf(name: string) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

// 把 EXIF DateTimeOriginal (Date 对象) 转成 YYYY-MM-DD HH:MM:SS
function exifDateToString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 用 ffmpeg 抽一帧 + 拿元数据（duration / width / height）
async function extractVideoFrame(
  videoPath: string,
  frameOutPath: string,
): Promise<{ width: number | null; height: number | null; duration: number | null }> {
  return new Promise((resolve) => {
    let width: number | null = null;
    let height: number | null = null;
    let duration: number | null = null;

    const cmd = ffmpeg(videoPath)
      // 第 1 秒抽一帧；视频不足 1 秒时自动取第一帧
      .on('end', () => resolve({ width, height, duration }))
      .on('error', (e) => {
        console.error('ffmpeg error:', e.message);
        resolve({ width, height, duration });
      })
      .screenshots({
        timestamps: ['1'],
        filename: path.basename(frameOutPath),
        folder: path.dirname(frameOutPath),
        size: '600x?',
      });

    // 顺便取元数据（codec_type 视频流的 width/height，format 的 duration）
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
}

export async function POST(req: NextRequest) {
  // 让后续异常能拿到 tmpdir 以便清理
  let tmpDir: string | null = null;

  try {
    const form = await req.formData();
    const file = form.get('file');
    const type = String(form.get('type') || '');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file required' }, { status: 400 });
    }
    if (type !== 'photo' && type !== 'video') {
      return NextResponse.json({ error: 'type must be photo or video' }, { status: 400 });
    }

    const ext = extOf(file.name);
    if (type === 'photo' && !PHOTO_EXTS.includes(ext)) {
      return NextResponse.json({ error: `unsupported photo format: ${ext}` }, { status: 400 });
    }
    if (type === 'video' && !VIDEO_EXTS.includes(ext)) {
      return NextResponse.json({ error: `unsupported video format: ${ext}` }, { status: 400 });
    }

    if (file.size > config.maxUploadSize) {
      return NextResponse.json(
        { error: `file too large, max ${Math.round(config.maxUploadSize / 1024 / 1024)}MB` },
        { status: 413 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();

    let width: number | null = null;
    let height: number | null = null;
    let duration: number | null = null;
    let thumbFilename: string | null = null;
    let mimeType = file.type || 'application/octet-stream';
    let exifTakenAt: string | null = null;

    if (type === 'photo') {
      const img = sharp(buf, { failOn: 'none' });
      const meta = await img.metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;

      const thumb = await img
        .resize({ width: 600, height: 600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      thumbFilename = await storage.save(thumb, file.name.replace(/\.[^.]+$/, '') + '.thumb.webp', 'image/webp');

      if (!mimeType.startsWith('image/')) {
        mimeType = `image/${ext.replace('.', '')}`;
        if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
      }

      // EXIF 提取拍摄时间（仅 JPEG/HEIC 通常有 EXIF；PNG/WebP 跳过）
      if (['.jpg', '.jpeg', '.heic', '.heif'].includes(ext)) {
        try {
          const exif = await exifr.parse(buf, ['DateTimeOriginal', 'CreateDate']);
          const d = (exif?.DateTimeOriginal || exif?.CreateDate) as Date | undefined;
          if (d instanceof Date && !isNaN(d.getTime())) {
            exifTakenAt = exifDateToString(d);
          }
        } catch {
          // EXIF 解析失败不影响上传
        }
      }
    } else {
      // 视频：mime 兜底
      mimeType = mimeType.startsWith('video/') ? mimeType : 'video/mp4';
    }

    // 先把原始视频存到永久位置（路径稳定，方便之后取）
    const filename = await storage.save(buf, file.name, mimeType);

    // 视频抽帧（仅本地存储有效；cos 模式下 absolutePath 不工作 → 后续扩展）
    if (type === 'video' && config.storage.driver === 'local') {
      try {
        tmpDir = await mkdtemp(path.join(tmpdir(), 'vid-'));
        const framePath = path.join(tmpDir, 'frame.jpg');
        const videoAbsPath = absolutePath(filename);

        const meta = await extractVideoFrame(videoAbsPath, framePath);
        width = meta.width;
        height = meta.height;
        duration = meta.duration;

        // sharp 把抽出的 jpg 再压成 WebP 缩略图（与照片缩略图统一规格）
        try {
          const frameBuf = await readFile(framePath);
          const webp = await sharp(frameBuf, { failOn: 'none' })
            .resize({ width: 600, height: 600, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          thumbFilename = await storage.save(
            webp,
            file.name.replace(/\.[^.]+$/, '') + '.thumb.webp',
            'image/webp',
          );
        } catch (e: any) {
          console.error('frame→webp failed:', e?.message);
          // 抽帧失败也不阻断上传，thumbFilename 保持 null
        }
      } catch (e: any) {
        console.error('video thumb extraction failed:', e?.message);
      }
    }

    // taken_at 优先级：用户表单 > EXIF > null
    const userTakenAt = (form.get('taken_at') as string) || null;
    const takenAt = userTakenAt || exifTakenAt;

    const media = createMedia({
      type,
      filename,
      original_name: file.name,
      mime_type: mimeType,
      size: file.size,
      width,
      height,
      duration,
      thumb_filename: thumbFilename,
      title: (form.get('title') as string) || null,
      description: (form.get('description') as string) || null,
      taken_at: takenAt,
      album_id: form.get('album_id') ? Number(form.get('album_id')) : null,
    });

    return NextResponse.json({ item: media });
  } catch (e: any) {
    console.error('upload error:', e);
    return NextResponse.json({ error: e?.message || 'upload failed' }, { status: 500 });
  } finally {
    // 清理临时目录
    if (tmpDir) {
      rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}