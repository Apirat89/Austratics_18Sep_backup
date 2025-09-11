import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireAdminAuth } from '@/lib/adminAuth';

// GET - List regular users with their IDs and emails (admin only)
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const admin = await requireAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Get users from the database
    const supabase = await createServerSupabaseClient();
    
    // Fetch users from auth schema with their profile data
    const { data: users, error } = await supabase.auth.admin.listUsers({
      // Optional pagination params if your user base is large
      page: 1,
      perPage: 1000
    });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // Format the user data to include just what we need
    const formattedUsers = users.users.map(user => ({
      id: user.id,
      email: user.email || 'No email',
      lastSignIn: user.last_sign_in_at,
      createdAt: user.created_at
    }));

    return NextResponse.json({
      success: true,
      users: formattedUsers
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 