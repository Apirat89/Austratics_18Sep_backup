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

export async function POST(request: NextRequest) {
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

    // Rate limiting - 100 events per minute per user
    const rateLimitKey = `events:${user.id}`;
    const rateLimitResult = checkRateLimit(rateLimitKey, 100, 60 * 1000);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Too many events.',
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Check if this is an API usage tracking event or a regular event
    if (body.service) {
      // This is a usage tracking event
      const { user_id, page, service, action, endpoint, method, status, 
              duration_ms, tokens_in, tokens_out, meta } = body;

      // Validate required fields
      if (!user_id || !service) {
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
        return NextResponse.json(
          { error: 'Failed to record API usage' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
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
      { error: 'Internal server error' },
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