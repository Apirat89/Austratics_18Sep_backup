import { NextRequest, NextResponse } from 'next/server';
import { logoutAdmin } from '@/lib/adminAuth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin-session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 400 }
      );
    }

    // Logout admin (invalidate session)
    const success = await logoutAdmin(sessionToken);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to logout' },
        { status: 500 }
      );
    }

    // Clear session cookie
    cookieStore.delete('admin-session');

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 