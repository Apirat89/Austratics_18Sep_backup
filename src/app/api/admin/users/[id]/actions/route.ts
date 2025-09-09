import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { authenticateAdmin, canAccessResource } from '@/lib/adminAuth';

// POST /api/admin/users/[id]/actions - Execute user account actions
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate admin user
    const authResult = await authenticateAdmin(request);
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 401 }
      );
    }

    const userId = params.id;
    const body = await request.json();
    const { action } = body;

    const supabase = await createServerSupabaseClient();

    // Get user to check access and existence
    const { data: user } = await supabase
      .from('profiles')
      .select('id, email, company_id')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check access to this user
    if (!canAccessResource(authResult.user, userId, user.company_id)) {
      return NextResponse.json(
        { error: 'Access denied to this user' },
        { status: 403 }
      );
    }

    let result: any = {};

    switch (action) {
      case 'reset-password': {
        // Send password reset email
        const { error } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: user.email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`
          }
        });

        if (error) {
          console.error('Password reset error:', error);
          return NextResponse.json(
            { error: 'Failed to send password reset email' },
            { status: 500 }
          );
        }

        result = { message: 'Password reset email sent successfully' };
        break;
      }

      case 'force-logout': {
        // Revoke all refresh tokens for the user
        const { error } = await supabase.auth.admin.signOut(userId, 'global');

        if (error) {
          console.error('Force logout error:', error);
          return NextResponse.json(
            { error: 'Failed to force logout user' },
            { status: 500 }
          );
        }

        result = { message: 'User logged out successfully from all devices' };
        break;
      }

      case 'reset-verification': {
        // Reset email verification status and send new verification email
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          email_confirm: false
        });

        if (updateError) {
          console.error('Reset verification error:', updateError);
          return NextResponse.json(
            { error: 'Failed to reset email verification' },
            { status: 500 }
          );
        }

        // Note: Sending new verification email requires recreating the user
        // For now, we'll just reset the verification status
        result = { 
          message: 'Email verification reset successfully. User must verify email on next login.',
          emailSent: false
        };
        break;
      }

      case 'reset-mfa': {
        // Reset MFA factors for the user
        // Note: MFA factor management requires additional Supabase admin setup
        result = { 
          message: 'MFA reset functionality not fully implemented yet',
          action: 'logged'
        };
        break;
      }

      case 'rotate-api-keys': {
        // This would typically involve rotating API keys if you have them
        // For now, we'll just log the action
        result = { 
          message: 'API key rotation not implemented yet',
          action: 'logged'
        };
        break;
      }

      case 'suspend': {
        // Suspend user account
        const { error } = await supabase
          .from('profiles')
          .update({ status: 'suspended' })
          .eq('id', userId);

        if (error) {
          console.error('Suspend user error:', error);
          return NextResponse.json(
            { error: 'Failed to suspend user' },
            { status: 500 }
          );
        }

        result = { message: 'User suspended successfully' };
        break;
      }

      case 'reactivate': {
        // Reactivate user account
        const { error } = await supabase
          .from('profiles')
          .update({ status: 'active' })
          .eq('id', userId);

        if (error) {
          console.error('Reactivate user error:', error);
          return NextResponse.json(
            { error: 'Failed to reactivate user' },
            { status: 500 }
          );
        }

        result = { message: 'User reactivated successfully' };
        break;
      }

      default: {
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
      }
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      user_id: authResult.user.id,
      action: `user.${action.replace('-', '_')}`,
      resource_type: 'user',
      resource_id: userId,
      details: { 
        targetUser: user.email,
        action,
        result
      }
    });

    return NextResponse.json({
      success: true,
      action,
      ...result
    });

  } catch (error) {
    console.error('User action API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 