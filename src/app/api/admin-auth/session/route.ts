import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { cookies } from 'next/headers';

// GET - Validate current admin session
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('admin-session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'No active session', authenticated: false },
        { status: 401 }
      );
    }

    // Validate session
    const authResult = await validateAdminSession(sessionToken);

    if (!authResult.success) {
      // Clear invalid session cookie
      cookieStore.delete('admin-session');
      
      return NextResponse.json(
        { error: authResult.error, authenticated: false },
        { status: 401 }
      );
    }

    // Return admin info (without sensitive data)
    return NextResponse.json({
      success: true,
      authenticated: true,
      admin: {
        id: authResult.admin!.id,
        email: authResult.admin!.email,
        isMaster: authResult.admin!.isMaster,
        status: authResult.admin!.status,
        lastActive: authResult.admin!.lastActive
      }
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', authenticated: false },
      { status: 500 }
    );
  }
} 