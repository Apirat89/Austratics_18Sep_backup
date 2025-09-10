import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireAdminAuth } from '@/lib/adminAuth';

// POST - Reset user data (clear history, bookmarks, searches)
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Require admin authentication
    const admin = await requireAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Get params with await in Next.js 15+ (this is critical)
    const { id: userId } = await Promise.resolve(context.params);
    const supabase = await createServerSupabaseClient();

    // First, check if the user exists
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    try {
      // Delete all user data but keep the user account
      // 1. Delete search history
      await supabase
        .from('search_history')
        .delete()
        .eq('user_id', userId);

      // 2. Delete saved bookmarks
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId);

      // 3. Delete conversation history
      await supabase
        .from('conversations')
        .delete()
        .eq('user_id', userId);

      // 4. Delete other user-specific data as needed
      // Add more tables as needed for your application

      return NextResponse.json({
        success: true,
        message: `User data reset successfully for ${user.email}`
      });
    } catch (resetError) {
      console.error('Error resetting user data:', resetError);
      return NextResponse.json(
        { error: `Failed to reset user data: ${resetError instanceof Error ? resetError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Reset user data error:', error);
    return NextResponse.json(
      { error: `Failed to reset user data: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 