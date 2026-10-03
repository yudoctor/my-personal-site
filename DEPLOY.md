# 部署指南（腾讯云 · Docker）

## 文件清单

| 文件 | 作用 |
|---|---|
| `Dockerfile` | 多阶段构建：先装 deps + build，再用最小运行时镜像跑 |
| `docker-compose.yml` | 单机部署编排（端口、卷、环境变量、健康检查） |
| `.dockerignore` | 排除 `node_modules`、`.next`、本地 data/uploads |

构建出来的镜像约 **150-200 MB**（含 sharp / archiver 的 native 二进制 + standalone 产物）。

---

## 部署流程（5 步，~15 分钟）

### 1. 准备腾讯云服务器

- 选 **轻量应用服务器**（2核2G 起步，标准型 50GB SSD 够用）
- 系统：**Ubuntu 22.04 LTS**（Docker 官方支持最好）
- 安全组开放 **80 / 443**（Nginx 反代用），**3000** 可以不开

### 2. 服务器装 Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # 当前用户免 sudo（重新登录生效）
docker --version                 # 验证：Docker version 24+ 即可
```

### 3. 上传项目 + 构建镜像

方式 A：git clone（推荐）
```bash
cd /opt
sudo git clone <你的仓库地址> my-personal-site
cd my-personal-site/my-personal-site
sudo docker compose build --no-cache
```

方式 B：本地构建后推镜像
```bash
# 本地
docker build -t my-personal-site:1.0 .
# 推到腾讯云 TCR（容器镜像服务）或个人 docker hub
docker tag my-personal-site:1.0 ccr.ccs.tencentyun.com/<你的命名空间>/my-personal-site:1.0
docker push <镜像地址>
# 服务器上 pull 即可
```

### 4. 启动

```bash
# 在项目根目录（docker-compose.yml 所在）
sudo docker compose up -d
sudo docker compose logs -f site    # 查启动日志
```

启动后看到：
```
✓ Ready in 543ms
```
就 OK 了。

### 5. Nginx 反代 + HTTPS

`/etc/nginx/sites-available/my-site`：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 600M;  # 比 Next.js 的 500MB 上限留余量

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 视频拖动（Range 头）必须保留
        proxy_pass_request_headers on;
        proxy_buffering off;          # 视频流需要
    }
}
```

启用 + 申请 HTTPS：
```bash
sudo ln -s /etc/nginx/sites-available/my-site /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 申请证书（Certbot + Let's Encrypt）
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 数据持久化

`docker-compose.yml` 已经把 `./data` 和 `./uploads` 挂到容器内 `/app/data` / `/app/uploads`。

- **数据库**：`./data/site.db`（SQLite + WAL 模式）
- **上传文件**：`./uploads/YYYY/MM/xxx.jpg`

建议在腾讯云控制台再做个**快照**或定期备份 `./data` 到 COS。

---

## 日常运维

```bash
# 查状态
sudo docker compose ps

# 看日志
sudo docker compose logs -f site --tail=100

# 重启
sudo docker compose restart site

# 升级（拉新代码后）
sudo git pull
sudo docker compose build --no-cache site
sudo docker compose up -d site

# 进入容器调试
sudo docker compose exec site sh
```

---

## 故障排查

| 现象 | 原因 | 解决 |
|---|---|---|
| 容器启动后立刻退出 | 日志里查具体错 | `docker compose logs site` |
| 上传 413 | `client_max_body_size` 不够 | Nginx 配 600M；`next.config.js` 是 500mb |
| 视频拖动卡 | proxy_buffering 没关 | Nginx 配 `proxy_buffering off` |
| 缩略图不显示 | sharp native binary 不匹配 | Dockerfile 用 `node:22-bookworm-slim`（glibc），不要换 Alpine |
| 数据丢失 | 没挂卷 | 立刻 `docker compose down`（不删卷），从快照恢复 |
| 第一次访问慢 | cold start | 预热：写个 cron 跑 `curl http://127.0.0.1:3000/api/family/stats` |

---

## 升级到 COS（媒体文件太多时）

不重启容器，**只改环境变量**：
```yaml
# docker-compose.yml 里加
- STORAGE_DRIVER=cos
- COS_SECRET_ID=xxx
- COS_SECRET_KEY=xxx
- COS_REGION=ap-guangzhou
- COS_BUCKET=xxx-12345
```

`sudo docker compose up -d` 即可，已上传的文件写个一次性迁移脚本。

---

## 升级到 MySQL/PostgreSQL（高写入场景）

加一个 `db` service 到 docker-compose，DATABASE_PATH 改连接串。
**注意**：当前代码全用 SQLite（`node:sqlite`），切 MySQL 需要重写 `repo.ts`，建议等真的有 100+ 并发再动。

---

## CI/CD：GitHub Actions 自动部署

仓库已配 `.github/workflows/deploy.yml`：push 到 main 自动构建镜像、推 TCR、SSH 服务器滚动重启。

### 一次配置（5 个 Secrets）

在 GitHub 仓库页面 → **Secrets and variables → Actions → New repository secret**：

| Secret 名 | 怎么拿 |
|---|---|
| `TCR_REGISTRY` | TCR 实例的访问地址，如 `ccr.ccs.tencentyun.com`（控制台 → 容器镜像服务 → 实例 → 访问地址） |
| `TCR_NAMESPACE` | 你创建的命名空间名，如 `mysite` |
| `TCR_USERNAME` | TCR 访问凭证的用户名（不是腾讯云账号！**控制台 → 访问凭证 → 新建**） |
| `TCR_PASSWORD` | 同上对应的密码 |
| `SERVER_HOST` | 腾讯云服务器公网 IP |
| `SERVER_SSH_KEY` | 服务器的 SSH 私钥（用 `ssh-keygen` 单独搞一对，部署专用） |
| `SERVER_USER` | SSH 用户名（默认 `root`，可省） |

### 使用流程

```bash
# 1. 在腾讯云 TCR 控制台新建访问凭证（用户名/密码），填到 GitHub Secrets
# 3. 服务器上生成部署密钥对，把私钥贴进 SERVER_SSH_KEY，公钥放到 ~/.ssh/authorized_keys
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ''

# 4. push 代码即自动部署
git push origin main   # 触发 build + push + deploy
git tag v1.0.0 && git push --tags   # 只构建+推送不自动部署
```

### 触发后的行为

```
push main
   ↓
[1] Build & push image (Ubuntu runner, ~3-4 min)
   ↓ 镜像推到 TCR
[2] Deploy to server (SSH)
   ↓ 拉新镜像 + 滚动重启
[3] Health check (/api/family/stats)
   ↓ 200 → ✅
   非 200 → ❌ 失败，日志在 Actions 页面
```

### 部署保护（可选但推荐）

`deploy.yml` 用了 `environment: production` —— GitHub 会让你配置**审批人**。每次部署需要审批者点 "Approve" 才会真触发 SSH，避免误推。

配置：**Settings → Environments → production → Required reviewers**（填你的 GitHub 用户名）。

### 不想用 Actions？

完全 OK，`docker compose up -d` 手动也行。Actions 是可选的便利工具，去掉不会影响应用本身。