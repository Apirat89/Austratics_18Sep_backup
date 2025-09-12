'use client';
import { useState, useEffect } from 'react';
import { UserServiceUsage } from '@/lib/usageServer';

type TimePeriod = 7 | 15 | 30 | 60 | 90;

interface UsageTableProps {
  adminId: string;
}

export default function UsageTable({ adminId }: UsageTableProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserServiceUsage[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>(30);
  const [sortColumn, setSortColumn] = useState<keyof UserServiceUsage>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [generatedAt, setGeneratedAt] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        console.log(`Fetching usage data with period: ${selectedPeriod} days`);
        const response = await fetch(`/api/usage?summary=all_users&days=${selectedPeriod}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to fetch data: ${response.status}`, errorText);
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        
        const result = await response.json();
        console.log(`Received usage data: ${result.users?.length || 0} users`);
        
        if (!result.success) {
          throw new Error(result.error || 'Unknown error');
        }
        
        setData(result.users || []);
        setGeneratedAt(result.generatedAt || new Date().toISOString());
      } catch (error) {
        console.error('Error fetching usage data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load usage data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedPeriod]);

  // Sort data by column
  const sortedData = [...data].sort((a, b) => {
    const valA = a[sortColumn];
    const valB = b[sortColumn];
    
    if (sortColumn === 'email') {
      // Sort strings alphabetically
      return sortDirection === 'asc' 
        ? String(valA).localeCompare(String(valB)) 
        : String(valB).localeCompare(String(valA));
    } else {
      // Sort numbers numerically
      return sortDirection === 'asc' 
        ? (valA as number) - (valB as number) 
        : (valB as number) - (valA as number);
    }
  });

  // Handle column header click for sorting
  const handleSort = (column: keyof UserServiceUsage) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to descending
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Render sort indicator
  const renderSortIndicator = (column: keyof UserServiceUsage) => {
    if (sortColumn !== column) return null;
    
    return sortDirection === 'asc' 
      ? <span className="ml-1">▲</span>
      : <span className="ml-1">▼</span>;
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-500">Loading usage data for all users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Data</h3>
        <p className="text-red-600">{error}</p>
        <p className="text-sm text-red-500 mt-4">
          Make sure the API usage tracking system is properly set up and you have admin permissions.
        </p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">No Users Available</h3>
        <p className="text-yellow-600">
          There are no users registered in the system. 
          Please add users to start tracking API usage.
        </p>
      </div>
    );
  }

  // Check if we have users but all have zero usage
  const hasUsageData = data.some(user => user.total > 0);
  
  return (
    <div className="space-y-4">
      {/* Time Period Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time Period
        </label>
        <div className="flex space-x-2">
          {[7, 15, 30, 60, 90].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedPeriod(days as TimePeriod)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedPeriod === days
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {!hasUsageData && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
          <p className="text-blue-600">
            <span className="font-medium">Note:</span> All users have zero API usage in the selected time period. 
            Their accounts exist but haven't generated any usage data yet.
          </p>
        </div>
      )}

      {/* User API Usage Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">API Usage by User</h3>
          <p className="text-sm text-gray-500">Last {selectedPeriod} days</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center">
                    User {renderSortIndicator('email')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('supabase')}
                >
                  <div className="flex items-center">
                    Supabase {renderSortIndicator('supabase')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('maptiler')}
                >
                  <div className="flex items-center">
                    MapTiler {renderSortIndicator('maptiler')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('gemini')}
                >
                  <div className="flex items-center">
                    Gemini {renderSortIndicator('gemini')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('news')}
                >
                  <div className="flex items-center">
                    News {renderSortIndicator('news')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('other')}
                >
                  <div className="flex items-center">
                    Other {renderSortIndicator('other')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center">
                    Total {renderSortIndicator('total')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((user) => (
                <tr 
                  key={user.user_id} 
                  className={`${user.user_id === adminId ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">
                        {user.email}
                        {user.user_id === adminId && <span className="ml-2 text-xs text-indigo-600">(You)</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.supabase.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.maptiler.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.gemini.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.news.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.other.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-indigo-600">
                      {user.total.toLocaleString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-right">
        Data last updated: {new Date(generatedAt).toLocaleString()}
      </div>
    </div>
  );
} 