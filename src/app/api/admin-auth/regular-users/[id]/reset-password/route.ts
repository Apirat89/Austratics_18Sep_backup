import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { requireAdminAuth, generateSecurePassword } from '@/lib/adminAuth';
import { sendUserInvitationEmail } from '@/lib/emailService';

// POST - Reset user password and send email notification
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Require admin authentication
    const admin = await requireAdminAuth(request);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin authentication required' },
        { status: 401 }
      );
    }

    // Get params with await in Next.js 15+ (this is critical)
    const { id: userId } = await Promise.resolve(context.params);
    const supabase = await createServerSupabaseClient();

    // First, check if the user exists
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate a secure password
    const tempPassword = generateSecurePassword(10);

    try {
      // Update user password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: tempPassword }
      );

      if (updateError) {
        console.error('Failed to update user password:', updateError);
        return NextResponse.json(
          { error: `Failed to reset password: ${updateError.message}` },
          { status: 500 }
        );
      }

      // Send email notification with new password
      try {
        await sendUserInvitationEmail(user.email, tempPassword);
        console.log(`Password reset email sent to: ${user.email}`);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Continue despite email error - password has been reset
        return NextResponse.json({
          success: true,
          warning: 'Password reset but email notification failed',
          message: `Password reset successfully for ${user.email} but email notification failed`
        });
      }

      return NextResponse.json({
        success: true,
        message: `Password reset successfully for ${user.email}. Email notification sent.`
      });
    } catch (resetError) {
      console.error('Password reset operation error:', resetError);
      return NextResponse.json(
        { error: `Failed to reset password: ${resetError instanceof Error ? resetError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: `Failed to reset password: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 