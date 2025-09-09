'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from './AuthWrapper';
import { signOut } from '../lib/auth';

interface CornerUsernameProps {
  className?: string;
  showDropdown?: boolean;
}

export default function CornerUsername({ 
  className = '',
  showDropdown = true
}: CornerUsernameProps) {
  const { user, loading } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const result = await signOut();
      
      if (result.success) {
        // Redirect to home page after successful sign out
        router.push('/');
      } else {
        console.error('Sign out error:', result.error);
        alert('Sign out failed. Please try again.');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      alert('Sign out failed. Please try again.');
    } finally {
      setSigningOut(false);
      setDropdownOpen(false);
    }
  };

  // Don't render if loading or no user
  if (loading || !user) {
    return null;
  }

  // Get user initials for avatar
  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Username Display Button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        disabled={signingOut}
      >
        {/* Avatar */}
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-white">
            {getInitials(user.name)}
          </span>
        </div>
        
        {/* Username */}
        <div className="text-left min-w-0 hidden sm:block">
          <p className="text-sm font-medium text-gray-900 truncate max-w-32">
            {user.name}
          </p>
        </div>

        {/* Dropdown Arrow (only show if dropdown enabled) */}
        {showDropdown && (
          <ChevronDown 
            className={`h-4 w-4 text-gray-500 transition-transform ${
              dropdownOpen ? 'rotate-180' : ''
            }`} 
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {showDropdown && dropdownOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />

          {/* Simple Sign-out Popup - Opens Above Button */}
          <div className="absolute left-0 bottom-full mb-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {/* Sign Out Only */}
            <div className="py-1">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="h-4 w-4 text-red-500" />
                {signingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 