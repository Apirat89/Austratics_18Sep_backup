'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import BackToMainButton from '../../components/BackToMainButton';
import SimpleHeatmapMap from '../../components/SimpleHeatmapMap';
import HeatmapDataSelector from '../../components/HeatmapDataSelector';
import { User } from 'lucide-react';

interface UserData {
  email: string;
  name: string;
  id: string;
}

export interface SA2HeatmapData {
  [sa2Id: string]: number;
}

export default function Maps2Page() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // SA2 heatmap data state
  const [sa2HeatmapData, setSA2HeatmapData] = useState<SA2HeatmapData | null>(null);
  const [sa2HeatmapVisible, setSA2HeatmapVisible] = useState(false);
  const [selectedDataOption, setSelectedDataOption] = useState<string>('');
  
  const router = useRouter();

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

  // Handle SA2 data changes from the data selector
  const handleSA2DataChange = useCallback((data: SA2HeatmapData | null, visible: boolean, selectedOption: string) => {
    console.log('🗺️ Maps2Page: SA2 data changed:', {
      dataPoints: data ? Object.keys(data).length : 0,
      visible,
      selectedOption,
              hasTargetSA2: data ? ('801011001' in data) : false,
        targetValue: data ? data['801011001'] : undefined,
      sampleData: data ? Object.entries(data).slice(0, 3) : []
    });
    
    setSA2HeatmapData(data);
    setSA2HeatmapVisible(visible);
    setSelectedDataOption(selectedOption);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <BackToMainButton />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">SA2 Heatmap Visualization</h1>
              <p className="text-sm text-gray-600">Aged Care Analytics - Simplified Map View</p>
            </div>
          </div>
          
          {user && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-700">{user.name}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
          sidebarCollapsed ? 'w-0' : 'w-80'
        } flex-shrink-0 overflow-hidden`}>
          <div className="h-full overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Data Selector */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-900">Data Layer</h3>
                <HeatmapDataSelector onDataChange={handleSA2DataChange} />
              </div>

              {/* Current Selection Display */}
              {selectedDataOption && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Current Selection</h4>
                  <p className="text-sm text-blue-700">{selectedDataOption}</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 rounded-full bg-blue-600 opacity-20"></div>
                      <span className="text-xs text-blue-600">Heatmap Active</span>
                    </div>
                    {sa2HeatmapData && (
                      <span className="text-xs text-blue-600">
                        ({Object.keys(sa2HeatmapData).length} regions)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-900 mb-2">How to Use</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Select a data category and type from the dropdown</li>
                  <li>• View the heatmap overlay on SA2 regions</li>
                  <li>• Click SA2 boundaries to see region details</li>
                  <li>• Use the eye icon to toggle heatmap visibility</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="bg-white border-r border-gray-200 w-4 flex items-center justify-center hover:bg-gray-50 transition-colors"
          title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        >
          <div className={`w-2 h-8 bg-gray-300 rounded-full transition-transform ${
            sidebarCollapsed ? 'rotate-180' : ''
          }`}></div>
        </button>

        {/* Map Container */}
        <div className="flex-1 relative">
          <SimpleHeatmapMap
            sa2HeatmapData={sa2HeatmapData}
            sa2HeatmapVisible={sa2HeatmapVisible}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
} 