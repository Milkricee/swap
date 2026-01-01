/**
 * Security Headers Configuration
 * 
 * Implements OWASP recommended security headers:
 * - HSTS (Strict-Transport-Security)
 * - CSP (Content-Security-Policy)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Referrer-Policy
 * - Permissions-Policy
 */

export const securityHeaders = [
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
      
      // Permissions Policy (disable unnecessary APIs)
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=()',
      },
      
      // Content Security Policy
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval in dev
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://api.changenow.io https://api.btcswapxmr.com https://xmr-node.cakewallet.com:18081",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
      
      // XSS Protection (legacy, but still useful)
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
    ],
  },
];

export const productionOnlyHeaders = [
  {
    source: '/:path*',
    headers: [
      // Stricter CSP for production (no unsafe-eval)
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://api.changenow.io https://api.btcswapxmr.com https://xmr-node.cakewallet.com:18081",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "upgrade-insecure-requests",
        ].join('; '),
      },
    ],
  },
];
