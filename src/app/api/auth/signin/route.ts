import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase';
import { validateEmail, checkRateLimit } from '../../../../lib/passwordValidation';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Rate limiting - 5 attempts per 15 minutes per IP
    const rateLimitResult = checkRateLimit(`signin:${clientIP}`, 5, 15 * 60 * 1000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many login attempts. Please try again later.',
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
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

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (error) {
      console.error('Sign-in error detail:', error);
      
      // Check if this is an email verification error
      if (error.message.includes('Email not confirmed') || 
          error.message.includes('is not confirmed') || 
          error.message.includes('not verified') ||
          error.message.includes('not been confirmed')) {
        
        // Log detailed error for debugging
        console.log('Verification error detected:', { 
          message: error.message,
          email,
          errorCode: error.status
        });
        
        // Resend verification email and provide a helpful message
        const { error: resendError } = await supabase.auth.resend({
          type: 'signup',
          email: email.toLowerCase().trim(),
          options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/confirm?next=/`,
          }
        });
        
        if (resendError) {
          console.error('Error resending verification email:', resendError);
        } else {
          console.log('Verification email resent successfully');
        }
        
        return NextResponse.json(
          { 
            error: 'Email not verified. Please check your inbox for a verification link. We\'ve sent a new verification email to your address.',
            code: 'email_not_verified',
            resendSuccess: !resendError,
            originalError: error.message,
            status: error.status
          },
          { status: 401 }
        );
      }
      
      // Generic error message for other login failures (don't reveal if email exists)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      message: 'Signed in successfully',
      user: data.user,
      session: data.session,
    });

  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 