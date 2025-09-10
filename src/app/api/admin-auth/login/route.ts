import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, logAdminAction } from '@/lib/adminAuth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Authenticate admin
    const authResult = await authenticateAdmin(email, password);

    if (!authResult.success) {
      // Log failed login attempt
      await logAdminAction('admin_login_failed', 'admin_user', undefined, {
        email,
        reason: authResult.error,
        timestamp: new Date().toISOString(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      });

      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    // Set session cookie
    if (authResult.session) {
      const cookieStore = await cookies();
      cookieStore.set('admin-session', authResult.session.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60, // 24 hours
        path: '/'
      });
    }

    // Return success response (without sensitive data)
    return NextResponse.json({
      success: true,
      admin: {
        id: authResult.admin!.id,
        email: authResult.admin!.email,
        isMaster: authResult.admin!.isMaster,
        status: authResult.admin!.status
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 