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
    const rateLimitKey = `admin-usage-rankings:${authResult.user!.id}`;
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
    const window = searchParams.get('window') || '30d';
    const userId = searchParams.get('user_id');
    
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
      default: intervalString = '30 days';
    }

    // Execute the rankings query
    const { data, error } = await supabase.rpc('get_user_feature_rankings', {
      window_days: intervalString
    });

    if (error) {
      console.error('Error executing rankings query:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feature rankings' },
        { status: 500 }
      );
    }

    // Filter by user if specified
    let filteredData = data || [];
    if (userId) {
      filteredData = filteredData.filter((row: any) => row.user_id === userId);
    }

    return NextResponse.json({
      window,
      user_id: userId || null,
      data: filteredData
    });

  } catch (error) {
    console.error('Admin usage rankings API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 