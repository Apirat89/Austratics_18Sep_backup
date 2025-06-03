'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BackToMainButton from '../../components/BackToMainButton';

export default function Dashboard() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Redirect to the new main page after a brief moment to show the design
    const timer = setTimeout(() => {
      router.replace('/main');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
        {/* Header with Back to Main Button */}
        <BackToMainButton 
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          pageTitle="Dashboard"
        />

        {/* Example of how sidebar content would look on other pages */}
        {!sidebarCollapsed && (
          <div className="flex-1 px-4 pt-6 overflow-y-auto">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Dashboard Content</h3>
            <div className="space-y-1">
              <div className="p-2 text-sm text-gray-700">
                This page is redirecting to Main...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to Main...</p>
        </div>
      </div>
    </div>
  );
} 