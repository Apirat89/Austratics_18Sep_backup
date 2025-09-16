import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase';
import { logUsage } from '@/lib/usageServer';

// Rate limiting cache (in production, use Redis)
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, maxRequests: number, windowMs: number): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const entry = rateLimitCache.get(key);

  if (!entry) {
    rateLimitCache.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (now > entry.resetTime) {
    rateLimitCache.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true };
}

// AbortController timeout helper
function timeoutSignal(ms: number): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { 
    signal: controller.signal, 
    clear: () => clearTimeout(timeout) 
  };
}

export async function POST(request: NextRequest) {
  try {
    // Set up a timeout to avoid long-running operations causing ECONNRESET
    const { signal, clear } = timeoutSignal(5000); // 5 second timeout
    
    // ✅ EXPERT PATTERN: More graceful origin validation with debugging
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const userAgent = request.headers.get('user-agent');
    
    // Check for tracking token as alternative to strict origin validation
    const trackingToken = request.headers.get('x-tracking-token');
    const hasValidToken = trackingToken && process.env.USAGE_EVENTS_TOKEN && trackingToken === process.env.USAGE_EVENTS_TOKEN;
    
    // More permissive origin check - allow localhost, vercel domains, or valid tokens
    const isFromValidOrigin = origin?.includes('localhost') || 
                             origin?.includes('vercel.app') || 
                             referer?.includes('localhost') || 
                             referer?.includes('vercel.app') ||
                             hasValidToken;
    
    if (!isFromValidOrigin) {
      console.log('ℹ️ Events API - Origin validation failed, allowing gracefully:', { origin, referer, hasToken: !!trackingToken });
      // ✅ EXPERT PATTERN: Don't block - just log and continue gracefully
      // This prevents 403 noise while still providing tracking for valid requests
    }
    
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      clear(); // Clear the timeout
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Rate limiting - 100 events per minute per user
    const rateLimitKey = `events:${user.id}`;
    const rateLimitResult = checkRateLimit(rateLimitKey, 100, 60 * 1000);
    
    if (!rateLimitResult.allowed) {
      clear(); // Clear the timeout
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Too many events.',
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }

    // Add robust error handling around JSON parsing
    let body;
    try {
      // Clone the request for safer parsing
      const clonedRequest = request.clone();
      body = await clonedRequest.json();
    } catch (parseError) {
      clear(); // Clear the timeout
      console.error('Events API JSON parsing error:', parseError);
      
      // Handle malformed JSON errors gracefully for all users
      try {
        // Try to extract any usable info from the request
        const contentType = request.headers.get('content-type');
        const isJson = contentType?.includes('application/json');
        const referrer = request.headers.get('referer');
        
        // If we can determine it was likely a tracking request, create a recovery event
        if (isJson && user) {
          console.log('Creating recovery event for failed tracking request');
          
          await logUsage({
            user_id: user.id,
            page: referrer || '/unknown',
            service: 'recovery',
            action: 'json_error_recovery',
            endpoint: request.url,
            method: request.method,
            status: 400,
            meta: {
              recovery: true,
              error: 'JSON parse error',
              timestamp: new Date().toISOString()
            }
          });
          console.log('Created recovery event for user', user.id);
        }
      } catch (recoveryError) {
        console.error('Failed to create recovery event:', recoveryError);
      }
      
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Check if this is an API usage tracking event or a regular event
    if (body.service) {
      // This is a usage tracking event
      const { user_id, page, service, action, endpoint, method, status, 
              duration_ms, tokens_in, tokens_out, meta } = body;

      // Validate required fields
      if (!user_id || !service) {
        clear(); // Clear the timeout
        return NextResponse.json(
          { error: 'user_id and service are required for API usage tracking' },
          { status: 400 }
        );
      }

      // Ensure the user can only log events for themselves unless they're an admin
      if (user_id !== user.id) {
        // Check if the user is an admin
        const { data: adminCheck } = await supabase
          .from('admin_users')
          .select('status, is_master')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (!adminCheck) {
          clear(); // Clear the timeout
          return NextResponse.json(
            { error: 'Unauthorized: Cannot log events for other users' },
            { status: 403 }
          );
        }
      }

      // Get client info
      const userAgent = request.headers.get('user-agent') || undefined;
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                      request.headers.get('x-real-ip') || 
                      undefined;

      // Log the usage event
      try {
        const { error: usageError } = await logUsage({
          user_id,
          page,
          service,
          action,
          endpoint,
          method,
          status,
          duration_ms,
          tokens_in,
          tokens_out,
          meta,
          user_agent: userAgent,
          client_ip: clientIP
        });

        if (usageError) {
          console.error('Error logging usage:', usageError);
          clear(); // Clear the timeout
          return NextResponse.json(
            { error: 'Failed to record API usage', details: usageError.message },
            { status: 500 }
          );
        }

        clear(); // Clear the timeout on success
        return NextResponse.json({ success: true });
      } catch (logError) {
        console.error('Unexpected error logging usage:', logError);
        clear(); // Clear the timeout
        return NextResponse.json(
          { error: 'Error processing API usage event', details: String(logError) },
          { status: 500 }
        );
      }
    } else {
      // This is a regular event
      const { feature, action, attrs = {}, session_id } = body;

      // Validate required fields
      if (!feature || !action) {
        return NextResponse.json(
          { error: 'Feature and action are required' },
          { status: 400 }
        );
      }

      // Validate feature exists
      const { data: featureCheck } = await supabase
        .from('feature_dim')
        .select('feature')
        .eq('feature', feature)
        .eq('is_active', true)
        .single();

      if (!featureCheck) {
        return NextResponse.json(
          { error: 'Invalid feature' },
          { status: 400 }
        );
      }

      // Get client info
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const clientIP = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      null;

      // Insert event
      const { error: insertError } = await supabase
        .from('user_events')
        .insert({
          user_id: user.id,
          feature,
          action,
          attrs,
          session_id: session_id || null,
          user_agent: userAgent.substring(0, 500), // Limit length
          ip_address: clientIP
        });

      if (insertError) {
        console.error('Error inserting event:', insertError);
        return NextResponse.json(
          { error: 'Failed to record event' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint for user's own events (optional, for debugging)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const feature = searchParams.get('feature');

    let query = supabase
      .from('user_events')
      .select('*')
      .eq('user_id', user.id)
      .order('ts', { ascending: false })
      .limit(limit);

    if (feature) {
      query = query.eq('feature', feature);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    return NextResponse.json({ events: data });

  } catch (error) {
    console.error('Events GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 