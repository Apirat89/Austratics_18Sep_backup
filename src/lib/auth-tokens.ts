import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Import Redis TokenManager for production
let TokenManager: any = null;
const isProduction = process.env.NODE_ENV === 'production' && 
                    process.env.UPSTASH_REDIS_REST_URL && 
                    process.env.UPSTASH_REDIS_REST_TOKEN;

if (isProduction) {
  try {
    TokenManager = require('./redis').TokenManager;
  } catch (error) {
    console.warn('Redis not available, falling back to memory storage');
  }
}

// Fallback in-memory storage for development
const resetTokens = new Map<string, {
  email: string;
  userId: string;
  expiresAt: number;
  used: boolean;
}>();

export interface ResetTokenData {
  token: string;
  email: string;
  userId: string;
  expiresAt: number;
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createResetToken(email: string): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    // Check if user exists in Supabase
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return { success: false, error: 'Failed to process request' };
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return { success: true }; // Return success but don't actually create token
    }

    // Use Redis in production, memory in development
    if (TokenManager && isProduction) {
      const token = await TokenManager.createToken(user.id, email);
      return { success: true, token };
    } else {
      // Fallback to memory storage
      const token = generateResetToken();
      const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour

      resetTokens.set(token, {
        email,
        userId: user.id,
        expiresAt,
        used: false
      });

      return { success: true, token };
    }
  } catch (error) {
    console.error('Error creating reset token:', error);
    return { success: false, error: 'Failed to create reset token' };
  }
}

export async function validateResetToken(token: string): Promise<{ 
  valid: boolean; 
  email?: string; 
  userId?: string; 
  error?: string 
}> {
  try {
    // Use Redis in production
    if (TokenManager && isProduction) {
      const tokenData = await TokenManager.validateToken(token);
      if (!tokenData) {
        return { valid: false, error: 'Invalid or expired token' };
      }
      return { 
        valid: true, 
        email: tokenData.email, 
        userId: tokenData.userId 
      };
    } else {
      // Fallback to memory storage
      const tokenData = resetTokens.get(token);
      
      if (!tokenData) {
        return { valid: false, error: 'Invalid token' };
      }

      if (tokenData.used) {
        return { valid: false, error: 'Token already used' };
      }

      if (Date.now() > tokenData.expiresAt) {
        resetTokens.delete(token); // Clean up expired token
        return { valid: false, error: 'Token expired' };
      }

      return { 
        valid: true, 
        email: tokenData.email, 
        userId: tokenData.userId 
      };
    }
  } catch (error) {
    console.error('Error validating token:', error);
    return { valid: false, error: 'Failed to validate token' };
  }
}

export async function markTokenAsUsed(token: string): Promise<void> {
  try {
    if (TokenManager && isProduction) {
      await TokenManager.markTokenUsed(token);
    } else {
      // Fallback to memory storage
      const tokenData = resetTokens.get(token);
      if (tokenData) {
        tokenData.used = true;
      }
    }
  } catch (error) {
    console.error('Error marking token as used:', error);
  }
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (error) {
      console.error('Error updating password:', error);
      return { success: false, error: 'Failed to update password' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating password:', error);
    return { success: false, error: 'Failed to update password' };
  }
}

// Clean up expired tokens (only needed for memory storage)
export function cleanupExpiredTokens(): void {
  if (!isProduction) {
    const now = Date.now();
    for (const [token, data] of resetTokens.entries()) {
      if (now > data.expiresAt) {
        resetTokens.delete(token);
      }
    }
  }
} 