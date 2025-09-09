'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Users, TrendingUp, Clock, Filter } from 'lucide-react';

interface TopBottomData {
  user_id: string;
  email: string;
  feature: string;
  feature_label: string;
  events_count: number;
  rank_type: 'most_used' | 'least_used';
}

interface RankingData {
  user_id: string;
  email: string;
  feature: string;
  feature_label: string;
  events_count: number;
  user_rank: number;
}

interface NeverUsedData {
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_activity: string;
}

interface FeatureUsageStats {
  feature: string;
  feature_label: string;
  category: string;
  total_events: number;
  unique_users: number;
  avg_events_per_user: number;
  events_rank: number;
}

interface UserActivitySummary {
  user_id: string;
  email: string;
  full_name: string;
  total_events: number;
  features_used: number;
  first_activity: string;
  last_activity: string;
  activity_days: number;
}

export default function UsageAnalytics() {
  const [loading, setLoading] = useState(false);
  const [window, setWindow] = useState('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'top-bottom' | 'rankings' | 'never-used'>('overview');
  
  const [overviewData, setOverviewData] = useState<FeatureUsageStats[]>([]);
  const [userActivityData, setUserActivityData] = useState<UserActivitySummary[]>([]);
  const [topBottomData, setTopBottomData] = useState<TopBottomData[]>([]);
  const [rankingsData, setRankingsData] = useState<RankingData[]>([]);
  const [neverUsedData, setNeverUsedData] = useState<NeverUsedData[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<string>('map');

  const fetchOverviewData = async () => {
    try {
      const [statsResponse, activityResponse] = await Promise.all([
        fetch(`/api/admin/usage/feature-stats?window=${window}`),
        fetch(`/api/admin/usage/user-activity?window=${window}`)
      ]);

      if (statsResponse.ok) {
        const statsResult = await statsResponse.json();
        setOverviewData(statsResult.data || []);
      }

      if (activityResponse.ok) {
        const activityResult = await activityResponse.json();
        setUserActivityData(activityResult.data || []);
      }
    } catch (error) {
      console.error('Error fetching overview data:', error);
    }
  };

  const fetchTopBottomData = async () => {
    try {
      const response = await fetch(`/api/admin/usage/top-bottom?window=${window}`);
      if (response.ok) {
        const result = await response.json();
        setTopBottomData(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching top-bottom data:', error);
    }
  };

  const fetchRankingsData = async () => {
    try {
      const response = await fetch(`/api/admin/usage/rankings?window=${window}`);
      if (response.ok) {
        const result = await response.json();
        setRankingsData(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching rankings data:', error);
    }
  };

  const fetchNeverUsedData = async () => {
    try {
      const response = await fetch(`/api/admin/usage/never-used?feature=${selectedFeature}&window=${window}`);
      if (response.ok) {
        const result = await response.json();
        setNeverUsedData(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching never-used data:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'overview':
          await fetchOverviewData();
          break;
        case 'top-bottom':
          await fetchTopBottomData();
          break;
        case 'rankings':
          await fetchRankingsData();
          break;
        case 'never-used':
          await fetchNeverUsedData();
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, window, selectedFeature]);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'top-bottom', name: 'Top/Bottom Features', icon: TrendingUp },
    { id: 'rankings', name: 'User Rankings', icon: Users },
    { id: 'never-used', name: 'Never Used', icon: Clock }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feature Usage Analytics</h1>
          <p className="text-gray-600">
            Track user engagement and feature adoption patterns
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={window}
              onChange={(e) => setWindow(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          
          {activeTab === 'never-used' && (
            <select
              value={selectedFeature}
              onChange={(e) => setSelectedFeature(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="map">Map & Layers</option>
              <option value="faq_chat">FAQ Chat</option>
              <option value="sa2">SA2 Explorer</option>
              <option value="homecare">Home Care Search</option>
              <option value="residential">Residential Care</option>
              <option value="regulation">Regulation Chat</option>
              <option value="news">News & Updates</option>
              <option value="insights">Data Insights</option>
            </select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center py-2 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading analytics data...</p>
          </div>
        ) : (
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Feature Statistics */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Usage Statistics</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Feature
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Events
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Unique Users
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg Events/User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rank
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {overviewData.map((feature) => (
                          <tr key={feature.feature}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {feature.feature_label}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {feature.category}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {feature.total_events.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {feature.unique_users}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {feature.avg_events_per_user}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                #{feature.events_rank}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* User Activity Summary */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Most Active Users</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Events
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Features Used
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Active Days
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Activity
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {userActivityData.slice(0, 10).map((user) => (
                          <tr key={user.user_id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {user.email}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.full_name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.total_events.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.features_used}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.activity_days}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.last_activity).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'top-bottom' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Most and Least Used Features per User
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Feature
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Events
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topBottomData.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.feature_label}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.events_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.rank_type === 'most_used' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {item.rank_type === 'most_used' ? 'Most Used' : 'Least Used'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'rankings' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Feature Rankings by User
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Feature
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Events
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User Rank
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rankingsData.slice(0, 50).map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.feature_label}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.events_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              #{item.user_rank}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'never-used' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Users Who Never Used: {selectedFeature.charAt(0).toUpperCase() + selectedFeature.slice(1).replace('_', ' ')}
                </h3>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Found {neverUsedData.length} users who have never used this feature in the selected time period.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Account Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Activity
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {neverUsedData.map((user) => (
                        <tr key={user.user_id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {user.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.full_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.last_activity ? new Date(user.last_activity).toLocaleDateString() : 'Never'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 