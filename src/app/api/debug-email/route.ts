import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmail } from '@/lib/email';
import { requireAdminAuth } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    // Require admin auth for this debug endpoint
    const admin = await requireAdminAuth(req);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin credentials' }, { status: 401 });
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log(`🔍 DEBUG: Testing email send to: ${email} by admin: ${admin.email}`);
    
    // Check environment variables
    const envCheck = {
      EMAIL_USER: process.env.EMAIL_USER ? 'SET' : 'MISSING',
      EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'SET' : 'MISSING',
      SMTP_HOST: process.env.SMTP_HOST || 'mail.spacemail.com (default)',
      NODE_ENV: process.env.NODE_ENV
    };
    
    console.log('🔍 Environment variables:', envCheck);

    // Test email sending
    const origin = req.nextUrl.origin;
    const testUrl = `${origin}/auth/reset-password?token=debug-test-token-123`;
    
    console.log('🔍 Attempting to send test email...');
    const emailResult = await sendPasswordResetEmail({
      to: email,
      resetToken: 'debug-test-token-123',
      resetUrl: testUrl,
      userEmail: email
    });

    console.log('🔍 Email send result:', emailResult);

    return NextResponse.json({ 
      success: emailResult.success,
      error: emailResult.error || null,
      environment: envCheck,
      testUrl: testUrl,
      messageId: emailResult.success ? emailResult.messageId : null
    });

  } catch (error) {
    console.error('🔍 DEBUG: Email test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    });
  }
}
