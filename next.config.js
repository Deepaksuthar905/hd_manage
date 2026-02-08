/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: 'http', hostname: 'localhost', pathname: '/uploads/**' }] },
};

module.exports = nextConfig;
