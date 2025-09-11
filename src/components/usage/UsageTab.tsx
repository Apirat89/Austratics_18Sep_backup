'use client';
import { useEffect, useState } from 'react';

type TimeWindow = 7 | 15 | 30 | 60 | 90;

type UsageSummary = {
  windows: number[];
  perService: Record<string, Record<number, number>>;
  totals: Record<number, number>;
  generatedAt: string;
};

type User = {
  id: string;
  email: string;
  lastSignIn?: string;
  createdAt?: string;
};

type UsageTabProps = {
  userId: string;
};

export default function UsageTab({ userId }: UsageTabProps) {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWindow, setSelectedWindow] = useState<TimeWindow>(30);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("Current User");
  const [selectedUser, setSelectedUser] = useState<string>(userId);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>(""); 

  // Load regular users for admin
  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.users) {
            setUsers(data.users);
            
            // Find current user's email
            const currentUser = data.users.find((user: User) => user.id === userId);
            if (currentUser) {
              setCurrentUserEmail(currentUser.email);
            }
            
            // Set the selected user's email
            if (selectedUser === userId) {
              setSelectedUserEmail(currentUser?.email || "Current User");
            } else {
              const selected = data.users.find((user: User) => user.id === selectedUser);
              if (selected) {
                setSelectedUserEmail(selected.email);
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to load users:', error);
      }
    }
    loadUsers();
  }, [userId, selectedUser]);

  // Load usage data
  useEffect(() => {
    async function fetchData() {
      if (!selectedUser) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/usage?user_id=${encodeURIComponent(selectedUser)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.ok) {
          throw new Error(result.error || 'Unknown error');
        }
        
        setData(result.data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load usage data');
        console.error('Usage data fetch error:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [selectedUser]);
  
  function handleUserChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newUserId = e.target.value;
    setSelectedUser(newUserId);
    
    // Update the email
    if (newUserId === userId) {
      setSelectedUserEmail(currentUserEmail);
    } else {
      const selected = users.find(user => user.id === newUserId);
      if (selected) {
        setSelectedUserEmail(selected.email);
      }
    }
  }
  
  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-500">Loading usage data...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Data</h3>
        <p className="text-red-600">{error}</p>
        <p className="text-sm text-red-500 mt-4">
          Make sure the API usage tracking system is properly set up and the database 
          migration has been applied.
        </p>
      </div>
    );
  }
  
  if (!data) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">No Usage Data Available</h3>
        <p className="text-yellow-600">
          There is no API usage data recorded for this user yet. Start using the application
          features to generate usage data.
        </p>
      </div>
    );
  }

  // Extract services and sort by usage (highest first)
  const services = Object.keys(data.perService).sort((a, b) => {
    const usageA = data.perService[a][selectedWindow] || 0;
    const usageB = data.perService[b][selectedWindow] || 0;
    return usageB - usageA;
  });

  return (
    <div className="space-y-6">
      {/* User being viewed */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-medium text-indigo-800">
          {selectedUser === userId ? 'Your Usage' : 'Usage for:'}
        </h2>
        <div className="text-sm text-indigo-600 flex items-center mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="font-medium">{selectedUserEmail}</span>
        </div>
      </div>

      {/* User Selector (for admins) */}
      {users.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select User
          </label>
          <select
            value={selectedUser}
            onChange={handleUserChange}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 bg-white shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
          >
            <option value={userId}>You ({currentUserEmail})</option>
            {users.filter(user => user.id !== userId).map(user => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Time Period Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time Period
        </label>
        <div className="flex space-x-2">
          {[7, 15, 30, 60, 90].map((days) => (
            <button
              key={days}
              onClick={() => setSelectedWindow(days as TimeWindow)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                selectedWindow === days
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* Total Usage Card */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Total API Calls</h3>
          <p className="text-sm text-gray-500">Last {selectedWindow} days</p>
        </div>
        <div className="p-6">
          <div className="text-4xl font-bold text-indigo-600">
            {data.totals[selectedWindow]?.toLocaleString() || 0}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Across {services.length} service{services.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Services Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Usage By Service</h3>
          <p className="text-sm text-gray-500">Last {selectedWindow} days</p>
        </div>
        <div className="p-4">
          {services.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No service usage data available</p>
          ) : (
            <div className="space-y-4">
              {services.map(service => {
                const count = data.perService[service][selectedWindow] || 0;
                const percentage = data.totals[selectedWindow] 
                  ? Math.round((count / data.totals[selectedWindow]) * 100) 
                  : 0;
                
                return (
                  <div key={service} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{service}</span>
                      <span className="text-gray-500">{count.toLocaleString()} calls ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Last Generated */}
      <div className="text-xs text-gray-500 text-right">
        Data last updated: {new Date(data.generatedAt).toLocaleString()}
      </div>
    </div>
  );
} 