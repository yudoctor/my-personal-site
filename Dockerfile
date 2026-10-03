# 多阶段构建：先编译，再生成最小运行镜像
# ==============================================================

# ---- Stage 1: deps ----
# 安装完整 deps（含 sharp / archiver 的 native binding）
FROM node:22-bookworm-slim AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
# sharp 在某些镜像上需要跳过下载预编译，强制装对应平台二进制
RUN npm ci --include=optional

# ---- Stage 2: builder ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Stage 3: runner ----
# 极小运行时：Debian-slim + 仅必要的 native libs + standalone 输出
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# sharp 在 Debian-slim 上需要这些系统库（libvips 等）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libc6 \
    && rm -rf /var/lib/apt/lists/*

# 非 root 运行（安全）
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# 复制 standalone 输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# 复制 .next/static（standalone 不会带，Next.js 服务启动时需要的静态资源）
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# public 目录如果有
COPY --from=builder --chown=nextjs:nodejs /app/public ./public 2>/dev/null || true

# 数据 + 上传目录（挂卷点）
RUN mkdir -p /app/data /app/uploads \
    && chown -R nextjs:nodejs /app/data /app/uploads
VOLUME ["/app/data", "/app/uploads"]

USER nextjs

EXPOSE 3000

# 启动命令：standalone 产物里 server.js 是入口
CMD ["node", "server.js"]

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:3000/api/family/stats',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"