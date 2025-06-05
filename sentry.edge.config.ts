import * as Sentry from "@sentry/nextjs";

// Only initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    
    // Performance Monitoring
    tracesSampleRate: 1.0,
    
    // Debug mode for development
    debug: process.env.NODE_ENV === 'development',
    
    // Environment
    environment: process.env.NODE_ENV,
  });
} else {
  console.log('🟡 Sentry DSN not provided - edge monitoring disabled');
} 