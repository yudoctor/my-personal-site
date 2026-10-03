/**
 * 存储抽象层
 * 首期：本地文件系统（uploads/）
 * 后期：腾讯云 COS（实现同样的接口即可平滑切换）
 */
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from './config';

export interface StorageDriver {
  save(buf: Buffer, filename: string, mimeType: string): Promise<string>; // 返回存储 key
  read(key: string): Promise<{ stream: NodeJS.ReadableStream; size: number; mimeType: string }>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string; // 给前端展示用的 URL
}

class LocalStorage implements StorageDriver {
  private root = config.uploadDir;

  private async ensureDir(dir: string) {
    if (!fs.existsSync(dir)) await fs.promises.mkdir(dir, { recursive: true });
  }

  // 用日期分目录，避免单目录文件过多
  private datePath(): string {
    const d = new Date();
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  async save(buf: Buffer, filename: string, _mimeType: string): Promise<string> {
    // 生成不冲突的文件名：时间戳 + 随机串 + 原扩展名
    const ext = path.extname(filename) || '';
    const hash = crypto.randomBytes(6).toString('hex');
    const stamp = Date.now();
    const safeName = `${stamp}_${hash}${ext}`;

    const relDir = this.datePath();
    const absDir = path.join(this.root, relDir);
    await this.ensureDir(absDir);

    const absPath = path.join(absDir, safeName);
    await fs.promises.writeFile(absPath, buf);

    return path.posix.join(relDir, safeName);
  }

  async read(key: string) {
    const absPath = path.join(this.root, key);
    const stat = await fs.promises.stat(absPath);
    const stream = fs.createReadStream(absPath);
    const ext = path.extname(key).toLowerCase();
    const mimeType = guessMime(ext);
    return { stream, size: stat.size, mimeType };
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.promises.stat(path.join(this.root, key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    const absPath = path.join(this.root, key);
    if (fs.existsSync(absPath)) await fs.promises.unlink(absPath);
  }

  publicUrl(key: string): string {
    // 本地存储：通过我们自己的 API 路由暴露（支持 Range，断点续传）
    return `/api/media/${key}`;
  }
}

function guessMime(ext: string): string {
  const map: Record<string, string> = {
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
  return map[ext] || 'application/octet-stream';
}

let _storage: StorageDriver | null = null;

export function getStorage(): StorageDriver {
  if (_storage) return _storage;
  // 后期扩展：if (config.storage.driver === 'cos') return new CosStorage(...)
  _storage = new LocalStorage();
  return _storage;
}

/**
 * 绝对路径（仅服务端使用，比如缩略图生成）
 */
export function absolutePath(key: string): string {
  return path.join(config.uploadDir, key);
}
