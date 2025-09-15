// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    clientTraceMetadata: ['baggage', 'sentry-trace'],
  },
  // Add these configurations to ignore ESLint and TypeScript errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Longer timeout for static page generation and standalone output
  staticPageGenerationTimeout: 120,
  output: 'standalone',
  
  // Add image domains for Next.js Image component
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
      { protocol: 'https', hostname: '*.maptiler.com' },
    ],
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
              "img-src 'self' data: blob: https: https://api.maptiler.com https://*.supabase.co https://*.supabase.in",
              "connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.maptiler.com https://generativelanguage.googleapis.com https://*.sentry.io",
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

// Export the config directly without Sentry wrapping temporarily
module.exports = nextConfig; 