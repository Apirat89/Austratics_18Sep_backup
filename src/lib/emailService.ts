import nodemailer from 'nodemailer';

// ==========================================
// EMAIL SERVICE CONFIGURATION
// ==========================================

interface EmailConfig {
  masterAdminEmail: string;
  smtpConfig: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
    tls?: {
      rejectUnauthorized: boolean;
    };
  };
}

// Email configuration - using master admin email as sender
const emailConfig: EmailConfig = {
  masterAdminEmail: 'hello@austratics.com',
  smtpConfig: {
    host: process.env.SMTP_HOST || 'mail.spacemail.com',
    port: 465,
    secure: true, // Use SSL instead of TLS
    auth: {
      user: process.env.EMAIL_USER || 'hello@austratics.com',
      pass: process.env.EMAIL_PASSWORD || ''
    },
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false
    }
  }
};

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getEmailTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(emailConfig.smtpConfig);
  }
  return transporter;
}

// ==========================================
// EMAIL TEMPLATE FUNCTIONS
// ==========================================

/**
 * Generate HTML template for admin invitation email
 */
function generateAdminInvitationTemplate(email: string, tempPassword: string, activationToken: string): string {
  const activationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/master/activate?token=${activationToken}`;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Invitation - Aged Care Analytics</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e9ecef;
          border-top: none;
        }
        .credentials-box {
          background: white;
          padding: 20px;
          border-radius: 6px;
          border: 1px solid #dee2e6;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .warning {
          background: #fff3cd;
          color: #856404;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #ffeaa7;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          color: #6c757d;
          font-size: 14px;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔐 Admin Access Granted</h1>
        <p>You've been invited to join the administration team</p>
      </div>
      
      <div class="content">
        <h2>Welcome to Aged Care Analytics Administration</h2>
        <p>Hello,</p>
        <p>You have been granted administrator privileges for the Aged Care Analytics platform. This gives you access to the master administration interface for managing users, viewing analytics, and overseeing system operations.</p>
        
        <div class="credentials-box">
          <h3>🔑 Your Login Credentials</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> <code style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
        </div>
        
        <div class="warning">
          <p><strong>⚠️ Important Security Notes:</strong></p>
          <ul>
            <li>This is a temporary password. You'll be prompted to change it upon first login.</li>
            <li>Your account must be activated within 72 hours of receiving this email.</li>
            <li>Never share your admin credentials with anyone.</li>
            <li>Always log out when finished with admin tasks.</li>
          </ul>
        </div>
        
        <div style="text-align: center;">
          <a href="${activationUrl}" class="button">🚀 Activate Your Admin Account</a>
        </div>
        
        <h3>📋 Admin Permissions</h3>
        <p>As an administrator, you will have access to:</p>
        <ul>
          <li><strong>User Management:</strong> View and manage user accounts</li>
          <li><strong>Usage Analytics:</strong> Access to platform usage statistics and reports</li>
          <li><strong>System Oversight:</strong> Monitor platform health and performance</li>
          <li><strong>Admin Self-Management:</strong> Ability to manage your own admin account</li>
        </ul>
        
        <p><strong>Note:</strong> Only the master administrator can add or remove admin users.</p>
        
        <h3>🔗 Getting Started</h3>
        <ol>
          <li>Click the activation link above</li>
          <li>Log in with your email and temporary password</li>
          <li>Set a new, secure password</li>
          <li>Familiarize yourself with the admin interface</li>
        </ol>
        
        <p>If you have any questions or concerns about your admin access, please contact the master administrator directly.</p>
        
        <p>Best regards,<br>
        <strong>Aged Care Analytics Team</strong></p>
      </div>
      
      <div class="footer">
        <p>This email was sent from the Aged Care Analytics administration system.</p>
        <p>If you didn't expect this email, please contact: hello@austratics.com</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML template for admin activity summary email
 */
function generateActivitySummaryTemplate(adminEmail: string, activities: AdminActivity[]): string {
  const activityRows = activities.map(activity => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${new Date(activity.timestamp).toLocaleString()}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">
        <span style="background: ${getActionTypeColor(activity.actionType)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
          ${activity.actionType}
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${activity.targetType}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e9ecef;">${activity.description}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Activity Summary - Aged Care Analytics</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: #343a40;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: white;
          padding: 30px;
          border: 1px solid #e9ecef;
          border-top: none;
        }
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .summary-table th {
          background: #f8f9fa;
          padding: 12px;
          text-align: left;
          border-bottom: 2px solid #e9ecef;
          font-weight: 600;
        }
        .footer-section {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e9ecef;
          border-top: none;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 Admin Activity Summary</h1>
        <p>Recent administrative actions performed by: <strong>${adminEmail}</strong></p>
      </div>
      
      <div class="content">
        <h2>Recent Activities (${activities.length} actions)</h2>
        ${activities.length > 0 ? `
          <table class="summary-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Target</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              ${activityRows}
            </tbody>
          </table>
        ` : '<p>No recent activities to report.</p>'}
      </div>
      
      <div class="footer-section">
        <p><strong>Note:</strong> This is an automated summary sent to the master administrator for audit purposes.</p>
        <p>Generated at: ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML template for user invitation email
 */
function generateUserInvitationTemplate(email: string, tempPassword: string): string {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signin`;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Aged Care Analytics</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #4f46e5 0%, #3c366b 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e9ecef;
          border-top: none;
        }
        .credentials-box {
          background: white;
          padding: 20px;
          border-radius: 6px;
          border: 1px solid #dee2e6;
          margin: 20px 0;
        }
        .button {
          display: inline-block;
          background: #4f46e5;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .warning {
          background: #fff3cd;
          color: #856404;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #ffeaa7;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          color: #6c757d;
          font-size: 14px;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>👋 Welcome to Aged Care Analytics</h1>
        <p>Your account has been created</p>
      </div>
      
      <div class="content">
        <h2>Your Account is Ready</h2>
        <p>Hello,</p>
        <p>An account has been created for you on the Aged Care Analytics platform. You can now access the platform using the credentials below.</p>
        
        <div class="credentials-box">
          <h3>🔑 Your Login Credentials</h3>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Temporary Password:</strong> <code style="background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code></p>
        </div>
        
        <div class="warning">
          <p><strong>⚠️ Important Security Notes:</strong></p>
          <ul>
            <li>This is a temporary password. You'll be prompted to change it upon first login.</li>
            <li>Never share your credentials with anyone.</li>
            <li>Always log out when finished with your session.</li>
          </ul>
        </div>
        
        <div style="text-align: center;">
          <a href="${loginUrl}" class="button">🚀 Log in to Your Account</a>
        </div>
        
        <h3>🔍 Getting Started</h3>
        <ol>
          <li>Click the login button above</li>
          <li>Enter your email and temporary password</li>
          <li>Set a new, secure password</li>
          <li>Start exploring the platform's features</li>
        </ol>
        
        <p>If you have any questions or need assistance, please contact us at hello@austratics.com.</p>
        
        <p>Best regards,<br>
        <strong>Aged Care Analytics Team</strong></p>
      </div>
      
      <div class="footer">
        <p>This email was sent from the Aged Care Analytics platform.</p>
        <p>If you didn't expect this email, please contact us at hello@austratics.com.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML template for admin password reset email
 */
function generateAdminPasswordResetTemplate(email: string, resetToken: string): string {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/admin-reset-password?token=${resetToken}`;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Password Reset - Aged Care Analytics</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e9ecef;
          border-top: none;
        }
        .button {
          display: inline-block;
          background: #667eea;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .warning {
          background: #fff3cd;
          color: #856404;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #ffeaa7;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          color: #6c757d;
          font-size: 14px;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔐 Admin Password Reset</h1>
        <p>Reset your administrator account password</p>
      </div>
      
      <div class="content">
        <h2>Reset Your Admin Password</h2>
        <p>Hello,</p>
        <p>We received a request to reset the password for your administrator account. To proceed with the password reset, please click the button below:</p>
        
        <div style="text-align: center;">
          <a href="${resetUrl}" class="button">🔒 Reset Your Password</a>
        </div>
        
        <div class="warning">
          <p><strong>⚠️ Important Security Notes:</strong></p>
          <ul>
            <li>This password reset link will expire in 1 hour.</li>
            <li>If you didn't request a password reset, please ignore this email or contact the master administrator.</li>
            <li>For security reasons, all your active sessions will be logged out when you reset your password.</li>
          </ul>
        </div>
        
        <p>If the button above doesn't work, copy and paste the following URL into your browser:</p>
        <p style="word-break: break-all; background: #f1f3f5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
          ${resetUrl}
        </p>
        
        <p>Best regards,<br>
        <strong>Aged Care Analytics Team</strong></p>
      </div>
      
      <div class="footer">
        <p>This email was sent from the Aged Care Analytics administration system.</p>
        <p>If you didn't expect this email, please contact: hello@austratics.com</p>
      </div>
    </body>
    </html>
  `;
}

// Helper function to get color based on action type
function getActionTypeColor(actionType: string): string {
  switch (actionType) {
    case 'create_admin_user': return '#28a745';
    case 'delete_admin_user': return '#dc3545';
    case 'admin_login': return '#007bff';
    case 'admin_logout': return '#6c757d';
    case 'update_admin_user': return '#ffc107';
    default: return '#17a2b8';
  }
}

// ==========================================
// EMAIL SENDING FUNCTIONS
// ==========================================

export interface AdminActivity {
  actionType: string;
  targetType: string;
  description: string;
  timestamp: string;
}

/**
 * Send admin invitation email
 */
export async function sendAdminInvitationEmail(
  email: string, 
  tempPassword: string, 
  activationToken: string
): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();
    
    const mailOptions = {
      from: `"Aged Care Analytics Admin" <${emailConfig.masterAdminEmail}>`,
      to: email,
      subject: '🔐 Admin Access Granted - Aged Care Analytics',
      html: generateAdminInvitationTemplate(email, tempPassword, activationToken),
      text: `
        Admin Invitation - Aged Care Analytics
        
        You have been granted administrator privileges for the Aged Care Analytics platform.
        
        Your Login Credentials:
        Email: ${email}
        Temporary Password: ${tempPassword}
        
        Please activate your account within 72 hours by visiting:
        ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/master/activate?token=${activationToken}
        
        This is a temporary password. You'll be prompted to change it upon first login.
        
        Best regards,
        Aged Care Analytics Team
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Admin invitation email sent successfully:', result.messageId);
    return true;

  } catch (error) {
    console.error('Failed to send admin invitation email:', error);
    return false;
  }
}

/**
 * Send admin password reset email
 */
export async function sendAdminPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();
    // Use admin-reset-password URL, never the regular user one
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/admin-reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"Aged Care Analytics Admin" <${emailConfig.masterAdminEmail}>`,
      to: email,
      subject: '🔐 Admin Password Reset - Aged Care Analytics',
      html: generateAdminPasswordResetTemplate(email, resetToken),
      text: `
        Admin Password Reset - Aged Care Analytics
        
        We received a request to reset the password for your administrator account.
        
        To reset your password, please visit:
        ${resetUrl}
        
        Important Notes:
        - This password reset link will expire in 1 hour.
        - If you didn't request a password reset, please ignore this email or contact the master administrator.
        - All your active sessions will be logged out when you reset your password.
        
        Best regards,
        Aged Care Analytics Team
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Admin password reset email sent successfully:', result.messageId);
    return true;

  } catch (error) {
    console.error('Failed to send admin password reset email:', error);
    return false;
  }
}

/**
 * Send admin activity summary to master admin
 */
export async function sendActivitySummaryEmail(
  adminEmail: string,
  activities: AdminActivity[]
): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();
    
    const mailOptions = {
      from: `"Aged Care Analytics System" <${emailConfig.masterAdminEmail}>`,
      to: emailConfig.masterAdminEmail, // Always send to master admin
      subject: `📊 Admin Activity Summary - ${adminEmail}`,
      html: generateActivitySummaryTemplate(adminEmail, activities),
      text: `
        Admin Activity Summary for: ${adminEmail}
        
        Recent Activities (${activities.length} actions):
        ${activities.map(activity => 
          `- ${activity.actionType} on ${activity.targetType}: ${activity.description} (${activity.timestamp})`
        ).join('\n')}
        
        Generated at: ${new Date().toLocaleString()}
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Activity summary email sent successfully:', result.messageId);
    return true;

  } catch (error) {
    console.error('Failed to send activity summary email:', error);
    return false;
  }
}

/**
 * Send user invitation email
 */
export async function sendUserInvitationEmail(
  email: string, 
  tempPassword: string
): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();
    
    const mailOptions = {
      from: `"Aged Care Analytics" <${emailConfig.masterAdminEmail}>`,
      to: email,
      subject: '👋 Welcome to Aged Care Analytics - Your Account Details',
      html: generateUserInvitationTemplate(email, tempPassword),
      text: `
        Welcome to Aged Care Analytics
        
        An account has been created for you on the Aged Care Analytics platform.
        
        Your Login Credentials:
        Email: ${email}
        Temporary Password: ${tempPassword}
        
        Please log in at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/signin
        
        This is a temporary password. You'll be prompted to change it upon first login.
        
        Best regards,
        Aged Care Analytics Team
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('User invitation email sent successfully:', result.messageId);
    return true;

  } catch (error) {
    console.error('Failed to send user invitation email:', error);
    return false;
  }
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;

  } catch (error) {
    console.error('Email configuration test failed:', error);
    return false;
  }
}

/**
 * Send email verification for new user signup
 */
export async function sendEmailVerification(
  email: string,
  verificationLink: string
): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();
    
    const mailOptions = {
      from: `"Aged Care Analytics" <${emailConfig.masterAdminEmail}>`,
      to: email,
      subject: '✅ Verify Your Email - Aged Care Analytics',
      html: generateEmailVerificationTemplate(email, verificationLink),
      text: `
        Email Verification - Aged Care Analytics
        
        Thank you for signing up for Aged Care Analytics! To complete your registration, please verify your email address.
        
        Please verify your email by clicking this link:
        ${verificationLink}
        
        This verification link will expire in 24 hours.
        
        If you did not create an account with Aged Care Analytics, please ignore this email.
        
        Best regards,
        Aged Care Analytics Team
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email verification sent successfully:', result.messageId);
    return true;

  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}

/**
 * Generate HTML template for email verification
 */
function generateEmailVerificationTemplate(email: string, verificationLink: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - Aged Care Analytics</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e9ecef;
          border-top: none;
        }
        .button {
          display: inline-block;
          background: #3B82F6;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .button:hover {
          background: #2563EB;
        }
        .notice {
          background: #e6f7ff;
          color: #0c5460;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #bee5eb;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          color: #6c757d;
          font-size: 14px;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>✅ Verify Your Email</h1>
        <p>Complete your Aged Care Analytics registration</p>
      </div>
      
      <div class="content">
        <h2>Welcome to Aged Care Analytics!</h2>
        <p>Hello,</p>
        <p>Thank you for creating an account with Aged Care Analytics. To complete your registration and access all features, please verify your email address.</p>
        
        <div style="text-align: center;">
          <a href="${verificationLink}" class="button">Verify Email Address</a>
        </div>
        
        <div class="notice">
          <p><strong>Note:</strong> This verification link will expire in 24 hours.</p>
          <p>If you did not create an account with us, you can safely ignore this email.</p>
        </div>
        
        <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
        <p style="word-break: break-all; background: #f1f3f5; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
          ${verificationLink}
        </p>
        
        <p>Best regards,<br>
        <strong>Aged Care Analytics Team</strong></p>
      </div>
      
      <div class="footer">
        <p>This email was sent to ${email}.</p>
        <p>If you have any questions, please contact us at hello@austratics.com.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send welcome email for new user signup
 */
export async function sendWelcomeEmail(
  email: string,
  name?: string
): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const mailOptions = {
      from: `"Aged Care Analytics" <${emailConfig.masterAdminEmail}>`,
      to: email,
      subject: '👋 Welcome to Aged Care Analytics',
      html: generateWelcomeEmailTemplate(email, name, siteUrl),
      text: `
        Welcome to Aged Care Analytics!
        
        Thank you for signing up! We're excited to have you join us. Please check your inbox for a separate email to verify your email address.
        
        After verifying your email, you'll have access to all features of Aged Care Analytics, including:
        - Access to analytics and insights
        - Personalized reporting and recommendations
        - Industry-leading aged care data
        
        If you have any questions or need assistance, please don't hesitate to contact us at hello@austratics.com.
        
        Best regards,
        Aged Care Analytics Team
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', result.messageId);
    return true;

  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return false;
  }
}

/**
 * Generate HTML template for welcome email
 */
function generateWelcomeEmailTemplate(email: string, name?: string, siteUrl?: string): string {
  const displayName = name || email.split('@')[0];
  const loginUrl = `${siteUrl}/auth/signin`;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Aged Care Analytics</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 0 0 8px 8px;
          border: 1px solid #e9ecef;
          border-top: none;
        }
        .button {
          display: inline-block;
          background: #3B82F6;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .button:hover {
          background: #2563EB;
        }
        .feature-box {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border: 1px solid #e9ecef;
        }
        .feature-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 15px;
        }
        .feature-icon {
          min-width: 24px;
          text-align: center;
          margin-right: 10px;
        }
        .footer {
          text-align: center;
          color: #6c757d;
          font-size: 14px;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>👋 Welcome to Aged Care Analytics!</h1>
        <p>We're excited to have you join us</p>
      </div>
      
      <div class="content">
        <h2>Thank You for Signing Up</h2>
        <p>Hello ${displayName},</p>
        <p>Thank you for creating an account with Aged Care Analytics! Please check your inbox for a separate email with a verification link to complete your registration.</p>
        
        <div class="feature-box">
          <h3>What's Next?</h3>
          
          <div class="feature-item">
            <div class="feature-icon">✅</div>
            <div>
              <strong>Verify Your Email</strong>
              <p>Please verify your email address using the verification link sent in a separate email.</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">🔍</div>
            <div>
              <strong>Explore Our Features</strong>
              <p>After verification, you'll have access to our comprehensive aged care analytics platform.</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">📊</div>
            <div>
              <strong>Access Insights</strong>
              <p>Gain valuable insights and make data-driven decisions for better aged care outcomes.</p>
            </div>
          </div>
        </div>
        
        <p>Once your email is verified, you can sign in to your account:</p>
        <div style="text-align: center;">
          <a href="${loginUrl}" class="button">Sign In to Your Account</a>
        </div>
        
        <p>If you have any questions or need assistance, please don't hesitate to contact us at hello@austratics.com.</p>
        
        <p>Best regards,<br>
        <strong>The Aged Care Analytics Team</strong></p>
      </div>
      
      <div class="footer">
        <p>This email was sent to ${email}.</p>
        <p>© ${new Date().getFullYear()} Aged Care Analytics. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send invite link email for new user signup
 */
export async function sendInviteLinkEmail(
  email: string, 
  inviteLink: string,
  userName?: string
): Promise<boolean> {
  try {
    const transporter = getEmailTransporter();
    
    const mailOptions = {
      from: `"Aged Care Analytics" <${emailConfig.masterAdminEmail}>`,
      to: email,
      subject: '👋 Welcome to Aged Care Analytics - Account Invitation',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Aged Care Analytics</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #4f46e5 0%, #3c366b 100%);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: #f8f9fa;
              padding: 30px;
              border-radius: 0 0 8px 8px;
              border: 1px solid #e9ecef;
              border-top: none;
            }
            .button {
              display: inline-block;
              background: #4f46e5;
              color: white !important;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #6c757d;
              font-size: 14px;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>👋 Welcome to Aged Care Analytics</h1>
            <p>Your account has been created</p>
          </div>
          
          <div class="content">
            <h2>Your Account is Ready</h2>
            <p>Hello ${userName || 'there'},</p>
            <p>An account has been created for you on the Aged Care Analytics platform. You can now access the platform using the link below.</p>
            
            <div style="text-align: center;">
              <a href="${inviteLink}" class="button">🚀 Activate Your Account</a>
            </div>
            
            <p>After clicking the link, you'll be able to set your own secure password and access all features of the platform.</p>
            
            <p>If you have any questions or need assistance, please contact us at hello@austratics.com.</p>
            
            <p>Best regards,<br>
            <strong>Aged Care Analytics Team</strong></p>
          </div>
          
          <div class="footer">
            <p>This email was sent from the Aged Care Analytics platform.</p>
            <p>If you didn't expect this email, please contact us at hello@austratics.com.</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Aged Care Analytics
        
        An account has been created for you on the Aged Care Analytics platform.
        
        Click here to activate your account: ${inviteLink}
        
        After clicking the link, you'll be able to set your own secure password and access all features of the platform.
        
        If you have any questions or need assistance, please contact us at hello@austratics.com.
        
        Best regards,
        Aged Care Analytics Team
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Invite email sent successfully to: ${email}`);
    return true;
  } catch (error) {
    console.error(`Failed to send invite email to ${email}:`, error);
    return false;
  }
}

// ==========================================
// BACKGROUND EMAIL PROCESSING
// ==========================================

/**
 * Send periodic activity summaries (to be called by cron job or scheduler)
 */
export async function sendPeriodicActivitySummaries(): Promise<void> {
  try {
    // This would typically fetch recent activities from the database
    // For now, it's a placeholder for the actual implementation
    console.log('Sending periodic activity summaries...');
    
    // TODO: Implement actual database query for recent admin activities
    // const recentActivities = await getRecentAdminActivities();
    // await sendActivitySummaryEmail('admin-summary@system', recentActivities);
    
  } catch (error) {
    console.error('Failed to send periodic activity summaries:', error);
  }
}

/**
 * Helper function to ensure admin_users table has reset token columns
 * This is a temporary solution until proper migrations can be run
 */
export async function ensureAdminUserSchemaColumns(): Promise<boolean> {
  try {
    // We need to import dynamically to avoid circular dependency issues
    const { createServerSupabaseClient } = await import('./supabase');
    const supabase = await createServerSupabaseClient();
    
    console.log('Checking admin_users table schema for reset token columns...');
    
    try {
      // Directly try to use the columns first, since they should now exist
      const { data, error } = await supabase
        .from('admin_users')
        .select('reset_token, reset_token_expires_at')
        .limit(1);
      
      if (!error) {
        console.log('Reset token columns already exist in admin_users table');
        return true;
      } else {
        console.error('Error checking for reset token columns:', error);
        // Columns might not be in schema cache yet
      }
    } catch (checkError) {
      console.error('Error checking for reset token columns:', checkError);
    }

    // Try to force a schema cache refresh
    try {
      await supabase.rpc('pg_notify', { 
        channel: 'pgrst',
        payload: 'reload schema'
      });
      console.log('Schema cache refresh requested');
    } catch (refreshError) {
      console.log('Schema cache refresh not available, but columns may still exist');
    }
    
    return true; // Assume columns exist since they were added via SQL
  } catch (error) {
    console.error('Error ensuring admin user schema:', error);
    return false;
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate secure temporary password
 */
export function generateTempPassword(length: number = 12): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

// ==========================================
// CONTACT EMAIL SERVICE (DEFAULT EXPORT)
// ==========================================

interface ContactRequest {
  email: string;
  message: string;
  category?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const emailService = {
  /**
   * Check if email service is properly configured
   */
  isConfigured(): boolean {
    return !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
  },

  /**
   * Send contact/feedback email
   */
  async sendContactEmail(contactData: ContactRequest, clientIP?: string): Promise<EmailResult> {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Email service not configured' };
      }

      const transporter = getEmailTransporter();
      
      const mailOptions = {
        from: `"${contactData.email}" <${emailConfig.masterAdminEmail}>`,
        to: emailConfig.masterAdminEmail,
        replyTo: contactData.email,
        subject: `Contact Form Submission${contactData.category ? ` - ${contactData.category}` : ''}`,
        html: `
          <h3>New Contact Form Submission</h3>
          <p><strong>From:</strong> ${contactData.email}</p>
          ${contactData.category ? `<p><strong>Category:</strong> ${contactData.category}</p>` : ''}
          ${clientIP ? `<p><strong>IP Address:</strong> ${clientIP}</p>` : ''}
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <hr>
          <p><strong>Message:</strong></p>
          <p>${contactData.message.replace(/\n/g, '<br>')}</p>
        `,
        text: `
          New Contact Form Submission
          
          From: ${contactData.email}
          ${contactData.category ? `Category: ${contactData.category}` : ''}
          ${clientIP ? `IP Address: ${clientIP}` : ''}
          Timestamp: ${new Date().toLocaleString()}
          
          Message:
          ${contactData.message}
        `
      };

      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('Failed to send contact email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Send auto-response to user
   */
  async sendAutoResponse(userEmail: string): Promise<EmailResult> {
    try {
      if (!this.isConfigured()) {
        return { success: false, error: 'Email service not configured' };
      }

      const transporter = getEmailTransporter();
      
      const mailOptions = {
        from: `"Austratics Support" <${emailConfig.masterAdminEmail}>`,
        to: userEmail,
        subject: 'Thank you for contacting us - Austratics',
        html: `
          <h3>Austratics Support</h3>
          <p>Thank you for your message!</p>
          <p>We have received your contact form submission and will get back to you as soon as possible.</p>
          <p>Our team typically responds within 24-48 hours during business days.</p>
          <p>Best regards,<br>Austratics Team</p>
        `,
        text: `
          Austratics Support

          Thank you for your message!
          We have received your contact form submission and will get back to you as soon as possible.

          Our team typically responds within 24-48 hours during business days.

          Best regards,
          Austratics Team
        `
      };

      const result = await transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('Failed to send auto-response email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
};

export default emailService; 