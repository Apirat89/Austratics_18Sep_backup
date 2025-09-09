import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from './supabase';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'user' | 'staff' | 'owner';
  permissions: Record<string, any>;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  statusCode?: number;
}

/**
 * Authenticate user and check if they have admin privileges
 */
export async function authenticateAdmin(request: NextRequest): Promise<AuthResult> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        statusCode: 401
      };
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, permissions')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found',
        statusCode: 403
      };
    }

    // Check if user has admin role
    if (!['staff', 'owner'].includes(profile.role)) {
      return {
        success: false,
        error: 'Admin privileges required',
        statusCode: 403
      };
    }

    return {
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        permissions: profile.permissions || {}
      }
    };

  } catch (error) {
    console.error('Admin authentication error:', error);
    return {
      success: false,
      error: 'Internal server error',
      statusCode: 500
    };
  }
}

/**
 * Authenticate any user (not just admin)
 */
export async function authenticateUser(request: NextRequest): Promise<AuthResult> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        statusCode: 401
      };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, permissions')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found',
        statusCode: 403
      };
    }

    return {
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        permissions: profile.permissions || {}
      }
    };

  } catch (error) {
    console.error('User authentication error:', error);
    return {
      success: false,
      error: 'Internal server error',
      statusCode: 500
    };
  }
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: AuthenticatedUser, permission: string): boolean {
  // Owners have all permissions
  if (user.role === 'owner') {
    return true;
  }

  // Check specific permission
  return user.permissions[permission] === true;
}

/**
 * Check if user can access resource (owner can access all, staff can access own)
 */
export function canAccessResource(user: AuthenticatedUser, resourceUserId?: string): boolean {
  // Owners can access all resources
  if (user.role === 'owner') {
    return true;
  }

  // Staff can only access their own resources
  if (user.role === 'staff') {
    return !resourceUserId || resourceUserId === user.id;
  }

  return false;
}

/**
 * Rate limiting for admin endpoints (more lenient than user endpoints)
 */
const adminRateLimitCache = new Map<string, { count: number; resetTime: number }>();

export function checkAdminRateLimit(key: string, maxRequests: number = 1000, windowMs: number = 60 * 1000): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const entry = adminRateLimitCache.get(key);

  if (!entry) {
    adminRateLimitCache.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (now > entry.resetTime) {
    adminRateLimitCache.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true };
} 