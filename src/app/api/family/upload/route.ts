/**
 * 通用媒体上传接口
 * POST /api/family/upload
 *   formData: file, type=photo|video, album_id?, title?, description?, taken_at?
 * 返回: { item: Media }
 *
 * 自动行为：
 *  - 照片：sharp 解析宽高 + 生成 WebP 缩略图
 *  - 照片：尝试从 EXIF 提取 DateTimeOriginal 作为 taken_at（仅当用户未手动指定）
 */
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import exifr from 'exifr';
import { getStorage } from '@/lib/storage';
import { createMedia } from '@/lib/family/repo';
import { config } from '@/lib/config';

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

export async function POST(req: NextRequest) {
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
      mimeType = mimeType.startsWith('video/') ? mimeType : 'video/mp4';
    }

    const filename = await storage.save(buf, file.name, mimeType);

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
  }
}
