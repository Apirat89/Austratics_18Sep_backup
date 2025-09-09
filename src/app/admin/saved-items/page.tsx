'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Bookmark, User, Search, Filter, Calendar, Star, Trash2, BarChart3, TrendingUp, Tag } from 'lucide-react';

interface SavedItem {
  id: string;
  user_id: string;
  item_type: string;
  item_id: string;
  label: string;
  created_at: string;
  updated_at: string;
  metadata?: any;
  tags?: string[];
  is_active: boolean;
  user_email?: string;
}

interface SavedItemsStats {
  total_items: number;
  unique_users: number;
  avg_items_per_user: number;
  items_by_type: { item_type: string; count: number }[];
  most_saved_items: { label: string; count: number; item_type: string }[];
  items_by_day: { date: string; count: number }[];
  top_tags: { tag: string; count: number }[];
}

export default function SavedItemsPage() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [stats, setStats] = useState<SavedItemsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('30d');

  const itemTypes = ['all', 'facility', 'search', 'location', 'report'];
  const statusOptions = ['all', 'active', 'inactive'];
  const dateFilters = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  useEffect(() => {
    fetchSavedItems();
    fetchStats();
  }, [typeFilter, statusFilter, dateFilter]);

  const fetchSavedItems = async () => {
    try {
      setLoading(true);
      let url = `/api/admin/saved-items?window=${dateFilter}`;
      
      if (typeFilter !== 'all') {
        url += `&type=${typeFilter}`;
      }
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSavedItems(data.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch saved items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await fetch(`/api/admin/saved-items/stats?window=${dateFilter}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch saved items stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleDeactivateItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/admin/saved-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false })
      });

      if (response.ok) {
        setSavedItems(items => 
          items.map(item => 
            item.id === itemId ? { ...item, is_active: false } : item
          )
        );
      }
    } catch (error) {
      console.error('Failed to deactivate item:', error);
    }
  };

  const filteredItems = savedItems.filter(item => {
    if (searchTerm) {
      return item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
             item.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             item.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
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

  const getTypeBadgeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      facility: 'bg-blue-100 text-blue-800',
      search: 'bg-green-100 text-green-800',
      location: 'bg-purple-100 text-purple-800',
      report: 'bg-orange-100 text-orange-800',
      default: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.default;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'facility': return '🏥';
      case 'search': return '🔍';
      case 'location': return '📍';
      case 'report': return '📊';
      default: return '📌';
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Saved Items</h1>
          <p className="text-gray-600 mt-2">Manage user bookmarks and saved content</p>
        </div>
        <div className="flex items-center space-x-2">
          <Bookmark className="h-5 w-5 text-indigo-600" />
          <span className="text-sm font-medium text-gray-700">
            {savedItems.length} items in selected period
          </span>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Saved</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total_items.toLocaleString()}</p>
                </div>
                <Bookmark className="h-8 w-8 text-indigo-500" />
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
                  <p className="text-sm font-medium text-gray-600">Avg per User</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.avg_items_per_user.toFixed(1)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top Type</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.items_by_type[0]?.item_type || 'N/A'}
                  </p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
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
                  placeholder="Search items, users, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {itemTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
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
        {/* Saved Items List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5" />
                Saved Items ({filteredItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Bookmark className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No saved items found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{getTypeIcon(item.item_type)}</span>
                              <Badge className={`text-xs ${getTypeBadgeColor(item.item_type)}`}>
                                {item.item_type}
                              </Badge>
                              <Badge variant={item.is_active ? 'default' : 'secondary'} className="text-xs">
                                {item.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            
                            <h3 className="font-medium text-gray-900 mb-1 truncate">
                              {item.label}
                            </h3>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {item.user_email || `User ${item.user_id.slice(0, 8)}`}
                            </p>

                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {item.tags.map((tag, index) => (
                                  <span key={index} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    <Tag className="h-3 w-3" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Saved {formatDate(item.created_at)}
                              </span>
                              {item.updated_at !== item.created_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Updated {formatDate(item.updated_at)}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 ml-4">
                            {item.is_active && (
                              <button
                                onClick={() => handleDeactivateItem(item.id)}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                title="Deactivate item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
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

        {/* Statistics and Insights */}
        <div className="space-y-6">
          {stats && (
            <>
              {/* Item Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Items by Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.items_by_type.map((type) => (
                      <div key={type.item_type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getTypeIcon(type.item_type)}</span>
                          <Badge className={`text-xs ${getTypeBadgeColor(type.item_type)}`}>
                            {type.item_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded">
                            <div 
                              className="h-full bg-indigo-500 rounded"
                              style={{
                                width: `${(type.count / stats.total_items) * 100}%`
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{type.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Most Saved Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Most Saved Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.most_saved_items.slice(0, 8).map((item, index) => (
                      <div key={`${item.label}-${index}`} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                          <span className="text-lg">{getTypeIcon(item.item_type)}</span>
                          <span className="text-sm text-gray-900 truncate">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-indigo-600 ml-2">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Tags */}
              {stats.top_tags && stats.top_tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Popular Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {stats.top_tags.slice(0, 10).map((tag) => (
                        <span key={tag.tag} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          <Tag className="h-3 w-3" />
                          {tag.tag} ({tag.count})
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 