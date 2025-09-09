import React, { useCallback, useRef } from 'react';

export type TelemetryFeature = 
  | 'faq_chat'
  | 'sa2'
  | 'map'
  | 'saved_items'
  | 'homecare'
  | 'residential'
  | 'regulation'
  | 'news'
  | 'insights';

export type TelemetryAction = 
  | 'open'
  | 'search'
  | 'message'
  | 'toggle_layer'
  | 'add'
  | 'remove'
  | 'clear'
  | 'end'
  | 'login'
  | 'view'
  | 'click'
  | 'filter'
  | 'sort'
  | 'export'
  | 'compare'
  | 'bookmark';

export interface TelemetryEvent {
  feature: TelemetryFeature;
  action: TelemetryAction;
  attrs?: Record<string, any>;
  session_id?: string;
}

// Session ID management
let globalSessionId: string | null = null;

function getSessionId(): string {
  if (!globalSessionId) {
    globalSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  return globalSessionId;
}

// Reset session (call on login/logout)
export function resetTelemetrySession(): void {
  globalSessionId = null;
}

// Queue for offline/failed events
let eventQueue: TelemetryEvent[] = [];
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

// Track online status
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true;
    flushEventQueue();
  });
  
  window.addEventListener('offline', () => {
    isOnline = false;
  });
}

// Send event to API
async function sendTelemetryEvent(event: TelemetryEvent): Promise<boolean> {
  try {
    const payload = {
      ...event,
      session_id: event.session_id || getSessionId(),
      timestamp: new Date().toISOString()
    };

    const response = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // User not authenticated, skip telemetry
        console.warn('[Telemetry] User not authenticated, skipping event');
        return false;
      }
      
      if (response.status === 429) {
        // Rate limited, add to queue for later
        console.warn('[Telemetry] Rate limited, queuing event');
        eventQueue.push(event);
        return false;
      }
      
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('[Telemetry] Event sent successfully:', event.feature, event.action);
    return true;

  } catch (error) {
    console.warn('[Telemetry] Event failed:', error, 'Event:', event);
    
    // Add to queue if we're offline or request failed
    if (!isOnline || eventQueue.length < 100) { // Limit queue size
      eventQueue.push(event);
    }
    
    return false;
  }
}

// Flush queued events
async function flushEventQueue(): Promise<void> {
  if (!isOnline || eventQueue.length === 0) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  for (const event of eventsToSend) {
    const success = await sendTelemetryEvent(event);
    if (!success) {
      // If failed, add back to front of queue
      eventQueue.unshift(event);
      break; // Stop processing if one fails
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

// Public API
export const telemetry = {
  track: (event: TelemetryEvent): Promise<boolean> => {
    return sendTelemetryEvent(event);
  },
  
  trackSync: (event: TelemetryEvent): void => {
    // Fire and forget
    sendTelemetryEvent(event).catch(() => {
      // Silently handle errors
    });
  },
  
  flush: flushEventQueue,
  
  getQueueSize: (): number => eventQueue.length,
  
  clearQueue: (): void => {
    eventQueue = [];
  }
};

// React Hook
export function useTelemetry() {
  const sessionId = useRef<string>(getSessionId());
  
  const track = useCallback((feature: TelemetryFeature, action: TelemetryAction, attrs?: Record<string, any>) => {
    return telemetry.track({
      feature,
      action,
      attrs,
      session_id: sessionId.current
    });
  }, []);

  const trackSync = useCallback((feature: TelemetryFeature, action: TelemetryAction, attrs?: Record<string, any>) => {
    telemetry.trackSync({
      feature,
      action,
      attrs,
      session_id: sessionId.current
    });
  }, []);

  // Helper methods for common patterns
  const trackFeatureOpen = useCallback((feature: TelemetryFeature, attrs?: Record<string, any>) => {
    trackSync(feature, 'open', attrs);
  }, [trackSync]);

  const trackFeatureClose = useCallback((feature: TelemetryFeature, attrs?: Record<string, any>) => {
    trackSync(feature, 'end', attrs);
  }, [trackSync]);

  const trackSearch = useCallback((feature: TelemetryFeature, query: string, resultCount?: number) => {
    trackSync(feature, 'search', { query, result_count: resultCount });
  }, [trackSync]);

  const trackClick = useCallback((feature: TelemetryFeature, element: string, attrs?: Record<string, any>) => {
    trackSync(feature, 'click', { element, ...attrs });
  }, [trackSync]);

  const trackPageView = useCallback((feature: TelemetryFeature, page?: string) => {
    trackSync(feature, 'view', { page });
  }, [trackSync]);

  return {
    track,
    trackSync,
    trackFeatureOpen,
    trackFeatureClose,
    trackSearch,
    trackClick,
    trackPageView,
    sessionId: sessionId.current,
    queueSize: telemetry.getQueueSize()
  };
}

// Higher-order component for automatic page tracking
export function withTelemetry<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  feature: TelemetryFeature,
  componentName?: string
): React.ComponentType<T> {
  return function TelemetryWrapper(props: T) {
    const { trackFeatureOpen, trackFeatureClose } = useTelemetry();

    // Track on mount
    React.useEffect(() => {
      trackFeatureOpen(feature, { component: componentName });
      
      return () => {
        trackFeatureClose(feature, { component: componentName });
      };
    }, [trackFeatureOpen, trackFeatureClose]);

    return React.createElement(WrappedComponent, props);
  };
}

// Utility functions
export function createTelemetryAttributes(data: Record<string, any>): Record<string, any> {
  // Clean and prepare attributes for telemetry
  const attrs: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value != null) {
      // Convert complex objects to strings, limit length
      if (typeof value === 'object') {
        attrs[key] = JSON.stringify(value).substring(0, 200);
      } else {
        attrs[key] = String(value).substring(0, 200);
      }
    }
  }
  
  return attrs;
}

// Initialize telemetry (call once in app startup)
export function initializeTelemetry(): void {
  // Flush queue periodically
  if (typeof window !== 'undefined') {
    setInterval(() => {
      if (isOnline && eventQueue.length > 0) {
        flushEventQueue();
      }
    }, 30000); // Every 30 seconds

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      if (eventQueue.length > 0) {
        // Use sendBeacon if available for more reliable delivery
        if (navigator.sendBeacon) {
          try {
            const payload = JSON.stringify(eventQueue.slice(0, 10)); // Limit size
            navigator.sendBeacon('/api/events/batch', payload);
          } catch (error) {
            // Ignore errors
          }
        }
      }
    });
  }
} 