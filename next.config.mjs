/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: '/training-app',
  assetPrefix: '/training-app/',
  images: {
    unoptimized: true
  }
};

export default nextConfig;
