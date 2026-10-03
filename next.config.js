/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // standalone 模式：next build 会输出 .next/standalone/，只包含运行所需的 node_modules，
  // Docker 镜像可以直接拷它，极小（约 80-100 MB vs 完整 node_modules 400+ MB）
  output: 'standalone',
  // 上传大文件（视频、家庭微电影可能很大）
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
    // sharp 已经是预编译二进制，但显式标记能让 Next.js 不去打包它
    serverComponentsExternalPackages: ['sharp', 'archiver', 'ffmpeg-static', 'fluent-ffmpeg'],
  },
};

module.exports = nextConfig;
