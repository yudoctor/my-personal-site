# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> 本仓库为「朝暮成序 · 个人站」——Next.js 14 App Router + TypeScript + SQLite + 本地存储的个人项目。下面是给后续 Claude 实例的工作指南。

## 项目设计意图（先理解再动）

这是个人项目，但**架构是为长期演进留了口子的**：

- **5 模块占位**：family 是首期完整实现，其余 4 个是 placeholder。后续新增模块的成本被刻意压到"加数组一项 + 加页面"
- **存储可换**：本地存储只是首期实现，**抽象层（`StorageDriver`）是给腾讯云 COS 预留的**。任何新文件读写必须走 `getStorage()`，**禁止直接 `fs.writeFile` 落 uploads 目录**，否则未来切 COS 时会漏数据
- **SQL 一处管**：所有 SQL 在 `src/lib/<module>/repo.ts`。业务层禁止在 page / route 里直接 `db.prepare(...)`
- **路由分层**：`/api/<module>/*` 走业务 REST，`/api/media/*` 是跨模块共享的媒体流代理，**不要为某个模块再开一个媒体流路由**

如果改动会破坏以上任一约定，先停下来确认，而不是绕过去。

## 常用命令

```bash
cd my-personal-site

npm run dev       # 启动开发服务（默认 http://localhost:3000）
npm run build     # 生产构建
npm run start     # 启动生产服务（同 3000）
npm run lint      # next lint
```

首次启动前：

```bash
cp .env.example .env.local   # 默认配置即可，本地存储 + ./data/site.db
npm install
```

当前未配置测试框架与 CI；没有 `npm test` 之类的脚本。lint 也只跑 `next lint` 的默认规则。

## 关键架构

### 1. 模块注册中心：`src/lib/modules.ts`

5 大模块（family / growth / memories / tools / about）全部以数组形式注册。**新增模块只需两步**：
- 在 `src/app/(modules)/<key>/` 下放 `page.tsx`
- 在 `modules` 数组追加一项（设置 `status: 'active' | 'placeholder'`）

首页卡片导航、顶部 `Navbar`、`getModule(pathname)` 全部自动跟随，无需改其他文件。

### 2. 存储抽象层：`src/lib/storage.ts`

定义 `StorageDriver` 接口（`save / read / exists / delete / publicUrl`），目前只有 `LocalStorage` 实现。

- 上传文件落盘路径：`uploads/<YYYY>/<MM>/<timestamp>_<rand6><ext>`
- 前端拿到的 URL 走 `/api/media/<key>`（不是直连文件系统），由媒体流路由代理，支持 HTTP Range（视频拖动 / 断点播放）
- 切到腾讯云 COS 的迁移点已经预留：`.env.local` 里的 `STORAGE_DRIVER=cos`、`COS_*`；只需在 `storage.ts` 加一个 `CosStorage` 类并在 `getStorage()` 里按 driver 选择即可
- `absolutePath(key)` 仅服务端缩略图生成等需要绝对路径时使用

### 3. 数据库层：`src/lib/db.ts`

注意：**用 Node 24 内置的 `node:sqlite`**（`DatabaseSync` / `StatementSync`），不是 `better-sqlite3`。README 提到的 better-sqlite3 是历史口径，实际代码已切到 `node:sqlite`。

`getDb()` 是单例，首次调用时：
- 打开 `data/site.db`，自动 `mkdir -p`
- 启用 WAL + foreign_keys
- 对老库做一次幂等的 `ALTER TABLE media ADD COLUMN position`（拖动排序用，`try/catch` 吞掉「列已存在」）
- `CREATE TABLE IF NOT EXISTS` 建 albums / media / movies 三张表
- 注意点：`node:sqlite` 返回的对象带非默认原型，**不能直接传给 Client Component**；用 `toPlain()` 走 `JSON.parse(JSON.stringify(...))` 转 plain object

### 4. 数据访问层：`src/lib/family/repo.ts`

所有 SQL 集中在这一个文件。约定：
- 所有返回给前端的 Media 行都会经过 `withUrls()` 自动补 `url` 和 `thumb_url`（通过 `storage.publicUrl`）
- 时间序：`COALESCE(taken_at, created_at) DESC`；相册内则按 `position DESC`（手工排序）优先
- 事务 / 批量：`reorderAlbumPhotos()` 里手动 `BEGIN/COMMIT/ROLLBACK`
- 「一年前的今天」：`findOnThisDay()` 用 `substr(taken_at, 6, 5)` 匹配 MM-DD
- 自动行为：上传首张照片到相册时，自动设为 `albums.cover_media_id`

类型定义见 `src/lib/family/types.ts`，与 DB 列对应。

### 5. 上传管线：`src/app/api/family/upload/route.ts`

`POST /api/family/upload`（`multipart/form-data`）：
- 校验扩展名（照片 `.jpg/.jpeg/.png/.webp/.gif/.heic/.heif`；视频 `.mp4/.mov/.webm/.mkv/.avi/.m4v`）
- 大小上限：`config.maxUploadSize`（默认 500MB，`next.config.js` 里 serverActions `bodySizeLimit` 已同步）
- 照片走 `sharp`：取宽高 + 生成 600px 内的 WebP 缩略图
- JPEG/HEIC 走 `exifr` 抽 `DateTimeOriginal` 作 `taken_at` 候选
- `taken_at` 优先级：用户表单 > EXIF > null
- 第一张照片入库时自动设相册封面（`repo.ts` 里完成）

### 6. 媒体流：`src/app/api/media/[...path]/route.ts`

`runtime = 'nodejs'`、`dynamic = 'force-dynamic'`。关键点：
- **防穿越**：拒绝 `..` 和含 `\0` 的路径段
- 支持 HTTP Range：解析 `bytes=start-end`，返回 206 + `Content-Range`；无 Range 返回完整流
- 响应头：`Accept-Ranges: bytes`、`Cache-Control: private, max-age=3600`
- `Readable.toWeb(fs.createReadStream(...))` 是 Node 流到 Web 流的桥

### 7. 路由分组：`src/app/(modules)/`

括号目录是 Next.js 的 Route Group，**不进 URL**——所以 `/family` 直接对应 `src/app/(modules)/family/page.tsx`。每个模块自带 `layout.tsx`（如 `family/layout.tsx`）渲染子导航 tab。复用模块的 layout 只用复制 family 的样式，照搬 `tabs` 数组即可。

API 路由全部在 `src/app/api/`，family 模块独占 `/api/family/*`；公共媒体走 `/api/media/[...path]`。

## 关键组件与功能速查

后续 Claude 常会先扫 `src/components/`，以下是主要组件和它们的存在理由：

| 组件 | 用途 | 关键依赖 |
|---|---|---|
| `Navbar` | 顶部导航，从 `modules.ts` 自动生成 | `usePathname` |
| `MediaUploader` | 照片 / 视频批量上传，**串行提交**避免一次性打爆 serverActions body 上限 | `fetch` + `FormData` |
| `AlbumCreator` / `AlbumEditor` | 相册 CRUD | — |
| `PhotoEditor` / `VideoEditor` | 单条元信息编辑（标题、描述、拍摄时间、归属相册） | — |
| `AlbumPhotoGrid` | 相册内照片瀑布流 + 拖动排序（调 `/api/family/photos/reorder`） | — |
| `PhotoList` | 全部照片视图 + 多选批量操作 | — |
| `PhotoActions` / `VideoActions` | 单条 / 批量操作的工具栏 | — |
| `SearchBox` | 顶部搜索，搜标题 / 原文件名 / 描述（repo 的 `listMedia({ q })`） | — |
| `Lightbox` | 全屏看图 / 看视频，键盘左右切换 | — |
| `MovieCreator` / `MovieActions` / `MoviePosterEditor` | 微电影创建、操作、海报裁剪（`sharp` 抠图） | `sharp` |

**容易漏掉的端点**（除了 README 列出的 CRUD 外）：

- `POST /api/family/photos/batch` — 批量删除 / 批量改相册归属
- `POST /api/family/photos/reorder` — 相册内拖动排序（事务里按 ids 顺序写 `position`）
- `GET /api/family/albums/[id]/export` — **整本相册打包下载 ZIP**，依赖 `archiver`（`serverComponentsExternalPackages` 已声明，**不要在客户端 import**）
- `POST /api/family/movies/[id]/poster` — 微电影海报二次生成 / 替换

**archiver 依赖的唯一用途**就是相册 ZIP 导出；除非做这个功能，不要随便往依赖里加新东西。

## 约定与坑点

- **路径别名**：`@/*` → `./src/*`（`tsconfig.json`）
- **Tailwind 扫描**：`./src/app/**/*.{ts,tsx}`、`./src/components/**/*.{ts,tsx}`、`./src/modules/**/*.{ts,tsx'`——新增目录要同步加进 `content` 数组
- **品牌色**：Tailwind 自定义 `brand-50..900`（橙色），组件里统一用 `bg-brand-500 / text-brand-600` 等
- **服务端 / 客户端分界**：
  - `src/lib/db.ts` 顶部有 `if (typeof window !== 'undefined') throw`，**绝对不要在 Client Component 里 import 它**
  - `src/lib/storage.ts` import 了 `server-only`，同样服务端独享
  - 当前约定：`src/app/(modules)/**/page.tsx` 和 `src/app/api/**` 默认是 Server Component / Route Handler；需要 hooks 或浏览器能力的（表单、上传组件、Lightbox、Navbar 等）放在 `src/components/` 并显式 `'use client'`
  - Server Component 可以直接 `import` 服务端独享模块；Client Component 想拿数据只能通过 props（从 Server Component 传）或 `/api/*` 路由
  - **不要把 `'use client'` 加到 page.tsx**：会强制整页走客户端渲染，丢掉直接查 DB 的能力
- **媒体大小上限**：三处必须同步——`MAX_UPLOAD_SIZE` 环境变量、`next.config.js` 的 `serverActions.bodySizeLimit: '500mb'`、`sharp/archiver` 已声明为 `serverComponentsExternalPackages`
- **写真存路径稳定**：DB 的 `filename` 是相对路径（`YYYY/MM/xxx`）。切到 COS 时这部分不用动，只需写一次性脚本把 `uploads/` 下的实体文件批量传到 COS 对应 key 即可
- **拖动排序**：`media.position` 列，第一位最大；只在相册视图生效（`listMedia({ albumId })` 时按 `position DESC` 排序，其他视图按时间）
- **SQLite 写并发**：`db.exec('BEGIN')` 是同步的；事务里 `run` 也是同步；不要在事务里写 `await`（repo 里通过外层事务包批量 sync 操作绕开）
- **EXIF 解析失败**：上传链路 `try/catch` 静默吞掉，不会阻断上传

## 后续模块开发 checklist

参考 family 落地一个新模块（以「growth」为例）：
1. `src/app/(modules)/growth/page.tsx`：占位即可（`status: 'placeholder'`），或直接做实页
2. `src/lib/modules.ts`：把 `growth` 的 `status` 改成 `'active'`、`icon` 改成合适的字符
3. 业务表 / API：`src/lib/growth/repo.ts` + `src/lib/growth/types.ts` + `src/app/api/growth/*`
4. 若需要存储新文件类型，复用 `getStorage()`，无需改存储层
5. 模块内子导航：在 `src/app/(modules)/growth/layout.tsx` 仿 family 的 tabs

## 环境与部署速记

- 本地数据：`data/site.db`、`uploads/`——已加入 `.gitignore`，部署时挂卷保留
- 部署方式见 README「腾讯云部署」一节（PM2 / Docker 两套）；Docker 镜像需挂 `-v /data/site/uploads:/app/uploads` 和 `-v /data/site/db:/app/data`
- COS 迁移说明在 README 末尾有完整步骤，照做即可，**DB schema 与代码不需要改**
- Node 版本：≥ 18 即可，但为了用内置 `node:sqlite` 建议 **Node 22+ / 24**（package.json 里 `@types/node: ^22.7.4` 已声明）