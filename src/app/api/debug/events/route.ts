import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase';

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

    // Get events count and latest events
    const { data: eventsCount, error: countError } = await supabase
      .from('user_events')
      .select('*', { count: 'exact' })
      .limit(0);

    const { data: allEvents, error: allEventsError } = await supabase
      .from('user_events')
      .select('*')
      .order('ts', { ascending: false })
      .limit(10);

    const { data: userEvents, error: userEventsError } = await supabase
      .from('user_events')
      .select('*')
      .eq('user_id', user.id)
      .order('ts', { ascending: false })
      .limit(10);

    const { data: features, error: featuresError } = await supabase
      .from('feature_dim')
      .select('*')
      .eq('is_active', true);

    return NextResponse.json({
      user_id: user.id,
      user_email: user.email,
      total_events: eventsCount?.length || 0,
      user_events_count: userEvents?.length || 0,
      latest_events: allEvents || [],
      user_latest_events: userEvents || [],
      active_features: features || [],
      errors: {
        countError,
        allEventsError,
        userEventsError,
        featuresError
      }
    });

  } catch (error) {
    console.error('Debug events API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
} 