/**
 * SQLite 数据库封装（使用 Node 24 内置 node:sqlite）
 * 暴露与 better-sqlite3 类似的 API，便于平滑切换
 */
import { DatabaseSync, StatementSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config';

// 防止在客户端代码里被意外 import
if (typeof window !== 'undefined') {
  throw new Error('db.ts must only be used on the server');
}

export interface RunResult {
  lastInsertRowid: number | bigint;
  changes: number;
}

class StmtWrapper {
  constructor(private s: StatementSync) {}

  get(...params: any[]): any {
    const r = this.s.get(...this.normalize(params));
    return r == null ? r : toPlain(r);
  }

  all(...params: any[]): any[] {
    const rows = this.s.all(...this.normalize(params)) as any[];
    return rows.map(toPlain);
  }

  run(...params: any[]): RunResult {
    const r = this.s.run(...this.normalize(params));
    // node:sqlite 的 lastInsertRowid / changes 在大表时是 bigint，
    // 统一收窄为 number，方便上层 repo 无脑用
    return { lastInsertRowid: Number(r.lastInsertRowid), changes: Number(r.changes) };
  }

  // better-sqlite3 兼容：同时支持位置参数数组和命名参数对象
  private normalize(params: any[]): any[] {
    if (
      params.length === 1 &&
      params[0] !== null &&
      typeof params[0] === 'object' &&
      !Array.isArray(params[0])
    ) {
      return [params[0]];
    }
    return params;
  }
}

// node:sqlite 返回的对象带有非默认原型，不能直接传给 Client Component
// 用 JSON 深拷贝把它变成 plain object
function toPlain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

class DbWrapper {
  constructor(private db: DatabaseSync) {}

  prepare(sql: string): StmtWrapper {
    return new StmtWrapper(this.db.prepare(sql));
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  pragma(p: string): void {
    try { this.db.exec(p); } catch {}
  }
}

let _db: DbWrapper | null = null;

export function getDb(): DbWrapper {
  if (_db) return _db;

  const dir = path.dirname(config.databasePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new DatabaseSync(config.databasePath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // 兼容老库：media 表加 position 列（拖动排序用）
  try {
    db.exec('ALTER TABLE media ADD COLUMN position INTEGER NOT NULL DEFAULT 0');
  } catch {
    // 列已存在，忽略
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS albums (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      cover_media_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('photo','video')),
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      duration REAL,
      thumb_filename TEXT,
      title TEXT,
      description TEXT,
      taken_at TEXT,
      album_id INTEGER,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_media_type ON media(type);
    CREATE INDEX IF NOT EXISTS idx_media_album ON media(album_id);
    CREATE INDEX IF NOT EXISTS idx_media_taken ON media(taken_at);
    CREATE INDEX IF NOT EXISTS idx_media_album_pos ON media(album_id, position);

    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      poster_media_id INTEGER,
      video_media_id INTEGER NOT NULL,
      duration REAL,
      director TEXT,
      cast TEXT,
      released_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (poster_media_id) REFERENCES media(id) ON DELETE SET NULL,
      FOREIGN KEY (video_media_id) REFERENCES media(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_movies_released ON movies(released_at);
  `);

  _db = new DbWrapper(db);
  return _db;
}
