import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase';
import emailService from '../../../lib/emailService';
import nodemailer from 'nodemailer';

// Email configuration for debugging
const emailConfig = {
  masterAdminEmail: 'hello@austratics.com',
  smtpConfig: {
    host: process.env.SMTP_HOST || 'mail.spacemail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER || 'hello@austratics.com',
      pass: process.env.EMAIL_PASSWORD || ''
    },
    tls: {
      rejectUnauthorized: false
    }
  }
};

interface EmailDebugResult {
  success: boolean;
  step: string;
  details: any;
  error?: string;
  messageId?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { testType, targetEmail } = body;

    const results: EmailDebugResult[] = [];

    // Step 1: Environment Variable Check
    results.push({
      success: true,
      step: 'Environment Variables',
      details: {
        EMAIL_USER: process.env.EMAIL_USER ? '✅ Set' : '❌ Missing',
        EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Missing',
        SMTP_HOST: process.env.SMTP_HOST || 'Using default: mail.spacemail.com',
        masterAdminEmail: emailConfig.masterAdminEmail,
        isConfigured: emailService.isConfigured()
      }
    });

    // Step 2: SMTP Connection Test
    try {
      const transporter = nodemailer.createTransporter(emailConfig.smtpConfig);
      await transporter.verify();
      results.push({
        success: true,
        step: 'SMTP Connection',
        details: {
          host: emailConfig.smtpConfig.host,
          port: emailConfig.smtpConfig.port,
          secure: emailConfig.smtpConfig.secure,
          auth_user: emailConfig.smtpConfig.auth.user,
          status: 'Connection verified successfully'
        }
      });
    } catch (error) {
      results.push({
        success: false,
        step: 'SMTP Connection',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          host: emailConfig.smtpConfig.host,
          port: emailConfig.smtpConfig.port,
          auth_user: emailConfig.smtpConfig.auth.user
        }
      });
    }

    // Step 3: Email Sending Tests
    if (testType && targetEmail) {
      const transporter = nodemailer.createTransporter(emailConfig.smtpConfig);

      if (testType === 'admin_notification') {
        // Test admin notification email (like contact form)
        try {
          const mailOptions = {
            from: `"Test User" <${emailConfig.masterAdminEmail}>`,
            to: emailConfig.masterAdminEmail,
            replyTo: targetEmail,
            subject: 'DEBUG: Admin Notification Test',
            html: `
              <h3>🔧 DEBUG: Admin Notification Email Test</h3>
              <p><strong>From:</strong> ${targetEmail}</p>
              <p><strong>Test Type:</strong> Admin Notification</p>
              <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
              <hr>
              <p><strong>Message:</strong></p>
              <p>This is a test email to debug why admin notifications are not being received.</p>
              <p>If you receive this email, admin notifications are working correctly.</p>
            `,
            text: `
              DEBUG: Admin Notification Email Test
              
              From: ${targetEmail}
              Test Type: Admin Notification
              Timestamp: ${new Date().toLocaleString()}
              
              Message:
              This is a test email to debug why admin notifications are not being received.
              If you receive this email, admin notifications are working correctly.
            `
          };

          const result = await transporter.sendMail(mailOptions);
          results.push({
            success: true,
            step: 'Admin Notification Test',
            messageId: result.messageId,
            details: {
              from: mailOptions.from,
              to: mailOptions.to,
              replyTo: mailOptions.replyTo,
              subject: mailOptions.subject,
              messageId: result.messageId,
              response: result.response
            }
          });
        } catch (error) {
          results.push({
            success: false,
            step: 'Admin Notification Test',
            error: error instanceof Error ? error.message : 'Unknown error',
            details: { targetEmail: emailConfig.masterAdminEmail }
          });
        }
      }

      if (testType === 'user_activation') {
        // Test user activation email
        try {
          const mailOptions = {
            from: `"Aged Care Analytics" <${emailConfig.masterAdminEmail}>`,
            to: targetEmail,
            subject: 'DEBUG: User Activation Test',
            html: `
              <h3>🔧 DEBUG: User Activation Email Test</h3>
              <p><strong>To:</strong> ${targetEmail}</p>
              <p><strong>Test Type:</strong> User Activation</p>
              <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
              <hr>
              <p><strong>Message:</strong></p>
              <p>This is a test email to debug why user activation emails are not being received.</p>
              <p>If you receive this email, user activation emails are working correctly.</p>
              <p><strong>Fake Activation Link:</strong> https://example.com/activate?token=debug-test</p>
            `,
            text: `
              DEBUG: User Activation Email Test
              
              To: ${targetEmail}
              Test Type: User Activation
              Timestamp: ${new Date().toLocaleString()}
              
              Message:
              This is a test email to debug why user activation emails are not being received.
              If you receive this email, user activation emails are working correctly.
              
              Fake Activation Link: https://example.com/activate?token=debug-test
            `
          };

          const result = await transporter.sendMail(mailOptions);
          results.push({
            success: true,
            step: 'User Activation Test',
            messageId: result.messageId,
            details: {
              from: mailOptions.from,
              to: mailOptions.to,
              subject: mailOptions.subject,
              messageId: result.messageId,
              response: result.response
            }
          });
        } catch (error) {
          results.push({
            success: false,
            step: 'User Activation Test',
            error: error instanceof Error ? error.message : 'Unknown error',
            details: { targetEmail }
          });
        }
      }

      if (testType === 'auto_response') {
        // Test auto-response email (we know this works)
        try {
          const mailOptions = {
            from: `"Aged Care Analytics Support" <${emailConfig.masterAdminEmail}>`,
            to: targetEmail,
            subject: 'DEBUG: Auto-Response Test',
            html: `
              <h3>🔧 DEBUG: Auto-Response Email Test</h3>
              <p>This is a test of the auto-response email functionality.</p>
              <p>If you receive this email, auto-response emails are working correctly.</p>
              <p>Timestamp: ${new Date().toLocaleString()}</p>
            `,
            text: `
              DEBUG: Auto-Response Email Test
              
              This is a test of the auto-response email functionality.
              If you receive this email, auto-response emails are working correctly.
              
              Timestamp: ${new Date().toLocaleString()}
            `
          };

          const result = await transporter.sendMail(mailOptions);
          results.push({
            success: true,
            step: 'Auto-Response Test',
            messageId: result.messageId,
            details: {
              from: mailOptions.from,
              to: mailOptions.to,
              subject: mailOptions.subject,
              messageId: result.messageId,
              response: result.response
            }
          });
        } catch (error) {
          results.push({
            success: false,
            step: 'Auto-Response Test',
            error: error instanceof Error ? error.message : 'Unknown error',
            details: { targetEmail }
          });
        }
      }
    }

    // Summary
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: successCount === totalCount,
      summary: {
        total_tests: totalCount,
        passed: successCount,
        failed: totalCount - successCount
      },
      results,
      timestamp: new Date().toISOString(),
      instructions: {
        admin_notification: 'Check hello@austratics.com inbox and spam folder',
        user_activation: `Check ${targetEmail || 'target email'} inbox and spam folder`,
        auto_response: `Check ${targetEmail || 'target email'} inbox and spam folder`
      }
    });

  } catch (error) {
    console.error('Email debug error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email Debug Endpoint',
    usage: 'POST with { testType: "admin_notification" | "user_activation" | "auto_response", targetEmail: "test@example.com" }',
    note: 'Admin authentication required'
  });
}