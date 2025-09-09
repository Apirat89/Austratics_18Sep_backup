'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../lib/auth';

// User data interface
interface UserData {
  email: string;
  name: string;
  id: string;
}

// Auth context interface
interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  error: string | null;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthWrapper');
  }
  return context;
};

// AuthWrapper component props
interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  allowedRoles?: string[];
}

// Main AuthWrapper component
export default function AuthWrapper({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth/signin',
  allowedRoles
}: AuthWrapperProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const currentUser = await getCurrentUser();
        
        // Handle unauthenticated user
        if (!currentUser && requireAuth) {
          router.push(redirectTo);
          return;
        }

        // Set user data if authenticated
        if (currentUser) {
          setUser({
            email: currentUser.email || '',
            name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
            id: currentUser.id
          });
        }
      } catch (error) {
        console.error('AuthWrapper: Error loading user:', error);
        setError('Authentication failed');
        
        if (requireAuth) {
          router.push(redirectTo);
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router, requireAuth, redirectTo]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state (only show if auth not required)
  if (error && !requireAuth) {
    console.warn('AuthWrapper: Authentication error but continuing:', error);
  }

  // Don't render if auth required but no user
  if (requireAuth && !user) {
    return null;
  }

  // Provide auth context to children
  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
} 