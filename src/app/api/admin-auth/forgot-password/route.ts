import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendAdminPasswordResetEmail, ensureAdminUserSchemaColumns } from '@/lib/emailService';

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
    console.log('📧 ADMIN FORGOT PASSWORD API - Processing admin reset email request');
    
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
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Ensure the admin_users table has the necessary columns for reset tokens
    await ensureAdminUserSchemaColumns();

    // Initialize Supabase client
    const supabase = await createServerSupabaseClient();

    // Check if admin exists
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (adminError || !adminUser) {
      // For security, don't reveal if the email exists or not
      return NextResponse.json(
        { success: true, message: 'If your email is registered, you will receive reset instructions.' },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 24); // Token expires in 24 hours (1 day)

    try {
      // Store reset token in database
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({
          reset_token: resetToken,
          reset_token_expires_at: resetTokenExpires.toISOString()
        })
        .eq('id', adminUser.id);

      if (updateError) {
        console.error('Error storing reset token:', updateError);
        
        // Try direct SQL as a backup approach
        try {
          await supabase.rpc('exec_sql', {
            sql_query: `
              UPDATE public.admin_users 
              SET reset_token = '${resetToken}',
                  reset_token_expires_at = '${resetTokenExpires.toISOString()}'
              WHERE id = '${adminUser.id}'
            `
          });
          console.log('Updated reset token via direct SQL');
        } catch (directError) {
          console.error('Direct SQL update failed too:', directError);
          return NextResponse.json(
            { error: 'Failed to process password reset request' },
            { status: 500 }
          );
        }
      }
    } catch (dbError) {
      console.error('Database error when setting reset token:', dbError);
      return NextResponse.json(
        { error: 'Failed to process password reset request' },
        { status: 500 }
      );
    }

    // Send password reset email
    const emailSent = await sendAdminPasswordResetEmail(
      email,
      resetToken
    );

    if (!emailSent) {
      console.error('Failed to send password reset email');
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      );
    }

    // Return success response regardless of whether email was sent
    // For security, we don't want to reveal if the email exists in our system
    return NextResponse.json(
      { success: true, message: 'If your email is registered, you will receive reset instructions.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Admin forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 