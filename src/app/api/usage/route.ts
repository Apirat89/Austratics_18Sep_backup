import { NextRequest, NextResponse } from 'next/server';
import { summarizeUsage, checkForAbuse, summarizeAllUsersUsage } from '@/lib/usageServer';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Authenticate request
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Simplified admin check - if you can access the master page, you're an admin
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('id, is_master')
      .eq('email', user.email)
      .maybeSingle();

    console.log('Admin check result:', { 
      userEmail: user.email, 
      userId: user.id,
      isAdmin: !!adminCheck 
    });

    // Get query params
    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('user_id');
    const summaryType = searchParams.get('summary');

    // Handle all-users summary (admin only)
    if (summaryType === 'all_users') {
      // Only admins can view all users' data
      if (!adminCheck) {
        return NextResponse.json(
          { ok: false, error: 'Unauthorized: Admin access required' },
          { status: 403 }
        );
      }

      // Get days param for time period
      const daysParam = searchParams.get('days');
      const days = daysParam ? parseInt(daysParam, 10) : 30;
      
      if (isNaN(days) || days <= 0) {
        return NextResponse.json(
          { ok: false, error: 'Invalid days parameter' },
          { status: 400 }
        );
      }

      // Get all users' summary
      const summary = await summarizeAllUsersUsage(days);
      return NextResponse.json(summary);
    }

    // Regular single-user request
    // Allow users to see their own data, and admins to see any data
    if (!adminCheck && requestedUserId !== user.id) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized to view this user data' },
        { status: 403 }
      );
    }

    const targetUserId = requestedUserId || user.id;
    
    // Parse window parameters
    const windowsParam = searchParams.get('windows');
    const windows = windowsParam 
      ? windowsParam.split(',').map(n => parseInt(n.trim(), 10)).filter(Boolean)
      : [7, 15, 30, 60, 90];

    // Get usage summary
    const data = await summarizeUsage(targetUserId, windows);
    
    // Basic check for potential abuse
    const abuseCheck = adminCheck ? await checkForAbuse(targetUserId) : null;
    
    return NextResponse.json({
      ok: true,
      data,
      suspectedAbuse: abuseCheck?.isAbusing || false
    });
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to retrieve usage data' },
      { status: 500 }
    );
  }
} 