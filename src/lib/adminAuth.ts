import { createBrowserSupabaseClient, createServerSupabaseClient } from './supabase';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// ==========================================
// TYPES AND INTERFACES
// ==========================================

export interface AdminUser {
  id: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  isMaster: boolean;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
  createdBy?: string;
}

export interface AdminSession {
  id: string;
  adminUserId: string;
  sessionToken: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastSeen: string;
  expiresAt: string;
  isActive: boolean;
}

export interface AdminAuthResponse {
  success: boolean;
  error?: string;
  admin?: AdminUser;
  session?: AdminSession;
}

export interface AdminCreateRequest {
  email: string;
  password?: string; // Optional - will generate if not provided
}

export interface AdminPermissions {
  canAddAdmin: boolean;
  canDeleteAdmin: (targetAdminId: string, targetEmail: string) => boolean;
  canViewAdminList: boolean;
  canViewUserList: boolean;
  canViewUsageStats: boolean;
  canManageUsers: boolean;
}

// ==========================================
// ADMIN AUTHENTICATION FUNCTIONS
// ==========================================

/**
 * Authenticate admin user with email and password
 */
export async function authenticateAdmin(email: string, password: string): Promise<AdminAuthResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get admin user by email
    const { data: adminUser, error: userError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .in('status', ['active', 'pending']) // Accept both active and pending status
      .single();

    if (userError || !adminUser) {
      return { success: false, error: 'Invalid admin credentials' };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, adminUser.password_hash);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid admin credentials' };
    }

    // If admin is 'pending', update status to 'active'
    if (adminUser.status === 'pending') {
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', adminUser.id);
      
      if (updateError) {
        console.error('Failed to update admin status:', updateError);
        // Continue anyway - let them login
      } else {
        console.log(`Admin user ${email} activated on first login`);
        adminUser.status = 'active'; // Update the local object for the rest of the function
      }
    }

    // Create admin session
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .insert({
        admin_user_id: adminUser.id,
        session_token: sessionToken,
        ip_address: null, // Will be set by middleware
        user_agent: null, // Will be set by middleware
        expires_at: expiresAt.toISOString(),
        is_active: true
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Failed to create admin session:', sessionError);
      return { success: false, error: 'Failed to create admin session' };
    }

    // Update last_active
    await supabase
      .from('admin_users')
      .update({ last_active: new Date().toISOString() })
      .eq('id', adminUser.id);

    // Log admin login
    await logAdminAction('admin_login', 'admin_user', adminUser.id, {
      email: adminUser.email,
      loginTime: new Date().toISOString()
    });

    return {
      success: true,
      admin: formatAdminUser(adminUser),
      session: formatAdminSession(session)
    };

  } catch (error) {
    console.error('Admin authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Validate admin session token
 */
export async function validateAdminSession(sessionToken: string): Promise<AdminAuthResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .select(`
        *,
        admin_users (*)
      `)
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session || !session.admin_users) {
      return { success: false, error: 'Invalid or expired session' };
    }

    // Update session heartbeat
    await supabase.rpc('update_admin_session_heartbeat', {
      session_token: sessionToken
    });

    return {
      success: true,
      admin: formatAdminUser(session.admin_users),
      session: formatAdminSession(session)
    };

  } catch (error) {
    console.error('Session validation error:', error);
    return { success: false, error: 'Session validation failed' };
  }
}

/**
 * Logout admin user (invalidate session)
 */
export async function logoutAdmin(sessionToken: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get session info for logging
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('admin_user_id')
      .eq('session_token', sessionToken)
      .single();

    // Deactivate session
    const { error } = await supabase
      .from('admin_sessions')
      .update({ is_active: false })
      .eq('session_token', sessionToken);

    if (error) {
      console.error('Logout error:', error);
      return false;
    }

    // Log admin logout
    if (session) {
      await logAdminAction('admin_logout', 'admin_user', session.admin_user_id, {
        logoutTime: new Date().toISOString()
      });
    }

    return true;

  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
}

// ==========================================
// ADMIN MANAGEMENT FUNCTIONS
// ==========================================

/**
 * Create new admin user
 */
export async function createAdminUser({ email, password }: AdminCreateRequest, currentAdmin: AdminUser): Promise<AdminAuthResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check if current user is master admin
    if (!currentAdmin || !currentAdmin.isMaster) {
      return { success: false, error: 'Only master admin can create admin users' };
    }

    // Generate password if not provided
    const adminPassword = password || generateSecurePassword();
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    // Generate activation token
    const activationToken = uuidv4();
    const activationExpires = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    // Create admin user
    const { data: newAdmin, error: createError } = await supabase
      .from('admin_users')
      .insert({
        email,
        password_hash: passwordHash,
        status: 'pending',
        is_master: false,
        created_by: null, // Set to null since we don't use auth.users table
        activation_token: activationToken,
        activation_expires_at: activationExpires.toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Failed to create admin user:', createError);
      return { success: false, error: `Database error: ${createError.message}` };
    }

    // Send activation email
    try {
      const { sendAdminInvitationEmail } = await import('./emailService');
      const emailSent = await sendAdminInvitationEmail(email, adminPassword, activationToken);
      
      if (!emailSent) {
        console.error('Failed to send admin invitation email, but admin user was created');
        // Continue - user created but email failed
      } else {
        console.log(`Admin invitation email sent successfully to: ${email}`);
      }
    } catch (emailError) {
      console.error('Email service error (continuing with user creation):', emailError);
      // Continue - email failed but user should still be created
    }

    return {
      success: true,
      admin: formatAdminUser(newAdmin)
    };

  } catch (error) {
    console.error('Create admin user error:', error);
    return { success: false, error: 'Failed to create admin user' };
  }
}

/**
 * Delete admin user
 */
export async function deleteAdminUser(adminId: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const currentAdmin = await getCurrentAdmin();
    if (!currentAdmin) {
      console.log('Delete failed: No authenticated admin');
      return false;
    }

    // Get target admin info
    const { data: targetAdmin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', adminId)
      .single();

    if (!targetAdmin) {
      console.log(`Delete failed: Target admin ${adminId} not found`);
      return false;
    }

    // Check permissions
    const permissions = getAdminPermissions(currentAdmin);
    const canDelete = permissions.canDeleteAdmin(adminId, targetAdmin.email);
    
    console.log(`Delete permission check: ${currentAdmin.email} (isMaster: ${currentAdmin.isMaster}) attempting to delete ${targetAdmin.email}`);
    console.log(`Permission result: ${canDelete ? 'ALLOWED' : 'DENIED'}`);
    
    if (!canDelete) {
      console.log('Delete failed: Insufficient permissions');
      return false;
    }

    // Delete admin user (cascades to sessions via FK)
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', adminId);

    if (error) {
      console.error('Failed to delete admin user:', error);
      return false;
    }

    // Log deletion (will be done automatically by trigger, but also send email summary)
    await logAdminAction('delete_admin_user', 'admin_user', adminId, {
      deletedEmail: targetAdmin.email,
      deletedBy: currentAdmin.email
    });

    console.log(`Admin user ${targetAdmin.email} successfully deleted by ${currentAdmin.email}`);
    return true;

  } catch (error) {
    console.error('Delete admin user error:', error);
    return false;
  }
}

/**
 * Get list of all admin users (with permission check)
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const currentAdmin = await getCurrentAdmin();
    if (!currentAdmin) {
      return [];
    }

    let query = supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    // Remove the filter that limits non-master admins to only see themselves
    // All admins should be able to see the admin list according to permissions
    
    const { data: admins, error } = await query;

    if (error) {
      console.error('Failed to get admin users:', error);
      return [];
    }

    return admins ? admins.map(formatAdminUser) : [];

  } catch (error) {
    console.error('Get admin users error:', error);
    return [];
  }
}

/**
 * Check if admin is currently online
 */
export async function isAdminOnline(adminId: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase.rpc('get_admin_online_status', {
      admin_user_id: adminId
    });

    return !error && data === true;

  } catch (error) {
    console.error('Check admin online status error:', error);
    return false;
  }
}

// ==========================================
// PERMISSION SYSTEM
// ==========================================

/**
 * Get admin permissions based on role
 */
export function getAdminPermissions(admin: AdminUser): AdminPermissions {
  return {
    canAddAdmin: admin.isMaster,
    canDeleteAdmin: (targetAdminId: string, targetEmail: string) => {
      if (admin.isMaster) {
        return true; // Master admin can delete anyone, including themselves
      } else {
        // Regular admin can only delete themselves
        return targetAdminId === admin.id;
      }
    },
    canViewAdminList: true, // All admins can view (but RLS limits what they see)
    canViewUserList: true, // All admins can view user management
    canViewUsageStats: true, // All admins can view usage stats
    canManageUsers: true // All admins can manage regular users
  };
}

/**
 * Check if user is master admin
 */
export async function isMasterAdmin(): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase.rpc('is_master_admin');
    
    return !error && data === true;

  } catch (error) {
    console.error('Check master admin error:', error);
    return false;
  }
}

/**
 * Check if user is any admin
 */
export async function isAdminUser(): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase.rpc('is_admin_user');
    
    return !error && data === true;

  } catch (error) {
    console.error('Check admin user error:', error);
    return false;
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Get current authenticated admin
 */
export async function getCurrentAdmin(): Promise<AdminUser | null> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user?.email) {
      return null;
    }

    const { data: admin, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', user.email)
      .eq('status', 'active')
      .single();

    if (error || !admin) {
      return null;
    }

    return formatAdminUser(admin);

  } catch (error) {
    console.error('Get current admin error:', error);
    return null;
  }
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(
  actionType: string,
  targetType: string,
  targetId?: string,
  actionDetails: Record<string, any> = {}
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    
    await supabase.rpc('log_admin_action', {
      action_type: actionType,
      target_type: targetType,
      target_id: targetId || null,
      action_details: actionDetails
    });

  } catch (error) {
    console.error('Log admin action error:', error);
    // Don't throw - logging should not break main functionality
  }
}

/**
 * Generate secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  return password;
}

/**
 * Format admin user for API response
 */
function formatAdminUser(admin: any): AdminUser {
  return {
    id: admin.id,
    email: admin.email,
    status: admin.status,
    isMaster: admin.is_master,
    createdAt: admin.created_at,
    updatedAt: admin.updated_at,
    lastActive: admin.last_active,
    createdBy: admin.created_by
  };
}

/**
 * Format admin session for API response
 */
function formatAdminSession(session: any): AdminSession {
  return {
    id: session.id,
    adminUserId: session.admin_user_id,
    sessionToken: session.session_token,
    ipAddress: session.ip_address,
    userAgent: session.user_agent,
    createdAt: session.created_at,
    lastSeen: session.last_seen,
    expiresAt: session.expires_at,
    isActive: session.is_active
  };
}

// ==========================================
// MIDDLEWARE FUNCTIONS
// ==========================================

/**
 * Admin authentication middleware for API routes
 */
export async function requireAdminAuth(request: NextRequest): Promise<AdminUser | null> {
  try {
    const sessionToken = request.cookies.get('admin-session')?.value;
    
    if (!sessionToken) {
      return null;
    }

    const authResult = await validateAdminSession(sessionToken);
    
    if (!authResult.success || !authResult.admin) {
      return null;
    }

    return authResult.admin;

  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return null;
  }
}

/**
 * Master admin middleware for API routes
 */
export async function requireMasterAdmin(request: NextRequest): Promise<AdminUser | null> {
  const admin = await requireAdminAuth(request);
  
  if (!admin || !admin.isMaster) {
    return null;
  }

  return admin;
} 