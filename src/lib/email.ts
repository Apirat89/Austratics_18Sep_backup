import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
        <title>Password Reset - Aged Care Analytics</title>
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
            .logo { width: 40px; height: 40px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🏥</div>
                <h1>Aged Care Analytics</h1>
                <p>Secure Password Reset Request</p>
            </div>
            
            <div class="content">
                <h2 style="color: #1E293B; margin-bottom: 20px;">Reset Your Password</h2>
                
                <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                    Hello,<br><br>
                    We received a request to reset the password for your Aged Care Analytics account (<strong>${userEmail}</strong>).
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
                    If you have any questions or concerns, please contact our support team.
                </p>
            </div>
            
            <div class="footer">
                <p><strong>Aged Care Analytics</strong></p>
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
Password Reset - Aged Care Analytics

Hello,

We received a request to reset the password for your Aged Care Analytics account (${userEmail}).

To reset your password, click this link or copy and paste it into your browser:
${resetUrl}

Security Information:
- This link will expire in 1 hour for your security
- If you didn't request this reset, please ignore this email
- Never share this link with anyone
- We recommend using a strong, unique password

If you have any questions, please contact our support team.

Best regards,
Aged Care Analytics Team
  `;

  try {
    const result = await resend.emails.send({
      from: 'Aged Care Analytics <noreply@your-domain.com>', // Replace with your domain
      to: [to],
      subject: '🔒 Password Reset Request - Aged Care Analytics',
      html: emailHtml,
      text: emailText,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error };
  }
}

// Alternative: Nodemailer for any SMTP provider (Gmail, Outlook, etc.)
export async function sendPasswordResetEmailSMTP({ to, resetToken, resetUrl, userEmail }: PasswordResetEmailData) {
  // This is an alternative if you prefer to use your own SMTP server
  // You can uncomment and configure this if you want to use Gmail/Outlook instead of Resend
  
  /*
  import nodemailer from 'nodemailer';
  
  const transporter = nodemailer.createTransporter({
    service: 'gmail', // or 'outlook', 'yahoo', etc.
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // Use app password for Gmail
    },
  });

  const mailOptions = {
    from: `"Aged Care Analytics" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: '🔒 Password Reset Request - Aged Care Analytics',
    html: emailHtml,
    text: emailText,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: error };
  }
  */
} 