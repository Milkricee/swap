import withBundleAnalyzer from '@next/bundle-analyzer';

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'html5-qrcode', '@radix-ui/react-icons'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Image optimization (for future use)
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 24 hours
  },
  
  // Turbopack config (empty to silence warning)
  turbopack: {},
  
  // Security Headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    
    return [
      {
        source: '/:path*',
        headers: [
          // Force HTTPS (HSTS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          
          // Prevent Clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          
          // Prevent MIME-sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: isDev 
              ? [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: https:",
                  "font-src 'self' data: https://fonts.gstatic.com",
                  "connect-src 'self' https://api.coingecko.com https://api.changenow.io https://api.btcswapxmr.com https://xmr-node.cakewallet.com:18081 https://stagenet.xmr-tw.org:38081",
                  "frame-ancestors 'none'",
                ].join('; ')
              : [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                  "img-src 'self' data: https:",
                  "font-src 'self' data: https://fonts.gstatic.com",
                  "connect-src 'self' https://api.coingecko.com https://api.changenow.io https://api.btcswapxmr.com https://xmr-node.cakewallet.com:18081 https://stagenet.xmr-tw.org:38081",
                  "frame-ancestors 'none'",
                  "upgrade-insecure-requests",
                ].join('; '),
          },
          
          // XSS Protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
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

// Export with bundle analyzer wrapper
export default bundleAnalyzer(nextConfig);
