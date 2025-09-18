import { createClient } from '@supabase/supabase-js';
import { redis } from './redis';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const IS_PROD = process.env.NODE_ENV === 'production';

// helpful boot log (remove after verifying)
console.log('RESET_TOKEN_STORE', {
  node: process.version,
  nodeEnv: process.env.NODE_ENV,
  kvUrlPresent: !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
  kvTokenPresent: !!(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN),
});

function keyFor(token: string) {
  return `reset_token:${token}`;
}

export async function createResetTokenForUser(userId: string): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''); // 64 hex
  const key = keyFor(token);
  const data = { userId, createdAt: Date.now() };

  // atomic set + 1h TTL
  await redis.set(key, JSON.stringify(data), { ex: 3600, nx: true });
  return token;
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

    // Use Redis for token storage
    const token = await createResetTokenForUser(user.id);
    return { success: true, token, emailExists: true };
  } catch (error) {
    console.error('Error creating reset token:', error);
    return { success: false, error: 'Failed to create reset token' };
  }
}

export async function validateResetToken(tokenRaw: string): Promise<{ 
  valid: boolean; 
  email?: string; 
  userId?: string; 
  error?: string;
  key?: string;
}> {
  try {
    const token = (tokenRaw ?? '').trim();
    if (!/^[a-fA-F0-9]{64}$/.test(token)) {
      return { valid: false, error: 'Invalid token format' };
    }

    const key = keyFor(token);
    const json = await redis.get<string>(key);
    if (!json) {
      return { valid: false, error: 'Invalid or expired token' };
    }

    const record = JSON.parse(json) as { userId: string; createdAt: number; used?: boolean };

    if (record.used) {
      return { valid: false, error: 'Token already used' };
    }

    return { valid: true, userId: record.userId, key }; // return key so route can mark used
  } catch (error) {
    console.error('Error validating token:', error);
    return { valid: false, error: 'Failed to validate token' };
  }
}

export async function markResetTokenUsed(key: string): Promise<void> {
  try {
    const json = await redis.get<string>(key);
    if (!json) return;
    const record = JSON.parse(json);
    record.used = true;
    // keep a short TTL after use (optional)
    await redis.set(key, JSON.stringify(record), { ex: 600 });
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