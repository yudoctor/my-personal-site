# 朝暮成序 · 个人站

个人主页，预留 5 大模块。首期实现 **家庭生活记录** 模块（照片 / 视频 / 家庭微电影）。

## 技术栈

- Next.js 14 (App Router) + TypeScript
- SQLite (better-sqlite3) + 自写 Repository 层
- Tailwind CSS
- 本地文件存储（抽象层，后期一行切到腾讯云 COS）

## 5 大模块

| # | 模块 | 路径 | 状态 |
|---|---|---|---|
| 1 | 家庭生活记录 | `/family` | 首期完整开发 |
| 2 | 个人成长 | `/growth` | 占位 |
| 3 | 时光收藏 | `/memories` | 占位 |
| 4 | 实用工具 | `/tools` | 占位 |
| 5 | 关于我 | `/about` | 占位 |

新增模块：往 `src/app/(modules)/<模块名>/` 加页面 + 在 `src/lib/modules.ts` 加一行。

## 本地启动

```bash
# 安装依赖（首次）
npm install

# 复制环境变量（默认即可）
cp .env.example .env.local

# 启动开发服务
npm run dev
# 浏览器打开 http://localhost:3000
```

数据库文件：首次启动自动创建 `data/site.db`。
上传文件：保存在 `uploads/`，按 `年/月/` 自动分目录。

## 目录结构

```
src/
├── app/
│   ├── (modules)/
│   │   ├── family/             # 家庭生活记录（首期）
│   │   │   ├── page.tsx        # 概览
│   │   │   ├── albums/         # 相册
│   │   │   ├── photos/         # 照片
│   │   │   ├── videos/         # 视频
│   │   │   └── movies/         # 微电影
│   │   ├── growth/             # 占位
│   │   ├── memories/           # 占位
│   │   ├── tools/              # 占位
│   │   └── about/              # 占位
│   ├── api/
│   │   ├── family/             # 家庭模块 REST API
│   │   └── media/[...path]/    # 媒体流（支持 Range 断点播放）
│   ├── layout.tsx
│   ├── page.tsx                # 首页
│   └── globals.css
├── components/                 # 客户端组件
├── lib/
│   ├── config.ts               # 全局配置
│   ├── db.ts                   # SQLite 单例 + 表结构
│   ├── storage.ts              # 存储抽象（本地/COS 切换）
│   ├── modules.ts              # 模块注册
│   └── family/
│       ├── repo.ts             # 数据访问层
│       └── types.ts            # 类型定义
└── ...
```

## 腾讯云部署

### 方式 A：单服务器 + PM2

1. 选购腾讯云轻量应用服务器（2核2G 足够首期用）
2. 安装 Node.js 18+、Nginx
3. 克隆代码、`npm install`、`npm run build`
4. 用 PM2 守护：`pm2 start npm --name site -- start`
5. Nginx 反代 3000 端口 + 域名/HTTPS

### 方式 B：Docker（更标准化）

```bash
docker build -t my-site .
docker run -d --name my-site -p 3000:3000 \
  -v /data/site/uploads:/app/uploads \
  -v /data/site/db:/app/data \
  my-site
```

### 媒体存储迁移到 COS

1. 在腾讯云 COS 创建桶，开启公有读 + 私有写
2. 安装 `cos-nodejs-sdk-v5`
3. 在 `src/lib/storage.ts` 增加 `CosStorage` 类实现 `StorageDriver` 接口
4. `.env` 切驱动：
   ```
   STORAGE_DRIVER=cos
   COS_SECRET_ID=xxx
   COS_SECRET_KEY=xxx
   COS_REGION=ap-guangzhou
   COS_BUCKET=xxx-12345
   ```
5. 已上传文件可写个一次性脚本批量上传到 COS，DB 里 filename 保持相对路径即可

### HTTPS 域名

腾讯云 SSL 控制台申请免费证书 → Nginx 配 443 → 强制 301 跳 HTTPS。

## API 速查（家庭模块）

```
GET    /api/family/stats
GET    /api/family/albums
POST   /api/family/albums          { name, description? }
DELETE /api/family/albums?id=

GET    /api/family/photos?album_id=&limit=
DELETE /api/family/photos/[id]
PATCH  /api/family/photos/[id]     { title?, description?, album_id? }

GET    /api/family/videos?limit=
DELETE /api/family/videos/[id]

POST   /api/family/upload          multipart: file, type, album_id?, title?, description?, taken_at?
GET    /api/family/movies
POST   /api/family/movies          { title, video_media_id, ... }
GET    /api/family/movies/[id]
PATCH  /api/family/movies/[id]
DELETE /api/family/movies/[id]

GET    /api/media/<year>/<month>/<file>     # 支持 Range
```
