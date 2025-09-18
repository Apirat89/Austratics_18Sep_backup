import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    clientTraceMetadata: ['baggage', 'sentry-trace'],
  },
  outputFileTracingRoot: process.cwd(),
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://unpkg.com https://cdn.maptiler.com https://*.sentry.io",
              "style-src 'self' 'unsafe-inline' https://cdn.maptiler.com",
              "img-src 'self' data: blob: https: https://api.maptiler.com",
              "connect-src 'self' https://*.supabase.co https://api.maptiler.com https://generativelanguage.googleapis.com https://*.sentry.io",
              "font-src 'self' data:",
              "worker-src 'self' blob: data:",
              "child-src 'self' blob: data:",
              "frame-src 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

// Sentry configuration
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Only upload source maps in production
  silent: process.env.NODE_ENV !== 'production',
  
  // Upload source maps for better error tracking
  widenClientFileUpload: true,
  sourcemaps: {
    disable: false,
    deleteSourcemapsAfterUpload: true,
  },
  disableLogger: true,
});
