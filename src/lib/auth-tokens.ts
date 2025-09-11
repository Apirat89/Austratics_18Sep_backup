import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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
    console.warn('Redis not available, falling back to file storage');
  }
}

// File-based storage for development (persists across server restarts)
const tokenStorageFile = path.join(process.cwd(), '.tmp-reset-tokens.json');

// Ensure .tmp-reset-tokens.json exists
function ensureTokenFile() {
  if (!fs.existsSync(tokenStorageFile)) {
    fs.writeFileSync(tokenStorageFile, JSON.stringify({}), 'utf8');
  }
}

// Load tokens from file
function loadTokens(): Record<string, {
  email: string;
  userId: string;
  expiresAt: number;
  used: boolean;
}> {
  try {
    ensureTokenFile();
    const content = fs.readFileSync(tokenStorageFile, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('Failed to load token file, using empty tokens');
    return {};
  }
}

// Save tokens to file
function saveTokens(tokens: Record<string, any>) {
  try {
    ensureTokenFile();
    fs.writeFileSync(tokenStorageFile, JSON.stringify(tokens, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save token file:', error);
  }
}

// Clean up expired tokens from storage
function cleanupExpiredTokensFromFile() {
  const tokens = loadTokens();
  const now = Date.now();
  let hasChanges = false;
  
  for (const [token, data] of Object.entries(tokens)) {
    if (now > data.expiresAt) {
      delete tokens[token];
      hasChanges = true;
    }
  }
  
  if (hasChanges) {
    saveTokens(tokens);
  }
}

export interface ResetTokenData {
  token: string;
  email: string;
  userId: string;
  expiresAt: number;
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createResetToken(email: string): Promise<{ success: boolean; token?: string; error?: string; emailExists?: boolean }> {
  try {
    // Check if user exists in Supabase
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return { success: false, error: 'Failed to process request' };
    }

    const user = users.users.find(u => u.email === email);
    if (!user) {
      // Return email doesn't exist flag
      return { success: false, emailExists: false, error: 'Email not registered' };
    }

    // Use Redis in production, file storage in development
    if (TokenManager && isProduction) {
      const token = await TokenManager.createToken(user.id, email);
      return { success: true, token, emailExists: true };
    } else {
      // Use file storage for development
      cleanupExpiredTokensFromFile(); // Clean up old tokens first
      
      const token = generateResetToken();
      const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour

      const tokens = loadTokens();
      tokens[token] = {
        email,
        userId: user.id,
        expiresAt,
        used: false
      };
      
      saveTokens(tokens);
      console.log(`✅ Token created and saved to file: ${token.substring(0, 16)}...`);

      return { success: true, token, emailExists: true };
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
      // Use file storage for development
      cleanupExpiredTokensFromFile(); // Clean up expired tokens first
      
      const tokens = loadTokens();
      const tokenData = tokens[token];
      
      if (!tokenData) {
        return { valid: false, error: 'Invalid token' };
      }

      if (tokenData.used) {
        return { valid: false, error: 'Token already used' };
      }

      if (Date.now() > tokenData.expiresAt) {
        // Remove expired token
        delete tokens[token];
        saveTokens(tokens);
        return { valid: false, error: 'Token expired' };
      }

      console.log(`✅ Token validation successful: ${token.substring(0, 16)}...`);
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
      // Use file storage for development
      const tokens = loadTokens();
      if (tokens[token]) {
        tokens[token].used = true;
        saveTokens(tokens);
        console.log(`✅ Token marked as used: ${token.substring(0, 16)}...`);
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

// Clean up expired tokens (enhanced for file storage)
export function cleanupExpiredTokens(): void {
  if (!isProduction) {
    cleanupExpiredTokensFromFile();
  }
} 