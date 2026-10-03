#!/usr/bin/env bash
# 服务器侧部署脚本（被 GitHub Actions 通过 SSH 调用）
# 用法：deploy-server.sh <registry> <namespace> <image-name>
# 例  ：deploy-server.sh ccr.ccs.tencentyun.com mysite my-personal-site
#
# 行为：
#   1. 拉取最新镜像
#   2. 停旧容器、起新容器（数据卷不动 → SQLite/uploads 不丢）
#   3. 清掉 dangling 镜像，省磁盘
#
# 假设：
#   - 当前目录就是项目根（docker-compose.yml 在这里）
#   - 用 docker compose v2（apt 装 docker.io 自带）

set -euo pipefail

REGISTRY="${1:-}"
NAMESPACE="${2:-}"
IMAGE="${3:-}"

if [ -z "$REGISTRY" ] || [ -z "$NAMESPACE" ] || [ -z "$IMAGE" ]; then
  echo "Usage: $0 <registry> <namespace> <image-name>" >&2
  exit 1
fi

FULL_IMAGE="${REGISTRY}/${NAMESPACE}/${IMAGE}:latest"
echo "▶ deploying ${FULL_IMAGE}"

# 1. 拉镜像
echo "  pull image..."
docker pull "${FULL_IMAGE}"

# 2. 滚动重启（docker compose 会自动用最新 tag）
echo "  recreate container..."
cd "$(dirname "$0")/.."
docker compose up -d --no-deps --force-recreate site

# 3. 等几秒让服务起来
echo "  waiting for boot..."
sleep 5

# 4. 简单探活
if curl -sf http://127.0.0.1:3000/api/family/stats >/dev/null; then
  echo "✅ deploy OK ($(docker compose ps --format json site | head -1))"
else
  echo "❌ health check failed; recent logs:"
  docker compose logs --tail=50 site
  exit 1
fi

# 5. 清 dangling 镜像（保留 latest + tagged）
echo "  prune dangling images..."
docker image prune -f >/dev/null

echo "done."