import nodemailer from 'nodemailer';

export interface PasswordResetEmailData {
  to: string;
  resetToken: string;
  resetUrl: string;
  userEmail: string;
}

export async function sendPasswordResetEmail({ to, resetToken, resetUrl, userEmail }: PasswordResetEmailData) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset - Austratics</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); padding: 40px 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
            .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px; }
            .content { padding: 40px 30px; }
            .reset-button { display: inline-block; background: #3B82F6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin: 20px 0; }
            .reset-button:hover { background: #1E40AF; }
            .security-notice { background: #F1F5F9; border-left: 4px solid #3B82F6; padding: 20px; margin: 30px 0; border-radius: 4px; }
            .footer { background: #F8FAFC; padding: 30px; text-align: center; color: #64748B; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Austratics</h1>
                <p>Secure Password Reset Request</p>
            </div>
            
            <div class="content">
                <h2 style="color: #1E293B; margin-bottom: 20px;">Reset Your Password</h2>
                
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                    Hello,<br><br>
                    We received a request to reset the password for your Austratics account (<strong>${userEmail}</strong>).
                </p>
                
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                    Click the button below to create a new password:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" class="reset-button">Reset My Password</a>
                </div>
                
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                    Or copy and paste this link into your browser:<br>
                    <a href="${resetUrl}" style="color: #3B82F6; word-break: break-all;">${resetUrl}</a>
                </p>
                
                <div class="security-notice">
                    <h3 style="color: #1E293B; margin-top: 0; font-size: 16px;">🔒 Security Information</h3>
                    <ul style="color: #475569; margin: 10px 0; padding-left: 20px;">
                        <li>This link will expire in <strong>1 hour</strong> for your security</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Never share this link with anyone</li>
                        <li>We recommend using a strong, unique password</li>
                    </ul>
                </div>
                
                <p style="color: #64748B; font-size: 14px; margin-top: 30px;">
                    If you have any questions or concerns, please contact us at hello@austratics.com.
                </p>
            </div>
            
            <div class="footer">
                <p><strong>Austratics</strong></p>
                <p>Trusted by healthcare providers nationwide</p>
                <p style="margin-top: 20px;">
                    This email was sent to ${userEmail}. If you didn't request this, please ignore this email.
                </p>
            </div>
        </div>
    </body>
    </html>
  `;

  const emailText = `
Password Reset - Austratics

Hello,

We received a request to reset the password for your Austratics account (${userEmail}).

To reset your password, click this link or copy and paste it into your browser:
${resetUrl}

Security Information:
- This link will expire in 1 hour for your security
- If you didn't request this reset, please ignore this email
- Never share this link with anyone
- We recommend using a strong, unique password

If you have any questions, please contact us at hello@austratics.com.

Best regards,
Austratics Team
  `;

  // SMTP Configuration
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.spacemail.com',
    port: 465,
    secure: true, // Use SSL instead of TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false
    }
  });

  const mailOptions = {
    from: `"Austratics" <${process.env.EMAIL_USER || 'hello@austratics.com'}>`,
    to: to,
    subject: '🔒 Password Reset Request - Austratics',
    html: emailHtml,
    text: emailText,
  };

  try {
    console.log('📧 Attempting to send email to:', to);
    console.log('📧 SMTP Host:', process.env.SMTP_HOST || 'mail.spacemail.com');
    console.log('📧 SMTP User:', process.env.EMAIL_USER ? 'SET' : 'MISSING');
    console.log('📧 SMTP Password:', process.env.EMAIL_PASSWORD ? 'SET' : 'MISSING');
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Email sending error:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
} 