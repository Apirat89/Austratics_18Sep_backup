import { createBrowserSupabaseClient } from './supabase';

export interface AuthCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: any;
}

// Sign up with email and password
export async function signUp({ email, password, name }: AuthCredentials): Promise<AuthResponse> {
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

    return { success: true, user: data.user };
  } catch (error) {
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

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
} 