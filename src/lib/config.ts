/**
 * 全局配置：从环境变量读取，集中导出
 * 后期切到腾讯云 COS 时，只改这里和 storage.ts 两个文件即可
 */
import path from 'node:path';

const root = process.cwd();

export const config = {
  env: process.env.NODE_ENV || 'development',
  databasePath: path.resolve(root, process.env.DATABASE_PATH || './data/site.db'),
  uploadDir: path.resolve(root, process.env.UPLOAD_DIR || './uploads'),
  maxUploadSize: Number(process.env.MAX_UPLOAD_SIZE || 524288000), // 500MB
  storage: {
    driver: (process.env.STORAGE_DRIVER || 'local') as 'local' | 'cos',
    cos: {
      secretId: process.env.COS_SECRET_ID || '',
      secretKey: process.env.COS_SECRET_KEY || '',
      region: process.env.COS_REGION || 'ap-guangzhou',
      bucket: process.env.COS_BUCKET || '',
    },
  },
  // 站点元信息
  site: {
    name: '朝暮成序',
    title: '朝暮成序 · 个人站',
    description: '记录家庭、生活与成长的个人主页',
  },
};

export type AppConfig = typeof config;
