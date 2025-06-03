import { NextRequest, NextResponse } from 'next/server';
import { validateResetToken, markTokenAsUsed, updateUserPassword } from '../../../../lib/auth-tokens';

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

    // Validate reset token
    const tokenValidation = validateResetToken(token);
    if (!tokenValidation.valid) {
      return NextResponse.json(
        { error: tokenValidation.error || 'Invalid or expired reset token' },
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

    // Mark token as used
    markTokenAsUsed(token);

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