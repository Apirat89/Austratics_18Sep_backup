import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase';

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