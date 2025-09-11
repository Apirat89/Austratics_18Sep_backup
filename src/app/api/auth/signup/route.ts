import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase';
import { validatePassword, validateEmail, checkRateLimit } from '../../../../lib/passwordValidation';
import { sendWelcomeEmail } from '../../../../lib/emailService';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // Get client IP for rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // Rate limiting - 5 attempts per 15 minutes per IP
    const rateLimitResult = checkRateLimit(`signup:${clientIP}`, 5, 15 * 60 * 1000);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Too many signup attempts. Please try again later.',
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

    // Enhanced email validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: emailValidation.error },
        { status: 400 }
      );
    }

    // Enhanced password validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          error: 'Password does not meet security requirements',
          details: passwordValidation.errors,
          strength: passwordValidation.strength
        },
        { status: 400 }
      );
    }

    // Name validation
    if (name && (name.length < 2 || name.length > 50)) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 50 characters' },
        { status: 400 }
      );
    }

    // Input sanitization
    const sanitizedName = name?.trim().replace(/[<>]/g, '') || '';

    const supabase = await createServerSupabaseClient();

    // Create a site URL for verification redirect
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Sign up with Supabase and let it handle the verification email
    // enable_confirmations = true is set in supabase/config.toml
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: {
          full_name: sanitizedName,
        },
        // Proper format for the redirect URL with next parameter
        emailRedirectTo: `${siteUrl}/auth/confirm?next=/`,
      },
    });

    if (error) {
      // Log security-relevant errors
      if (error.message.includes('already registered')) {
        // Don't reveal if email exists (security)
        return NextResponse.json(
          { error: 'If this email is not already registered, you will receive a confirmation email.' },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Send our custom welcome email (separate from the verification email)
    try {
      await sendWelcomeEmail(email.toLowerCase().trim(), sanitizedName);
      console.log('Welcome email sent successfully');
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Continue even if welcome email fails - verification email is what matters
    }

    return NextResponse.json({
      message: 'Account created successfully! Please check your email for verification.',
      user: data.user,
      requiresVerification: !data.session,
      passwordStrength: passwordValidation.strength,
    });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 