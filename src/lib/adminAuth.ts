import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from './supabase';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'user' | 'staff' | 'owner';
  permissions: Record<string, any>;
  // New company fields
  companyId?: string;
  companyName?: string;
  status: 'active' | 'suspended' | 'deleted';
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

    // Get user profile with role and company info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id, 
        email, 
        role, 
        permissions, 
        company_id,
        status,
        companies:company_id (
          id,
          name
        )
      `)
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found',
        statusCode: 403
      };
    }

    // Check if user account is active
    if (profile.status !== 'active') {
      return {
        success: false,
        error: `Account is ${profile.status}. Please contact support.`,
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
        permissions: profile.permissions || {},
        companyId: profile.company_id,
        companyName: profile.companies?.[0]?.name,
        status: profile.status
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

    // Get user profile with company info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id, 
        email, 
        role, 
        permissions, 
        company_id,
        status,
        companies:company_id (
          id,
          name
        )
      `)
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found',
        statusCode: 403
      };
    }

    // Check if user account is active
    if (profile.status !== 'active') {
      return {
        success: false,
        error: `Account is ${profile.status}. Please contact support.`,
        statusCode: 403
      };
    }

    return {
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        permissions: profile.permissions || {},
        companyId: profile.company_id,
        companyName: profile.companies?.[0]?.name,
        status: profile.status
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
 * Check if user can access resource (owner can access all, staff can access own company)
 */
export function canAccessResource(user: AuthenticatedUser, resourceUserId?: string, resourceCompanyId?: string): boolean {
  // Owners can access all resources
  if (user.role === 'owner') {
    return true;
  }

  // Staff can access resources from their own company
  if (user.role === 'staff') {
    // If checking user resource, allow if same user or same company
    if (resourceUserId && resourceUserId === user.id) {
      return true;
    }
    
    // If checking company resource, allow if same company
    if (resourceCompanyId && resourceCompanyId === user.companyId) {
      return true;
    }
    
    // If no specific resource checks, only allow own resources
    return !resourceUserId || resourceUserId === user.id;
  }

  return false;
}

/**
 * Check if user can access company data
 */
export function canAccessCompany(user: AuthenticatedUser, companyId: string): boolean {
  // Owners can access all companies
  if (user.role === 'owner') {
    return true;
  }

  // Staff can only access their own company
  return user.companyId === companyId;
}

/**
 * Get accessible company IDs for user (for database filtering)
 */
export function getAccessibleCompanyIds(user: AuthenticatedUser): string[] {
  // Owners can access all companies (return empty array = no filter needed)
  if (user.role === 'owner') {
    return [];
  }

  // Staff can only access their own company
  return user.companyId ? [user.companyId] : [];
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