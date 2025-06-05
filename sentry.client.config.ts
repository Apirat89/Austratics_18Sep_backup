import * as Sentry from "@sentry/nextjs";

// Only initialize Sentry if DSN is provided
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    
    // Performance Monitoring
    tracesSampleRate: 1.0,
    
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Debug mode for development
    debug: process.env.NODE_ENV === 'development',
    
    // Environment
    environment: process.env.NODE_ENV,
    
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
} else {
  console.log('🟡 Sentry DSN not provided - monitoring disabled');
} 