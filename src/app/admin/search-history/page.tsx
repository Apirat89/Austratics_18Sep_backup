'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Search, Clock, User, Filter, Calendar, BarChart3, TrendingUp, Globe, Database } from 'lucide-react';

interface SearchHistory {
  id: string;
  user_id: string;
  ts: string;
  query: string;
  surface: string;
  results_count: number;
  metadata?: any;
  session_id?: string;
  user_email?: string;
}

interface SearchStats {
  total_searches: number;
  unique_users: number;
  avg_results_per_search: number;
  most_searched_terms: { query: string; count: number }[];
  searches_by_surface: { surface: string; count: number }[];
  searches_by_day: { date: string; count: number }[];
}

export default function SearchHistoryPage() {
  const [searches, setSearches] = useState<SearchHistory[]>([]);
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [surfaceFilter, setSurfaceFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('7d');

  const surfaces = ['all', 'map', 'homecare', 'residential', 'insights', 'regulation'];
  const dateFilters = [
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' }
  ];

  useEffect(() => {
    fetchSearches();
    fetchStats();
  }, [surfaceFilter, dateFilter]);

  const fetchSearches = async () => {
    try {
      setLoading(true);
      let url = `/api/admin/search-history?window=${dateFilter}`;
      
      if (surfaceFilter !== 'all') {
        url += `&surface=${surfaceFilter}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSearches(data.searches || []);
      }
    } catch (error) {
      console.error('Failed to fetch search history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch(`/api/admin/search-history/stats?window=${dateFilter}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch search stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const filteredSearches = searches.filter(search => {
    if (searchTerm) {
      return search.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
             search.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSurfaceBadgeColor = (surface: string) => {
    const colors: { [key: string]: string } = {
      map: 'bg-green-100 text-green-800',
      homecare: 'bg-orange-100 text-orange-800',
      residential: 'bg-pink-100 text-pink-800',
      insights: 'bg-indigo-100 text-indigo-800',
      regulation: 'bg-purple-100 text-purple-800',
      default: 'bg-gray-100 text-gray-800'
    };
    return colors[surface] || colors.default;
  };

  const getResultsColor = (count: number) => {
    if (count === 0) return 'text-red-600';
    if (count < 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading && statsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Search History</h1>
          <p className="text-gray-600 mt-2">Monitor user search patterns and query performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Search className="h-5 w-5 text-indigo-600" />
          <span className="text-sm font-medium text-gray-700">
            {searches.length} searches in selected period
          </span>
        </div>
      </div>

      {/* Search Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Searches</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_searches.toLocaleString()}</p>
                </div>
                <Search className="h-8 w-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.unique_users.toLocaleString()}</p>
                </div>
                <User className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Results</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.avg_results_per_search.toFixed(1)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top Surface</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.searches_by_surface[0]?.surface || 'N/A'}
                  </p>
                </div>
                <Globe className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search queries or users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Surface Filter */}
            <select
              value={surfaceFilter}
              onChange={(e) => setSurfaceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {surfaces.map(surface => (
                <option key={surface} value={surface}>
                  {surface === 'all' ? 'All Surfaces' : surface.charAt(0).toUpperCase() + surface.slice(1)}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {dateFilters.map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search History List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Recent Searches ({filteredSearches.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {filteredSearches.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No searches found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredSearches.map((search) => (
                      <div key={search.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`text-xs ${getSurfaceBadgeColor(search.surface)}`}>
                                {search.surface}
                              </Badge>
                              <span className={`text-sm font-medium ${getResultsColor(search.results_count)}`}>
                                {search.results_count} results
                              </span>
                            </div>
                            
                            <p className="font-medium text-gray-900 mb-1">
                              "{search.query}"
                            </p>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {search.user_email || `User ${search.user_id.slice(0, 8)}`}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(search.ts)}
                              </span>
                              {search.session_id && (
                                <span className="flex items-center gap-1">
                                  <Database className="h-3 w-3" />
                                  Session {search.session_id.slice(0, 8)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Searches and Surface Distribution */}
        <div className="space-y-6">
          {stats && (
            <>
              {/* Top Search Terms */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Top Search Terms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.most_searched_terms.slice(0, 10).map((term, index) => (
                      <div key={term.query} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                          <span className="text-sm text-gray-900 truncate max-w-32">
                            "{term.query}"
                          </span>
                        </div>
                        <span className="text-sm font-medium text-indigo-600">{term.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Surface Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Search by Surface
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.searches_by_surface.map((surface) => (
                      <div key={surface.surface} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${getSurfaceBadgeColor(surface.surface)}`}>
                            {surface.surface}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded">
                            <div 
                              className="h-full bg-indigo-500 rounded"
                              style={{
                                width: `${(surface.count / stats.total_searches) * 100}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{surface.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 