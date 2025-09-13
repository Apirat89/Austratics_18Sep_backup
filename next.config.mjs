/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output standalone build for better performance
  output: 'standalone',
  
  // Allow longer build time for complex pages
  staticPageGenerationTimeout: 180,
  
  // Experimental features needed for the app
  experimental: {
    clientTraceMetadata: ['baggage', 'sentry-trace'],
  },
  
  // React settings
  reactStrictMode: true,
  swcMinify: true,
  
  // Bypass TypeScript and ESLint checks during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Security headers (from original config)
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
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  }
}

export default nextConfig; 