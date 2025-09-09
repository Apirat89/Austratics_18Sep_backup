'use client';

import { useEffect, useState } from 'react';
import { initializeTelemetry, telemetry } from '@/lib/telemetry';

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize telemetry system once
    if (!initialized) {
      try {
        initializeTelemetry();
        
        // Track app startup
        telemetry.trackSync({
          feature: 'map',
          action: 'view',
          attrs: { page: 'app_startup' }
        });

        setInitialized(true);
        console.log('[Telemetry] System initialized and ready');
      } catch (error) {
        console.warn('[Telemetry] Initialization failed:', error);
      }
    }
  }, [initialized]);

  return <>{children}</>;
} 