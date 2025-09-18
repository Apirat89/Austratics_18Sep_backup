export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '../../../../lib/redis';
import { validateResetToken, markResetTokenUsed, updateUserPassword } from '../../../../lib/auth-tokens';

// Password validation function
function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function POST(request: NextRequest) {
  try {
    const { password, token } = await request.json();

    // Expert-recommended diagnostics
    console.info('RESET_PASSWORD_START', { tokenLen: token?.length, tokenPreview: token?.slice(0,8) });
    const ping = await redis.ping().catch((e) => `ERR:${e.message}`);
    console.info('REDIS_PING', ping);

    // Validate input
    if (!password || !token) {
      return NextResponse.json(
        { error: 'Password and token are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join('. ') },
        { status: 400 }
      );
    }

    // Validate reset token with expert defensive parsing
    const tokenValidation = await validateResetToken(token);
    if (!tokenValidation.ok) {
      return NextResponse.json(
        { 
          error: 'Invalid or expired reset token',
          code: tokenValidation.code
        },
        { status: 400 }
      );
    }

    // Update the user's password
    const updateResult = await updateUserPassword(tokenValidation.userId!, password);
    if (!updateResult.success) {
      return NextResponse.json(
        { error: updateResult.error || 'Failed to update password' },
        { status: 500 }
      );
    }

    // Mark token as used with the key returned from validation
    await markResetTokenUsed(tokenValidation.key!);

    return NextResponse.json(
      { message: 'Password updated successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 