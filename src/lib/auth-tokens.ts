import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// In-memory storage for demo (use Redis/Database in production)
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

    // Generate secure token
    const token = generateResetToken();
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour

    // Store token
    resetTokens.set(token, {
      email,
      userId: user.id,
      expiresAt,
      used: false
    });

    return { success: true, token };
  } catch (error) {
    console.error('Error creating reset token:', error);
    return { success: false, error: 'Failed to create reset token' };
  }
}

export function validateResetToken(token: string): { 
  valid: boolean; 
  email?: string; 
  userId?: string; 
  error?: string 
} {
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

export function markTokenAsUsed(token: string): void {
  const tokenData = resetTokens.get(token);
  if (tokenData) {
    tokenData.used = true;
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

// Clean up expired tokens (run this periodically)
export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [token, data] of resetTokens.entries()) {
    if (now > data.expiresAt) {
      resetTokens.delete(token);
    }
  }
} 