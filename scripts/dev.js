#!/usr/bin/env node
/**
 * 开发服务器包装脚本
 * - 启动 next dev
 * - 等 Ready 后预热所有路由（避免冷启动第一次访问时 SWC worker 超时触发红屏）
 * - 关闭时优雅杀掉子进程（Ctrl+C）
 *
 * 使用：npm run dev 走的就是这个文件
 */
const { spawn } = require('node:child_process');
const http = require('node:http');

const PORT = 3000;
const ROUTES = [
  '/',
  '/family',
  '/family/albums',
  '/family/photos',
  '/family/videos',
  '/family/movies',
  '/family/photos/1',
  '/family/photos/1?lightbox=1',
  '/family/albums/1',
  '/growth',
  '/memories',
  '/tools',
  '/about',
];

const isWin = process.platform === 'win32';
// 用 shell:true + 单字符串命令，避免 Windows 上 npx.cmd 的 EINVAL
const cmd = isWin ? `npx next dev -p ${PORT}` : `npx next dev -p ${PORT}`;
const child = spawn(cmd, {
  stdio: ['ignore', 'pipe', 'inherit'], // stdout 用 pipe 才能监 "Ready in"
  shell: true,
  env: process.env,
  windowsHide: true,
});

function pollReady(retries = 60) {
  return new Promise((resolve, reject) => {
    const tick = (i) => {
      if (i <= 0) return reject(new Error('timeout waiting for next dev'));
      const req = http.get({ hostname: '127.0.0.1', port: PORT, path: '/', timeout: 1000 }, (res) => {
        res.resume();
        // 任何响应（含 200/500）说明已 Ready；第一次可能 404 也是 Ready
        resolve();
      });
      req.on('error', () => setTimeout(() => tick(i - 1), 500));
      req.on('timeout', () => { req.destroy(); setTimeout(() => tick(i - 1), 500); });
    };
    tick(retries);
  });
}

async function warmup() {
  await pollReady();
  console.log('\n[warmup] dev server ready, pre-compiling routes...\n');
  for (const path of ROUTES) {
    const t0 = Date.now();
    await new Promise((resolve) => {
      const req = http.get({ hostname: '127.0.0.1', port: PORT, path, timeout: 30000 }, (res) => {
        res.resume();
        res.on('end', () => {
          const ms = Date.now() - t0;
          const color = res.statusCode === 200 ? '\x1b[32m' : '\x1b[33m';
          console.log(`${color}[warmup]${'\x1b[0m'} ${res.statusCode}  ${String(ms).padStart(5)}ms  ${path}`);
          resolve();
        });
      });
      req.on('error', (e) => {
        console.log(`\x1b[31m[warmup]\x1b[0m  ERR  ${String(Date.now() - t0).padStart(5)}ms  ${path}  ${e.message}`);
        resolve();
      });
      req.on('timeout', () => { req.destroy(); resolve(); });
    });
  }
  console.log('\n[warmup] all routes primed. ready for browser.\n');
}

// 等到 stdout 出现 "Ready in" 才开始预热（避免在编译中发请求触发 SWC worker 崩溃）
let warmed = false;
child.stdout?.on('data', (chunk) => {
  if (!warmed && chunk.toString().includes('Ready in')) {
    warmed = true;
    // 给 webpack-dev 一个缓冲
    setTimeout(warmup, 1500);
  }
});

const shutdown = () => {
  console.log('\n[dev] stopping child...');
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F']);
  } else {
    child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(0), 200);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

child.on('exit', (code) => {
  console.log(`[dev] next dev exited with code ${code}`);
  process.exit(code ?? 0);
});