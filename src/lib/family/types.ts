/**
 * 家庭生活记录模块 - 数据类型定义
 * 与数据库行结构对应，给前端用的"出参"
 */
export interface Album {
  id: number;
  name: string;
  description: string | null;
  cover_media_id: number | null;
  created_at: string;
  updated_at: string;
  photo_count?: number;
}

export interface Media {
  id: number;
  type: 'photo' | 'video';
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  thumb_filename: string | null;
  title: string | null;
  description: string | null;
  taken_at: string | null;
  album_id: number | null;
  album_name?: string | null;
  created_at: string;
  url: string;
  thumb_url: string | null;
}

export interface Movie {
  id: number;
  title: string;
  description: string | null;
  poster_media_id: number | null;
  poster_url: string | null;
  video_media_id: number;
  video_url: string;
  duration: number | null;
  director: string | null;
  cast: string | null;
  released_at: string | null;
  created_at: string;
}

export interface FamilyStats {
  photo_count: number;
  video_count: number;
  movie_count: number;
  album_count: number;
  storage_used: number; // bytes
}
