import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '../../../../lib/email';
import { createResetToken } from '../../../../lib/auth-tokens';

// Simple validation functions (inline for this endpoint)
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isDisposableEmail(email: string): boolean {
  const disposableDomains = [
    '10minutemail.com', 'tempmail.org', 'guerrillamail.com', 
    'mailinator.com', 'yopmail.com', 'temp-mail.org'
  ];
  const domain = email.split('@')[1]?.toLowerCase();
  return disposableDomains.includes(domain);
}

// Simple rate limiting (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimitCheck(clientIP: string, action: string): { success: boolean } {
  const key = `${clientIP}:${action}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 3; // 3 attempts per 15 minutes

  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true };
  }
  
  if (record.count >= maxAttempts) {
    return { success: false };
  }
  
  record.count++;
  return { success: true };
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Rate limiting check
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = rateLimitCheck(clientIP, 'forgot-password');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Check for disposable email
    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { error: 'Please use a permanent email address' },
        { status: 400 }
      );
    }

    // Create reset token
    const tokenResult = await createResetToken(email);
    
    if (!tokenResult.success) {
      // Check if it's because email doesn't exist
      if (tokenResult.emailExists === false) {
        return NextResponse.json(
          { error: 'Email not registered or activated. Please contact hello@austratrics.com for account activation.' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: tokenResult.error || 'Something went wrong with your request' },
        { status: 500 }
      );
    }

    // Only proceed with email sending if token was successfully created
    if (!tokenResult.token) {
      return NextResponse.json(
        { error: 'Failed to create reset token' },
        { status: 500 }
      );
    }

    // Send custom email
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password?token=${tokenResult.token}`;
    
    const emailResult = await sendPasswordResetEmail({
      to: email,
      resetToken: tokenResult.token,
      resetUrl,
      userEmail: email
    });

    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send password reset email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Password reset instructions have been sent to your email.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 