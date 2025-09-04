import nodemailer from 'nodemailer';
import { ContactRequest } from '../app/api/contact/route';

// Email service configuration interface
interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: string;
  to: string;
}

// Email template interface
interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      // Load configuration from environment variables
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const fromEmail = process.env.FROM_EMAIL;
      const supportEmail = process.env.SUPPORT_EMAIL;

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !fromEmail || !supportEmail) {
        console.warn('[EMAIL SERVICE] Missing environment variables. Email sending will be disabled.');
        return;
      }

      this.config = {
        smtp: {
          host: smtpHost,
          port: parseInt(smtpPort),
          secure: parseInt(smtpPort) === 465, // true for 465, false for other ports
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        },
        from: fromEmail,
        to: supportEmail,
      };

      // Create transporter
      this.transporter = nodemailer.createTransport(this.config.smtp);

      console.log('[EMAIL SERVICE] Initialized successfully');
    } catch (error) {
      console.error('[EMAIL SERVICE] Initialization failed:', error);
    }
  }

  // Test email configuration
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.transporter) {
      return { success: false, error: 'Email service not initialized' };
    }

    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      console.error('[EMAIL SERVICE] Connection test failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Generate email template for contact form submission
  private generateContactTemplate(data: ContactRequest, clientIP: string): EmailTemplate {
    const timestamp = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });
    
    const subject = data.category 
      ? `[${data.category}] New Contact Form Submission`
      : 'New Contact Form Submission';

    const text = `
New Contact Form Submission

From: ${data.email}
Category: ${data.category || 'General Inquiry'}
Submitted: ${timestamp}
IP Address: ${clientIP}

Message:
${data.message}

---
This message was sent via the Aged Care Analytics contact form.
To reply, simply respond to this email.
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Contact Form Submission</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; }
    .message-box { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #2563eb; }
    .meta-info { background-color: #e9ecef; padding: 10px; margin: 15px 0; border-radius: 5px; font-size: 0.9em; }
    .footer { background-color: #6c757d; color: white; padding: 15px; border-radius: 0 0 8px 8px; font-size: 0.85em; }
  </style>
</head>
<body>
  <div class="header">
    <h2>📧 New Contact Form Submission</h2>
  </div>
  
  <div class="content">
    <div class="meta-info">
      <strong>From:</strong> ${data.email}<br>
      <strong>Category:</strong> ${data.category || 'General Inquiry'}<br>
      <strong>Submitted:</strong> ${timestamp}<br>
      <strong>IP Address:</strong> ${clientIP}
    </div>
    
    <div class="message-box">
      <h4>Message:</h4>
      <p>${data.message.replace(/\n/g, '<br>')}</p>
    </div>
  </div>
  
  <div class="footer">
    <p>This message was sent via the Aged Care Analytics contact form.<br>
    To reply, simply respond to this email.</p>
  </div>
</body>
</html>
    `.trim();

    return { subject, text, html };
  }

  // Send contact form email
  async sendContactEmail(
    data: ContactRequest, 
    clientIP: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter || !this.config) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const template = this.generateContactTemplate(data, clientIP);

      const mailOptions = {
        from: `"Aged Care Analytics" <${this.config.from}>`,
        to: this.config.to,
        replyTo: data.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
        headers: {
          'X-Contact-Form': 'true',
          'X-Client-IP': clientIP,
          'X-Submission-Time': new Date().toISOString(),
        },
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('[EMAIL SERVICE] Email sent successfully:', {
        messageId: info.messageId,
        from: data.email,
        category: data.category,
        timestamp: new Date().toISOString()
      });

      return { 
        success: true, 
        messageId: info.messageId 
      };

    } catch (error) {
      console.error('[EMAIL SERVICE] Failed to send email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Send auto-response email to user (optional feature)
  async sendAutoResponse(
    userEmail: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter || !this.config) {
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const subject = 'Thank you for contacting Aged Care Analytics';
      
      const text = `
Thank you for your message!

We've received your inquiry and will get back to you within 24-48 hours during business days.

If your inquiry is urgent, please call us directly.

Best regards,
Aged Care Analytics Team

---
This is an automated response. Please do not reply to this email.
      `.trim();

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Thank you for contacting us</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #28a745; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-radius: 0 0 8px 8px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>✅ Thank you for contacting us!</h2>
  </div>
  
  <div class="content">
    <p>We've received your inquiry and will get back to you within <strong>24-48 hours</strong> during business days.</p>
    
    <p>If your inquiry is urgent, please call us directly.</p>
    
    <p>Best regards,<br>
    <strong>Aged Care Analytics Team</strong></p>
    
    <hr style="margin: 20px 0;">
    <p style="font-size: 0.85em; color: #6c757d;">
      This is an automated response. Please do not reply to this email.
    </p>
  </div>
</body>
</html>
      `.trim();

      const mailOptions = {
        from: `"Aged Care Analytics" <${this.config.from}>`,
        to: userEmail,
        subject,
        text,
        html,
        headers: {
          'X-Auto-Response': 'true',
        },
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log('[EMAIL SERVICE] Auto-response sent:', {
        messageId: info.messageId,
        to: userEmail,
        timestamp: new Date().toISOString()
      });

      return { 
        success: true, 
        messageId: info.messageId 
      };

    } catch (error) {
      console.error('[EMAIL SERVICE] Failed to send auto-response:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Check if email service is available
  isConfigured(): boolean {
    return this.transporter !== null && this.config !== null;
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService; 