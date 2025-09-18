'use client';

import React, { useState, useEffect } from 'react';
import { 
  Map,
  BarChart3,
  Building,
  Home,
  Newspaper,
  HelpCircle,
  ChevronDown,
  LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, signOut } from '../../lib/auth';
import PromptArea from '../../components/PromptArea';
import { trackApiCall } from '@/lib/usageTracking';

interface UserData {
  email: string;
  name: string;
  id: string;
}

export default function MainPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
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
        
        // Track page view
        trackApiCall({
          userId: currentUser.id,
          page: '/',
          service: 'internal',
          action: 'page_view',
          method: 'GET'
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

  const suggestionCards = [
    {
      title: "Maps",
      icon: Map,
      route: "/maps"
    },
    {
      title: "Residential",
      icon: Building,
      route: "/residential"
    },
    {
      title: "Homecare",
      icon: Home,
      route: "/homecare"
    },
    {
      title: "SA2 Insights",
      icon: BarChart3,
      route: "/insights"
    },
    {
      title: "News",
      icon: Newspaper,
      route: "/news"
    },
    {
      title: "FAQ (Chatbot)",
      icon: HelpCircle,
      route: "/faq"
    }
  ];

  const handleCardClick = (card: { title: string; route: string }) => {
    setNavigating(true);
    router.push(card.route);
  };

  const handlePromptSubmit = async (message: string) => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitMessage('');
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          category: 'Main Page Feedback'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        setSubmitMessage(data.message || 'Thank you for your message!');
        // Auto-dismiss success message after 5 seconds
        setTimeout(() => setSubmitStatus('idle'), 5000);
      } else {
        setSubmitStatus('error');
        if (response.status === 401) {
          setSubmitMessage('Please sign in to send feedback.');
        } else if (response.status === 429) {
          setSubmitMessage('Too many requests. Please try again later.');
        } else {
          setSubmitMessage(data.message || 'Failed to send message. Please try again.');
        }
      }
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6">
      <div className="max-w-6xl w-full">
            {/* Greeting */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-normal mb-2">
                <span 
                  className="bg-clip-text text-transparent font-bold"
                  style={{
                    backgroundImage: 'linear-gradient(to right, #E4002B, #012169)'
                  }}
                >
                  G&apos;Day, Mate!
                </span>
              </h1>
            </div>

            {/* Suggestion Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
              {suggestionCards.map((card, index) => (
                <button
                  key={index}
                  className="p-4 text-left bg-white rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleCardClick(card)}
                  disabled={navigating}
                >
                  <div className="flex items-start gap-3">
                    {navigating ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mt-0.5"></div>
                    ) : (
                      <card.icon className="h-5 w-5 text-gray-500 mt-0.5 group-hover:text-blue-600" />
                    )}
                    <span className="text-sm text-gray-700 group-hover:text-blue-800 leading-relaxed">
                      {card.title}
                    </span>
                  </div>
                </button>
              ))}
        </div>

        {/* Status Message */}
        {submitStatus !== 'idle' && (
          <div className={`mb-4 p-4 rounded-lg ${
            submitStatus === 'success' ? 'bg-green-100 border border-green-400 text-green-700' : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {submitMessage}
          </div>
        )}

        {/* Prompt Area */}
        <PromptArea 
          onSubmit={handlePromptSubmit} 
          placeholder={isSubmitting ? "Sending your message..." : "Please submit your feedback, requests for support, or requests for additional features here"}
        />

        {/* System Requirements */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            Best on a desktop/laptop: latest Chrome/Edge/Firefox/Safari, 1080p+, 8 GB+ RAM (16 GB ideal), modern 4-core CPU, 10 Mbps+. Mobile support is limited.
          </p>
        </div>
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