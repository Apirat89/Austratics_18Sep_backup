import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabaseClient } from '@/lib/supabase';
import { ensureAdminUserSchemaColumns } from '@/lib/emailService';

// Rate limiting setup
const RATE_LIMIT_WINDOW = 60 * 15; // 15 minutes in seconds
const MAX_REQUESTS_PER_WINDOW = 5;
const ipRequests: { [key: string]: { count: number; timestamp: number } } = {};

function checkRateLimit(ip: string): boolean {
  const now = Math.floor(Date.now() / 1000);
  
  // Clean up expired entries
  Object.keys(ipRequests).forEach(key => {
    if (now - ipRequests[key].timestamp > RATE_LIMIT_WINDOW) {
      delete ipRequests[key];
    }
  });
  
  // Check if IP exists and update count
  if (!ipRequests[ip]) {
    ipRequests[ip] = { count: 1, timestamp: now };
    return true;
  }
  
  // Check if window expired and reset if needed
  if (now - ipRequests[ip].timestamp > RATE_LIMIT_WINDOW) {
    ipRequests[ip] = { count: 1, timestamp: now };
    return true;
  }
  
  // Increment request count
  ipRequests[ip].count += 1;
  
  // Check if limit exceeded
  return ipRequests[ip].count <= MAX_REQUESTS_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  try {
    // Add clear debug logging
    console.log('🔒 ADMIN PASSWORD RESET API - Processing admin reset request');
    
    // Apply rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Ensure the admin_users table has the necessary columns for reset tokens
    await ensureAdminUserSchemaColumns();

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Verify token and find admin user
    let adminUser;
    let tokenValid = false;
    
    try {
      // Standard approach
      const { data, error: tokenError } = await supabase
        .from('admin_users')
        .select('id, email')
        .eq('reset_token', token)
        .gt('reset_token_expires_at', new Date().toISOString())
        .single();

      if (!tokenError && data) {
        adminUser = data;
        tokenValid = true;
        console.log('Reset token verified via standard query');
      } else {
        console.log('Standard token verification failed, trying direct SQL');
        
        // Try direct SQL as fallback
        try {
          const { data: directData, error: directError } = await supabase.rpc('exec_sql', {
            sql_query: `
              SELECT id, email FROM public.admin_users
              WHERE reset_token = '${token}'
              AND reset_token_expires_at > '${new Date().toISOString()}'
              LIMIT 1
            `
          });
          
          if (!directError && directData && directData.length > 0) {
            adminUser = directData[0];
            tokenValid = true;
            console.log('Reset token verified via direct SQL');
          }
        } catch (sqlError) {
          console.error('Direct SQL verification failed too:', sqlError);
        }
      }
    } catch (verifyError) {
      console.error('Error verifying token:', verifyError);
    }

    if (!tokenValid || !adminUser) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Hash the new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update admin user with new password
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({
        password_hash: passwordHash,
        reset_token: null,
        reset_token_expires_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', adminUser.id);

    if (updateError) {
      console.error('Error updating admin password:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset password' },
        { status: 500 }
      );
    }

    // Invalidate all existing admin sessions for this user
    const { error: sessionError } = await supabase
      .from('admin_sessions')
      .delete()
      .eq('admin_id', adminUser.id);

    if (sessionError) {
      console.error('Error invalidating admin sessions:', sessionError);
      // Continue anyway - the password has been reset
    }

    // Log the password reset event in audit log
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: adminUser.id,
        action_type: 'password_reset',
        details: 'Password reset via forgot password flow',
        ip_address: ip
      })
      .then(({ error }) => {
        if (error) {
          console.error('Error logging password reset:', error);
        }
      });

    return NextResponse.json(
      { 
        success: true,
        message: 'Password reset successfully. Please sign in with your new password.' 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Admin reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 