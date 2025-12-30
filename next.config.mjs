/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'html5-qrcode'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
