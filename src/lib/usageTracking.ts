/**
 * Client-side utilities for tracking API usage
 */

export type TrackArgs = {
  userId: string;
  page?: string;
  service: 'maptiler' | 'supabase' | 'gemini' | 'news' | 'sa2' | 'internal' | string;
  action?: string;
  endpoint?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  meta?: Record<string, any>;
};

/**
 * Track an API call using the events endpoint
 */
export async function trackApiCall(args: TrackArgs) {
  if (!args.userId) {
    console.debug('Skipping API tracking: No userId provided');
    return; // No tracking without a user ID
  }
  
  try {
    // Debug logging with user ID suffix (not exposing full ID)
    const userIdSuffix = args.userId.substring(0, 8) + '...';
    console.debug(`📊 Tracking API call for user ${userIdSuffix} to ${args.service}:`, {
      page: args.page,
      action: args.action,
      endpoint: args.endpoint,
      method: args.method
    });
    
    const response = await fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include', // Add this to ensure authentication cookies are sent
      body: JSON.stringify({
        user_id: args.userId,
        page: args.page || (typeof window !== 'undefined' ? window.location.pathname : undefined),
        service: args.service,
        action: args.action,
        endpoint: args.endpoint,
        method: args.method,
        status: args.status,
        duration_ms: args.durationMs,
        tokens_in: args.tokensIn,
        tokens_out: args.tokensOut,
        meta: args.meta,
      })
    });
    
    if (!response.ok) {
      console.warn(`📊 API tracking failed with status ${response.status}`);
      
      // If tracking fails, retry with additional diagnostic info
      console.info('Retrying tracking with diagnostic info...');
      try {
        const retryResponse = await fetch('/api/events', {
          method: 'POST',
          headers: { 
            'content-type': 'application/json',
            'x-api-debug': 'true'
          },
          credentials: 'include',
          body: JSON.stringify({
            user_id: args.userId,
            page: args.page || (typeof window !== 'undefined' ? window.location.pathname : undefined),
            service: args.service + '_retry',
            action: args.action,
            endpoint: args.endpoint,
            method: args.method,
            status: args.status,
            duration_ms: args.durationMs,
            tokens_in: args.tokensIn,
            tokens_out: args.tokensOut,
            meta: {
              ...args.meta,
              isRetry: true,
              originalError: response.status
            },
          })
        });
        
        console.info(`Retry tracking response: ${retryResponse.status}`);
      } catch (retryError) {
        console.error('Retry tracking also failed:', retryError);
      }
    } else {
      console.debug(`📊 API tracking successful`);
    }
  } catch (err) {
    console.error('Failed to track API call:', err);
    // Silent failure - don't disrupt user experience if tracking fails
  }
}

/**
 * Enhanced fetch wrapper that automatically tracks API calls
 */
export async function trackedFetch(
  userId: string, 
  service: TrackArgs['service'], 
  input: RequestInfo | URL, 
  init?: RequestInit & { action?: string }
) {
  if (!userId) {
    return fetch(input, init); // Just do a regular fetch if no user ID
  }

  const start = performance.now();
  try {
    // Add credentials if not explicitly set
    const fetchInit = {
      ...init,
      credentials: init?.credentials || 'include'
    };
    
    const res = await fetch(input, fetchInit);
    const duration = Math.round(performance.now() - start);
    
    // Track the successful API call
    trackApiCall({
      userId,
      page: typeof window !== 'undefined' ? window.location.pathname : undefined,
      service,
      action: init?.action,
      endpoint: typeof input === 'string' ? input : input.toString(),
      method: init?.method || 'GET',
      status: res.status,
      durationMs: duration
    });
    
    return res;
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    
    // Track the failed API call
    trackApiCall({
      userId,
      page: typeof window !== 'undefined' ? window.location.pathname : undefined,
      service,
      action: init?.action,
      endpoint: typeof input === 'string' ? input : input.toString(),
      method: init?.method || 'GET',
      status: 0, // Use 0 to indicate a client-side error
      durationMs: duration,
      meta: { error: String(err) }
    });
    
    throw err; // Re-throw the error for the caller to handle
  }
} 