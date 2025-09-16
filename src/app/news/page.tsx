'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NewsItem, NewsSource } from '../../types/news';
import { getCurrentUser } from '../../lib/auth';
import { signOut } from '../../lib/auth';
import { Badge } from '../../components/ui/badge';
import BackToMainButton from '../../components/BackToMainButton';
import { NewsCard } from '../../components/news/NewsCard';
import { NewsFilters } from '../../components/news/NewsFilters';
import { NewsPagination } from '../../components/news/NewsPagination';
import { NewsLoadingState } from '../../components/news/NewsLoadingState';
import { NewsErrorState } from '../../components/news/NewsErrorState';
import { ChevronDown, LogOut } from 'lucide-react';
// ✅ FRIEND'S FIX: Temporarily disabled tracking to eliminate 403 errors
// import { trackedFetch } from '@/lib/usageTracking';

interface UserData {
  email: string;
  name: string;
  id: string;
}

interface NewsPageState {
  news: NewsItem[];
  loading: boolean;
  error: string | null;
  metadata: {
    total: number;
    limit: number;
    offset: number;
    lastUpdated: string;
    sources: NewsSource[];
    cached: boolean;
  } | null;
  filters: {
    source: string | null;
    limit: number;
    offset: number;
  };
}

function NewsPageContent() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [state, setState] = useState<NewsPageState>({
    news: [],
    loading: true,
    error: null,
    metadata: null,
    filters: {
      source: null,
      limit: 20,
      offset: 0,
    },
  });

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

  const fetchNews = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const params = new URLSearchParams({
        limit: state.filters.limit.toString(),
        offset: state.filters.offset.toString(),
      });
      
      if (state.filters.source) {
        params.append('source', state.filters.source);
      }
      
      // ✅ FRIEND'S FIX: Use plain fetch temporarily to avoid 403 tracking errors
      const response = await fetch(`/api/news?${params}`, { 
        cache: 'no-store' 
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch news');
      }
      
      setState(prev => ({
        ...prev,
        news: data.items,
        metadata: data.metadata,
        loading: false,
        error: null,
      }));
      
    } catch (error) {
      console.error('Failed to fetch news:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  };

  // Load user and authenticate
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

  // Initial load
  useEffect(() => {
    fetchNews();
  }, [state.filters]);

  const handleFilterChange = (newFilters: Partial<NewsPageState['filters']>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters, offset: 0 }, // Reset offset when changing filters
    }));
  };

  const handlePageChange = (newOffset: number) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, offset: newOffset },
    }));
  };

  const handleRefresh = () => {
    fetchNews();
  };

  // Authentication loading
  if (isLoading) {
    return <NewsLoadingState />;
  }

  // Authentication check
  if (!user) {
    return null;
  }

  // Loading state
  if (state.loading && state.news.length === 0) {
    return <NewsLoadingState />;
  }

  // Error state (when no cached data available)
  if (state.error && state.news.length === 0) {
    return <NewsErrorState error={state.error} onRetry={handleRefresh} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <BackToMainButton />
            <h1 className="text-3xl font-bold text-gray-900">Aged Care News</h1>
          </div>
          <p className="text-gray-600">
            Stay updated with the latest news and developments in the aged care industry.
          </p>
        </div>

        {/* Metadata */}
        {state.metadata && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-900">Total Articles:</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                  {state.metadata.total.toLocaleString()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-900">Sources:</span>
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                  {state.metadata.sources.length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-blue-900">Last Updated:</span>
                <span className="text-blue-800">
                  {new Date(state.metadata.lastUpdated).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              {state.metadata.cached && (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  Cached
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Error Banner (when there's cached data) */}
        {state.error && state.news.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-yellow-600 mt-0.5">⚠️</div>
              <div className="flex-1">
                <p className="text-sm text-yellow-800 font-medium">
                  Unable to fetch latest news
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  {state.error}. Showing cached results.
                </p>
                <button
                  onClick={handleRefresh}
                  className="text-sm text-yellow-800 underline hover:no-underline mt-2"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

                 {/* Filters */}
         <NewsFilters
           filters={state.filters}
           sources={state.metadata?.sources || []}
           onFilterChange={handleFilterChange}
         />

                 {/* News Grid */}
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
           {state.news.map((item, index) => (
             <NewsCard key={`${item.url}-${index}`} news={item} />
           ))}
         </div>

        {/* Empty State */}
        {state.news.length === 0 && !state.loading && !state.error && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No news articles found</h3>
            <p className="text-gray-600">
              Try adjusting your filters or check back later.
            </p>
          </div>
        )}

                 {/* Pagination */}
         {state.metadata && state.metadata.total > state.filters.limit && (
           <NewsPagination
             current={state.filters.offset}
             limit={state.filters.limit}
             total={state.metadata.total}
             onPageChange={handlePageChange}
           />
         )}
      </div>
      
      {/* Username Display - Bottom Left */}
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
    </div>
  );
}

// Main News Page Component with Authentication
export default function NewsPage() {
  return <NewsPageContent />;
} 