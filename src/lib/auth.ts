import { createBrowserSupabaseClient } from './supabase';

export interface AuthCredentials {
  email: string;
  password: string;
  name?: string;
  companyId?: string; // Optional company assignment
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: any;
  profile?: any;
  requiresVerification?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'staff' | 'owner';
  status: 'active' | 'suspended' | 'deleted';
  companyId?: string;
  companyName?: string;
  lastLoginAt?: string;
  lastSeenIp?: string;
}

// Sign up with email and password
export async function signUp({ email, password, name, companyId }: AuthCredentials): Promise<AuthResponse> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // If user was created, create/update their profile with company info
    // This happens even if email is not yet verified
    if (data.user) {
      let assignedCompanyId = companyId;
      
      // If no company specified, assign to default company
      if (!assignedCompanyId) {
        assignedCompanyId = '00000000-0000-0000-0000-000000000001'; // Default Organization
      }

      // Create or update profile with company assignment
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email,
          company_id: assignedCompanyId,
          role: 'user',
          status: 'active'
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select(`
          *,
          companies:company_id (
            id,
            name
          )
        `)
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // Don't fail signup for profile errors, but log them
      }

      return { 
        success: true, 
        user: data.user,
        profile: profileData,
        requiresVerification: !data.session
      };
    }

    return { 
      success: true, 
      user: data.user,
      requiresVerification: !data.session
    };
  } catch (error) {
    console.error('SignUp error:', error);
    return { success: false, error: 'An unexpected error occurred during sign up' };
  }
}

// Sign in with email and password
export async function signIn({ email, password }: AuthCredentials): Promise<AuthResponse> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Update last login timestamp
    if (data.user) {
      await updateLastLogin(data.user.id);
    }

    return { success: true, user: data.user };
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred during sign in' };
  }
}

// Sign out
export async function signOut(): Promise<AuthResponse> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'An unexpected error occurred during sign out' };
  }
}

// Get current user
export async function getCurrentUser() {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
}

// Get current user profile with company info
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        status,
        company_id,
        last_login_at,
        last_seen_ip,
        companies:company_id (
          id,
          name
        )
      `)
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      companyId: profile.company_id,
      companyName: profile.companies?.[0]?.name,
      lastLoginAt: profile.last_login_at,
      lastSeenIp: profile.last_seen_ip
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// Update last login timestamp
export async function updateLastLogin(userId: string, ipAddress?: string): Promise<void> {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const updateData: any = {
      last_login_at: new Date().toISOString()
    };

    if (ipAddress) {
      updateData.last_seen_ip = ipAddress;
    }

    await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);
  } catch (error) {
    console.error('Error updating last login:', error);
    // Don't throw error - this is non-critical
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}

// Check if user has admin role
export async function isAdmin(): Promise<boolean> {
  try {
    const profile = await getCurrentUserProfile();
    return profile?.role === 'owner' || profile?.role === 'staff';
  } catch (error) {
    return false;
  }
}

// Get available companies (for signup/admin)
export async function getAvailableCompanies() {
  try {
    const supabase = createBrowserSupabaseClient();
    
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error fetching companies:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching companies:', error);
    return [];
  }
} 