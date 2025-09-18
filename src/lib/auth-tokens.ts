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

// Expert-provided helper functions for defensive JSON parsing
function keyFor(token: string) {
  return `reset_token:${token}`;
}

function keyForToken(token: string) {
  return `reset_token:${token}`;
}

type TokenRecord = { userId: string; createdAt: number; used?: boolean };

function parseJsonSafely(raw: unknown):
  | { ok: true; value: any }
  | { ok: false; reason: 'missing' | 'bad_string' | 'unknown'; raw?: unknown } {
  if (raw == null) return { ok: false, reason: 'missing' };
  if (typeof raw === 'string') {
    try {
      return { ok: true, value: JSON.parse(raw) };
    } catch {
      return { ok: false, reason: 'bad_string', raw };
    }
  }
  if (typeof raw === 'object') return { ok: true, value: raw as any };
  return { ok: false, reason: 'unknown', raw };
}

export async function createResetTokenForUser(userId: string): Promise<string> {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''); // 64 hex
  const key = keyFor(token);
  const data = { userId, createdAt: Date.now() };

  // atomic set + 24h TTL
  await redis.set(key, JSON.stringify(data), { ex: 86400, nx: true });
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

export async function validateResetToken(tokenRaw: string) {
  const token = (tokenRaw ?? '').trim();
  if (!/^[a-fA-F0-9]{64}$/.test(token)) {
    return { ok: false as const, code: 'invalid_format' as const };
  }
  
  const key = keyForToken(token);
  const raw = await redis.get(key);
  const parsed = parseJsonSafely(raw);

  if (!parsed.ok) {
    if (parsed.reason === 'bad_string') {
      await redis.del(key);
      console.warn('Deleted malformed reset token value', { key, raw: parsed.raw });
    }
    return { ok: false as const, code: 'expired_or_invalid' as const };
  }

  const rec = parsed.value as TokenRecord;
  if (!rec?.userId) return { ok: false as const, code: 'expired_or_invalid' as const };
  if (rec.used) return { ok: false as const, code: 'already_used' as const };

  return { ok: true as const, userId: rec.userId, key };
}

export async function markResetTokenUsed(key: string) {
  const raw = await redis.get(key);
  const parsed = parseJsonSafely(raw);
  if (!parsed.ok) { 
    await redis.del(key); 
    return; 
  }

  const rec = parsed.value as TokenRecord;
  rec.used = true;
  await redis.set(key, JSON.stringify(rec), { ex: 600 });
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