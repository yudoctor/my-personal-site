/**
 * 家庭生活记录模块 - 数据访问层（Repository）
 * 所有 SQL 集中在这里，方便后期切到 MySQL/PostgreSQL
 */
import { getDb } from '@/lib/db';
import { getStorage } from '@/lib/storage';
import type { Album, Media, Movie, FamilyStats } from './types';

function withUrls<T extends Media>(row: T): T {
  const storage = getStorage();
  return {
    ...row,
    url: storage.publicUrl(row.filename),
    thumb_url: row.thumb_filename ? storage.publicUrl(row.thumb_filename) : null,
  };
}

// ===== Albums =====
export function listAlbums(): Album[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT a.*, (SELECT COUNT(*) FROM media m WHERE m.album_id = a.id AND m.type='photo') AS photo_count
       FROM albums a
       ORDER BY a.updated_at DESC`,
    )
    .all() as Album[];
}

export function getAlbum(id: number): Album | null {
  const db = getDb();
  return (
    (db.prepare('SELECT * FROM albums WHERE id = ?').get(id) as Album | undefined) ?? null
  );
}

export function createAlbum(name: string, description?: string): Album {
  const db = getDb();
  const info = db
    .prepare('INSERT INTO albums (name, description) VALUES (?, ?)')
    .run(name, description ?? null);
  return getAlbum(Number(info.lastInsertRowid))!;
}

export function deleteAlbum(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM albums WHERE id = ?').run(id);
}

/**
 * 级联删除相册：同时删除相册内所有照片（物理文件 + 缩略图 + DB 行）
 * 返回删除的照片数量
 */
export async function cascadeDeleteAlbum(id: number): Promise<{ photosDeleted: number }> {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, filename, thumb_filename FROM media WHERE album_id = ? AND type = 'photo'")
    .all(id) as { id: number; filename: string; thumb_filename: string | null }[];
  const storage = getStorage();
  for (const r of rows) {
    await storage.delete(r.filename);
    if (r.thumb_filename) await storage.delete(r.thumb_filename);
    db.prepare('DELETE FROM media WHERE id = ?').run(r.id);
  }
  db.prepare('DELETE FROM albums WHERE id = ?').run(id);
  return { photosDeleted: rows.length };
}

/**
 * 仅解除相册关联（保留照片）：把相册内所有照片的 album_id 置 NULL
 * 返回被解除关联的照片数量
 */
export function unlinkAlbumPhotos(id: number): number {
  const db = getDb();
  const info = db
    .prepare("UPDATE media SET album_id = NULL WHERE album_id = ? AND type = 'photo'")
    .run(id);
  return info.changes;
}

export function updateAlbum(
  id: number,
  patch: { name?: string; description?: string | null; cover_media_id?: number | null },
): Album | null {
  const db = getDb();
  const fields: string[] = [];
  const params: any[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    fields.push(`${k} = ?`);
    params.push(v);
  }
  if (!fields.length) return getAlbum(id);
  params.push(id);
  db.prepare(`UPDATE albums SET ${fields.join(', ')}, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(...params);
  return getAlbum(id);
}

// ===== Media (通用) =====
export function listMedia(opts: { type?: 'photo' | 'video'; albumId?: number; limit?: number; q?: string } = {}): Media[] {
  const db = getDb();
  const where: string[] = [];
  const params: any[] = [];
  if (opts.type) {
    where.push('m.type = ?');
    params.push(opts.type);
  }
  if (opts.albumId !== undefined) {
    where.push('m.album_id = ?');
    params.push(opts.albumId);
  }
  if (opts.q && opts.q.trim()) {
    where.push('(m.title LIKE ? OR m.original_name LIKE ? OR m.description LIKE ?)');
    const kw = `%${opts.q.trim()}%`;
    params.push(kw, kw, kw);
  }
  // 相册内按 position desc（自定义顺序），其他按时间 desc
  const orderBy = opts.albumId !== undefined
    ? 'm.position DESC, COALESCE(m.taken_at, m.created_at) DESC'
    : 'COALESCE(m.taken_at, m.created_at) DESC';
  const sql = `
    SELECT m.*, a.name AS album_name
    FROM media m
    LEFT JOIN albums a ON a.id = m.album_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY ${orderBy}
    LIMIT ?`;
  params.push(opts.limit ?? 500);
  const rows = db.prepare(sql).all(...params) as Media[];
  return rows.map(withUrls);
}

export function getMedia(id: number): Media | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT m.*, a.name AS album_name
       FROM media m LEFT JOIN albums a ON a.id = m.album_id
       WHERE m.id = ?`,
    )
    .get(id) as Media | undefined;
  return row ? withUrls(row) : null;
}

export function createMedia(input: {
  type: 'photo' | 'video';
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  thumb_filename?: string | null;
  title?: string | null;
  description?: string | null;
  taken_at?: string | null;
  album_id?: number | null;
}): Media {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO media
       (type, filename, original_name, mime_type, size, width, height, duration, thumb_filename, title, description, taken_at, album_id)
       VALUES (@type, @filename, @original_name, @mime_type, @size, @width, @height, @duration, @thumb_filename, @title, @description, @taken_at, @album_id)`,
    )
    .run({
      type: input.type,
      filename: input.filename,
      original_name: input.original_name,
      mime_type: input.mime_type,
      size: input.size,
      width: input.width ?? null,
      height: input.height ?? null,
      duration: input.duration ?? null,
      thumb_filename: input.thumb_filename ?? null,
      title: input.title ?? null,
      description: input.description ?? null,
      taken_at: input.taken_at ?? null,
      album_id: input.album_id ?? null,
    });

  // 自动设置相册封面：第一张照片入库时
  if (input.type === 'photo' && input.album_id) {
    const album = db.prepare('SELECT cover_media_id FROM albums WHERE id = ?').get(input.album_id) as
      | { cover_media_id: number | null }
      | undefined;
    if (album && album.cover_media_id == null) {
      db.prepare('UPDATE albums SET cover_media_id = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?')
        .run(info.lastInsertRowid, input.album_id);
    } else if (album) {
      // 已有封面，仅刷新 updated_at 触发相册排序前移
      db.prepare('UPDATE albums SET updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(input.album_id);
    }
  }

  return getMedia(Number(info.lastInsertRowid))!;
}

export function updateMedia(
  id: number,
  patch: Partial<{
    title: string | null;
    description: string | null;
    taken_at: string | null;
    album_id: number | null;
  }>,
): Media | null {
  const db = getDb();
  const fields: string[] = [];
  const params: any[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    fields.push(`${k} = ?`);
    params.push(v);
  }
  if (!fields.length) return getMedia(id);
  params.push(id);
  db.prepare(`UPDATE media SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getMedia(id);
}

export async function deleteMedia(id: number): Promise<void> {
  const db = getDb();
  const row = db.prepare('SELECT filename, thumb_filename FROM media WHERE id = ?').get(id) as
    | { filename: string; thumb_filename: string | null }
    | undefined;
  if (!row) return;
  const storage = getStorage();
  await storage.delete(row.filename);
  if (row.thumb_filename) await storage.delete(row.thumb_filename);
  db.prepare('DELETE FROM media WHERE id = ?').run(id);
}

/**
 * 批量删除照片
 */
export async function batchDeletePhotos(ids: number[]): Promise<number> {
  let n = 0;
  for (const id of ids) {
    await deleteMedia(id);
    n++;
  }
  return n;
}

/**
 * 批量修改相册归属（albumId 为 null 表示移出相册）
 */
export function batchUpdateAlbum(ids: number[], albumId: number | null): number {
  if (!ids.length) return 0;
  const db = getDb();
  const placeholders = ids.map(() => '?').join(',');
  const info = db
    .prepare(`UPDATE media SET album_id = ? WHERE id IN (${placeholders}) AND type = 'photo'`)
    .run(albumId, ...ids);
  // 刷新相册 updated_at
  if (albumId != null) {
    db.prepare("UPDATE albums SET updated_at = datetime('now', 'localtime') WHERE id = ?").run(albumId);
  }
  return info.changes;
}

/**
 * 重排相册内照片：按 ids 顺序设置 position（第一位 position 最大）
 */
export function reorderAlbumPhotos(albumId: number, ids: number[]): number {
  if (!ids.length) return 0;
  const db = getDb();
  const stmt = db.prepare('UPDATE media SET position = ? WHERE id = ? AND album_id = ? AND type = ?');
  const n = ids.length;
  let changes = 0;
  db.exec('BEGIN');
  try {
    for (let i = 0; i < n; i++) {
      const info = stmt.run(n - i, ids[i], albumId, 'photo');
      changes += info.changes;
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  db.prepare("UPDATE albums SET updated_at = datetime('now', 'localtime') WHERE id = ?").run(albumId);
  return changes;
}

// ===== Movies =====
export function listMovies(): Movie[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT m.*,
              p.filename AS poster_filename,
              v.filename AS video_filename
       FROM movies m
       LEFT JOIN media p ON p.id = m.poster_media_id
       LEFT JOIN media v ON v.id = m.video_media_id
       ORDER BY COALESCE(m.released_at, m.created_at) DESC`,
    )
    .all() as any[];
  const storage = getStorage();
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    poster_media_id: r.poster_media_id,
    poster_url: r.poster_filename ? storage.publicUrl(r.poster_filename) : null,
    video_media_id: r.video_media_id,
    video_url: storage.publicUrl(r.video_filename),
    duration: r.duration,
    director: r.director,
    cast: r.cast,
    released_at: r.released_at,
    created_at: r.created_at,
  }));
}

export function getMovie(id: number): Movie | null {
  const db = getDb();
  const r = db
    .prepare(
      `SELECT m.*,
              p.filename AS poster_filename,
              v.filename AS video_filename
       FROM movies m
       LEFT JOIN media p ON p.id = m.poster_media_id
       LEFT JOIN media v ON v.id = m.video_media_id
       WHERE m.id = ?`,
    )
    .get(id) as any;
  if (!r) return null;
  const storage = getStorage();
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    poster_media_id: r.poster_media_id,
    poster_url: r.poster_filename ? storage.publicUrl(r.poster_filename) : null,
    video_media_id: r.video_media_id,
    video_url: storage.publicUrl(r.video_filename),
    duration: r.duration,
    director: r.director,
    cast: r.cast,
    released_at: r.released_at,
    created_at: r.created_at,
  };
}

export function createMovie(input: {
  title: string;
  description?: string | null;
  poster_media_id?: number | null;
  video_media_id: number;
  duration?: number | null;
  director?: string | null;
  cast?: string | null;
  released_at?: string | null;
}): Movie {
  const db = getDb();
  const info = db
    .prepare(
      `INSERT INTO movies (title, description, poster_media_id, video_media_id, duration, director, cast, released_at)
       VALUES (@title, @description, @poster_media_id, @video_media_id, @duration, @director, @cast, @released_at)`,
    )
    .run({
      title: input.title,
      description: input.description ?? null,
      poster_media_id: input.poster_media_id ?? null,
      video_media_id: input.video_media_id,
      duration: input.duration ?? null,
      director: input.director ?? null,
      cast: input.cast ?? null,
      released_at: input.released_at ?? null,
    });
  return getMovie(Number(info.lastInsertRowid))!;
}

export function updateMovie(id: number, patch: Partial<{
  title: string;
  description: string | null;
  poster_media_id: number | null;
  duration: number | null;
  director: string | null;
  cast: string | null;
  released_at: string | null;
}>): Movie | null {
  const db = getDb();
  const fields: string[] = [];
  const params: any[] = [];
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    fields.push(`${k} = ?`);
    params.push(v);
  }
  if (!fields.length) return getMovie(id);
  params.push(id);
  db.prepare(`UPDATE movies SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getMovie(id);
}

export function deleteMovie(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM movies WHERE id = ?').run(id);
}

/**
 * "一年前的今天"：找过去年份、同月同日的照片，按时间倒序，最多 limit 张
 */
export function findOnThisDay(limit = 8): Media[] {
  const db = getDb();
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  // taken_at 形如 "2020-10-02 12:00:00"，substr(..., 6, 5) 取 MM-DD
  const mmdd = `${month}-${day}`;
  const rows = db
    .prepare(
      `SELECT m.*, a.name AS album_name
       FROM media m LEFT JOIN albums a ON a.id = m.album_id
       WHERE m.type = 'photo'
         AND substr(m.taken_at, 6, 5) = ?
         AND substr(m.taken_at, 1, 4) < ?
       ORDER BY m.taken_at DESC
       LIMIT ?`,
    )
    .all(mmdd, String(now.getFullYear()), limit) as Media[];
  return rows.map(withUrls);
}

/**
 * 时间线视图：按月分组统计，返回 [{ key: 'YYYY-MM', label, count }]
 */
export function listYearMonthStats(type: 'photo' | 'video' = 'photo'): { key: string; label: string; count: number }[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT substr(COALESCE(NULLIF(taken_at, ''), created_at), 1, 7) AS ym,
              COUNT(*) AS cnt
       FROM media
       WHERE type = ?
       GROUP BY ym
       HAVING ym IS NOT NULL AND length(ym) = 7
       ORDER BY ym DESC`,
    )
    .all(type) as { ym: string; cnt: number }[];
  return rows.map((r) => {
    const [y, m] = r.ym.split('-');
    return {
      key: r.ym,
      label: `${y} 年 ${parseInt(m, 10)} 月`,
      count: r.cnt,
    };
  });
}

// ===== Stats =====
export function getStats(): FamilyStats {
  const db = getDb();
  const r = db
    .prepare(
      `SELECT
         SUM(CASE WHEN type='photo' THEN 1 ELSE 0 END) AS photo_count,
         SUM(CASE WHEN type='video' THEN 1 ELSE 0 END) AS video_count,
         SUM(size) AS storage_used
       FROM media`,
    )
    .get() as { photo_count: number | null; video_count: number | null; storage_used: number | null };
  const album_count = (db.prepare('SELECT COUNT(*) AS c FROM albums').get() as { c: number }).c;
  const movie_count = (db.prepare('SELECT COUNT(*) AS c FROM movies').get() as { c: number }).c;
  return {
    photo_count: r.photo_count || 0,
    video_count: r.video_count || 0,
    movie_count,
    album_count,
    storage_used: r.storage_used || 0,
  };
}
