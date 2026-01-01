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
  
  // Turbopack config (empty to silence warning)
  turbopack: {},
  
  // Webpack config for monero-javascript (Node.js modules in browser)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Completely ignore monero-javascript in client bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        'monero-javascript': false,
      };
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
        child_process: false,
        dns: false,
        process: false,
      };
    }
    return config;
  },
  
  // Keep monero-javascript server-side only
  serverExternalPackages: ['monero-javascript'],
};

export default nextConfig;
