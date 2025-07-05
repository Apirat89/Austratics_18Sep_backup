'use client';

import { useState, useEffect } from 'react';
import { NewsItem, NewsResponse, NewsSource } from '../../types/news';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import BackToMainButton from '../../components/BackToMainButton';
import { NewsCard } from '../../components/news/NewsCard';
import { NewsFilters } from '../../components/news/NewsFilters';
import { NewsPagination } from '../../components/news/NewsPagination';
import { NewsLoadingState } from '../../components/news/NewsLoadingState';
import { NewsErrorState } from '../../components/news/NewsErrorState';

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
    category: string | null;
    limit: number;
    offset: number;
  };
}

export default function NewsPage() {
  const [state, setState] = useState<NewsPageState>({
    news: [],
    loading: true,
    error: null,
    metadata: null,
    filters: {
      source: null,
      category: null,
      limit: 20,
      offset: 0,
    },
  });

  const fetchNews = async (forceRefresh = false) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const params = new URLSearchParams({
        limit: state.filters.limit.toString(),
        offset: state.filters.offset.toString(),
      });
      
      if (state.filters.source) {
        params.append('source', state.filters.source);
      }
      
      if (state.filters.category) {
        params.append('category', state.filters.category);
      }
      
      if (forceRefresh) {
        params.append('refresh', 'true');
      }
      
      const response = await fetch(`/api/news?${params}`);
      
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
    fetchNews(true);
  };

  if (state.loading) {
    return <NewsLoadingState />;
  }

  if (state.error) {
    return (
      <NewsErrorState 
        error={state.error} 
        onRetry={() => fetchNews()} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <BackToMainButton />
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Aged Care News
            </h1>
            <p className="text-lg text-gray-600">
              Latest news from Australian health authorities and aged care industry
            </p>
          </div>
          
          {/* Metadata */}
          {state.metadata && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-sm">
                    {state.metadata.total} articles
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    {state.metadata.sources.length} sources
                  </Badge>
                  {state.metadata.cached && (
                    <Badge variant="secondary" className="text-sm">
                      Cached
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    Last updated: {new Date(state.metadata.lastUpdated).toLocaleString()}
                  </span>
                  <button
                    onClick={handleRefresh}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-8">
          <NewsFilters
            filters={state.filters}
            sources={state.metadata?.sources || []}
            onFilterChange={handleFilterChange}
          />
        </div>

        {/* News Grid */}
        <div className="space-y-6">
          {state.news.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No news articles found matching your criteria.</p>
            </div>
          ) : (
            <>
              {state.news.map((item) => (
                <NewsCard key={item.id} news={item} />
              ))}
            </>
          )}
        </div>

        {/* Pagination */}
        {state.metadata && state.metadata.total > state.filters.limit && (
          <div className="mt-8">
            <NewsPagination
              current={state.filters.offset}
              limit={state.filters.limit}
              total={state.metadata.total}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
} 