import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase';
import { authenticateAdmin, checkAdminRateLimit } from '../../../../../lib/adminAuth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    const authResult = await authenticateAdmin(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode }
      );
    }

    // Rate limiting
    const rateLimitKey = `admin-usage-never-used:${authResult.user!.id}`;
    const rateLimitResult = checkAdminRateLimit(rateLimitKey, 100, 60 * 1000);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    
    // Parse parameters
    const feature = searchParams.get('feature');
    const window = searchParams.get('window') || '90d';
    
    // Validate required feature parameter
    if (!feature) {
      return NextResponse.json(
        { error: 'Feature parameter is required' },
        { status: 400 }
      );
    }

    // Validate feature exists
    const { data: featureCheck } = await supabase
      .from('feature_dim')
      .select('feature, label')
      .eq('feature', feature)
      .eq('is_active', true)
      .single();

    if (!featureCheck) {
      return NextResponse.json(
        { error: 'Invalid or inactive feature' },
        { status: 400 }
      );
    }

    // Validate window format
    const windowRegex = /^(\d+)([dwmy])$/;
    const match = window.match(windowRegex);
    if (!match) {
      return NextResponse.json(
        { error: 'Invalid window format. Use format like "30d", "7d", "90d"' },
        { status: 400 }
      );
    }

    const [, amount, unit] = match;
    const numAmount = parseInt(amount);
    let intervalString: string;
    
    switch (unit) {
      case 'd': intervalString = `${numAmount} days`; break;
      case 'w': intervalString = `${numAmount * 7} days`; break;
      case 'm': intervalString = `${numAmount * 30} days`; break;
      case 'y': intervalString = `${numAmount * 365} days`; break;
      default: intervalString = '90 days';
    }

    // Execute the never-used query
    const { data, error } = await supabase.rpc('get_users_never_used_feature', {
      target_feature: feature,
      window_days: intervalString
    });

    if (error) {
      console.error('Error executing never-used query:', error);
      return NextResponse.json(
        { error: 'Failed to fetch never-used users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      feature,
      feature_label: featureCheck.label,
      window,
      total_never_used: data?.length || 0,
      data: data || []
    });

  } catch (error) {
    console.error('Admin usage never-used API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 