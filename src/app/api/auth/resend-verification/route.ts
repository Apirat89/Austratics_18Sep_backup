import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase';
import { validateEmail, checkRateLimit } from '../../../../lib/passwordValidation';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Rate limiting - 3 attempts per 10 minutes per IP
    const rateLimitResult = checkRateLimit(`resend_verification:${clientIP}`, 3, 10 * 60 * 1000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many attempts. Please try again later.',
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }

    // Basic email validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Resend verification email - use signup type for account creation confirmation
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.toLowerCase().trim(),
      options: {
        emailRedirectTo: `${siteUrl}/auth/confirm?next=/`,
      }
    });

    if (error) {
      console.error('Error resending verification email:', error);
      
      // Don't reveal if the email exists for security reasons
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        return NextResponse.json(
          { message: 'If this email exists, a verification email has been sent.' },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Verification email resent successfully' });

  } catch (error) {
    console.error('Error resending verification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 