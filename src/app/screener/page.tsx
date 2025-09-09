'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signOut } from '../../lib/auth';
import BackToMainButton from '../../components/BackToMainButton';
import PromptArea from '../../components/PromptArea';
import { ClipboardCheck, Search, Settings, User, CheckCircle, ChevronDown, LogOut } from 'lucide-react';

interface UserData {
  email: string;
  name: string;
  id: string;
}

export default function ScreenerPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      const result = await signOut();
      
      if (result.success) {
        router.push('/auth/signin');
      } else {
        console.error('Sign out failed:', result.error);
        setSigningOut(false);
      }
    } catch (error) {
      console.error('Sign out error:', error);
      setSigningOut(false);
    }
  };

  // Get user initials for avatar
  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          router.push('/auth/signin');
          return;
        }

        setUser({
          email: currentUser.email || '',
          name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
          id: currentUser.id
        });
      } catch (error) {
        console.error('Error loading user:', error);
        router.push('/auth/signin');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [router]);

  const handlePromptSubmit = (message: string) => {
    console.log('Screener prompt submitted:', message);
    // Handle screener-related queries here
    // You could integrate with an AI service to interpret screening queries
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
        {/* Header with Back to Main Button */}
        <BackToMainButton 
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          pageTitle="Screener"
        />

        {/* Sidebar Content */}
        {!sidebarCollapsed && (
          <div className="flex-1 px-4 pt-6 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Screening Tools</h3>
            <div className="space-y-1">
              <div className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <span className="text-sm text-gray-700">Quality Assessments</span>
              </div>
              <div className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <span className="text-sm text-gray-700">Compliance Checks</span>
              </div>
              <div className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <span className="text-sm text-gray-700">Performance Metrics</span>
              </div>
              <div className="p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                <span className="text-sm text-gray-700">Risk Analysis</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className={`p-4 border-t border-gray-100 ${sidebarCollapsed ? 'space-y-2' : 'space-y-1'}`}>
          {sidebarCollapsed ? (
            <>
              <button className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <User className="h-5 w-5 text-gray-600 mx-auto" />
              </button>
              <button className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="h-5 w-5 text-gray-600 mx-auto" />
              </button>
            </>
          ) : (
            <>
              <button className="w-full flex items-center gap-3 p-2 text-left hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">Settings & help</span>
              </button>
              <div className="flex items-center gap-3 p-2">
                <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">A</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name || 'User'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-6 w-6 text-green-600" />
            <h1 className="text-xl font-semibold text-gray-900">Facility Screener</h1>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Coming Soon Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardCheck className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Comprehensive Screening Coming Soon</h2>
                <p className="text-gray-600 mb-6">
                  Evaluate aged care facilities with our advanced screening tools and compliance assessments.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <h3 className="font-medium text-gray-900">Quality Standards</h3>
                    </div>
                    <p className="text-sm text-gray-600">Assess facilities against quality indicators</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <h3 className="font-medium text-gray-900">Compliance Review</h3>
                    </div>
                    <p className="text-sm text-gray-600">Monitor regulatory compliance status</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <h3 className="font-medium text-gray-900">Performance Tracking</h3>
                    </div>
                    <p className="text-sm text-gray-600">Track key performance metrics over time</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <h3 className="font-medium text-gray-900">Risk Assessment</h3>
                    </div>
                    <p className="text-sm text-gray-600">Identify potential risks and issues</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Prompt Area */}
        <PromptArea 
          onSubmit={handlePromptSubmit}
          placeholder="Ask me about screening criteria, assessments, or compliance..."
        />
      </div>
      
      {/* Username Display - Bottom Left */}
      {user && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-3 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={signingOut}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {getInitials(user?.name || '')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || 'User'}
                </p>
              </div>
              <ChevronDown 
                className={`h-4 w-4 text-gray-500 transition-transform ${
                  userDropdownOpen ? 'rotate-180' : ''
                }`} 
              />
            </button>

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setUserDropdownOpen(false)}
                />
                {/* Sign-out Popup - Opens Above Button */}
                <div className="absolute left-0 bottom-full mb-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
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
        </div>
      )}
    </div>
  );
} 