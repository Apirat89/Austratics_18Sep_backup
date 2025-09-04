import { NextRequest, NextResponse } from 'next/server';
import emailService from '../../../lib/emailService';
import { getCurrentUser } from '../../../lib/auth';

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, 10 * 60 * 1000);

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60 * 1000 // 1 minute
};

export interface ContactRequest {
  email: string;
  message: string;
  category?: string;
}

interface ContactResponse {
  success: boolean;
  message: string;
  error?: string;
  details?: any;
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  // Fallback for local development
  return '127.0.0.1';
}

function checkRateLimit(ip: string): { allowed: boolean; resetTime?: number; remaining?: number } {
  const now = Date.now();
  const userData = rateLimitStore.get(ip);
  
  if (!userData || now > userData.resetTime) {
    // Reset or create new entry
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs
    });
    
    return {
      allowed: true,
      resetTime: now + RATE_LIMIT.windowMs,
      remaining: RATE_LIMIT.maxRequests - 1
    };
  }
  
  if (userData.count >= RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      resetTime: userData.resetTime,
      remaining: 0
    };
  }
  
  userData.count++;
  
  return {
    allowed: true,
    resetTime: userData.resetTime,
    remaining: RATE_LIMIT.maxRequests - userData.count
  };
}

function validateInput(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Message is required
  if (!data.message || typeof data.message !== 'string') {
    errors.push('Message is required');
  } else if (data.message.trim().length < 10) {
    errors.push('Message must be at least 10 characters long');
  } else if (data.message.length > 5000) {
    errors.push('Message is too long (maximum 5000 characters)');
  }
  
  // Optional category validation
  if (data.category && typeof data.category !== 'string') {
    errors.push('Invalid category format');
  } else if (data.category && data.category.length > 100) {
    errors.push('Category is too long');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>'"]/g, '') // Remove basic HTML/script characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

function logRequest(ip: string, data: ContactRequest, success: boolean, error?: string) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    ip,
    email: data.email,
    messageLength: data.message?.length || 0,
    category: data.category,
    success,
    error: error || null
  };
  
  console.log('[CONTACT API]', JSON.stringify(logData));
}

export async function POST(request: NextRequest): Promise<NextResponse<ContactResponse>> {
  const clientIP = getClientIP(request);
  
  try {
    // Check user authentication
    const currentUser = await getCurrentUser();
    
    if (!currentUser || !currentUser.email) {
      return NextResponse.json(
        {
          success: false,
          message: 'You must be logged in to send feedback.',
          error: 'AUTHENTICATION_REQUIRED'
        },
        { status: 401 }
      );
    }
    
    // Check rate limiting
    const rateCheck = checkRateLimit(clientIP);
    
    if (!rateCheck.allowed) {
      const resetTime = new Date(rateCheck.resetTime || 0);
      return NextResponse.json(
        {
          success: false,
          message: 'Too many requests. Please try again later.',
          error: 'RATE_LIMITED',
          details: {
            resetTime: resetTime.toISOString(),
            retryAfter: Math.ceil((rateCheck.resetTime! - Date.now()) / 1000)
          }
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(rateCheck.resetTime! / 1000).toString()
          }
        }
      );
    }
    
    // Parse request body
    const body = await request.json().catch(() => null);
    
    if (!body) {
      logRequest(clientIP, body, false, 'Invalid JSON');
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request format',
          error: 'INVALID_JSON'
        },
        { status: 400 }
      );
    }
    
    // Validate input
    const validation = validateInput(body);
    
    if (!validation.isValid) {
      logRequest(clientIP, body, false, `Validation failed: ${validation.errors.join(', ')}`);
      return NextResponse.json(
        {
          success: false,
          message: 'Please check your input and try again',
          error: 'VALIDATION_FAILED',
          details: {
            errors: validation.errors
          }
        },
        { status: 400 }
      );
    }
    
    // Sanitize input and use authenticated user's email
    const contactData: ContactRequest = {
      email: currentUser.email!, // We've already verified this exists above
      message: sanitizeInput(body.message),
      category: body.category ? sanitizeInput(body.category) : undefined
    };
    
    // Send email via SMTP service
    let emailResult = null;
    if (emailService.isConfigured()) {
      emailResult = await emailService.sendContactEmail(contactData, clientIP);
      
      if (!emailResult.success) {
        console.error('[CONTACT API] Email sending failed:', emailResult.error);
        // Don't fail the request if email fails - log it and continue
        // This ensures users get feedback even if email service is temporarily down
      } else {
        console.log('[CONTACT API] Email sent successfully:', emailResult.messageId);
        
        // Optional: Send auto-response to user
        try {
          await emailService.sendAutoResponse(contactData.email);
        } catch (autoResponseError) {
          console.warn('[CONTACT API] Auto-response failed:', autoResponseError);
          // Don't fail the main request if auto-response fails
        }
      }
    } else {
      console.warn('[CONTACT API] Email service not configured - message logged only');
    }
    
    logRequest(clientIP, contactData, true);
    
    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for your message! We will get back to you soon.'
      },
      { 
        status: 200,
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT.maxRequests.toString(),
          'X-RateLimit-Remaining': (rateCheck.remaining || 0).toString(),
          'X-RateLimit-Reset': Math.ceil(rateCheck.resetTime! / 1000).toString()
        }
      }
    );
    
  } catch (error) {
    console.error('[CONTACT API] Unexpected error:', error);
    logRequest(clientIP, {} as ContactRequest, false, 'Internal server error');
    
    return NextResponse.json(
      {
        success: false,
        message: 'Something went wrong. Please try again later.',
        error: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET(): Promise<NextResponse<ContactResponse>> {
  return NextResponse.json(
    {
      success: false,
      message: 'Method not allowed. Use POST to submit contact forms.',
      error: 'METHOD_NOT_ALLOWED'
    },
    { status: 405 }
  );
} 