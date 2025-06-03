'use client';

import React from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BackToMainButtonProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  pageTitle?: string;
}

export default function BackToMainButton({ 
  sidebarCollapsed = false, 
  onToggleSidebar,
  pageTitle = "Page"
}: BackToMainButtonProps) {
  const router = useRouter();

  const handleBackToMain = () => {
    router.push('/main');
  };

  return (
    <div className="p-4 border-b border-gray-100">
      <div className="flex items-center justify-between">
        {onToggleSidebar ? (
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
        ) : (
          <div className="w-9 h-9" /> // Spacer to maintain layout
        )}
        
        {!sidebarCollapsed && (
          <button
            onClick={handleBackToMain}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium">Back to Main Menu</span>
          </button>
        )}
        
        {sidebarCollapsed && onToggleSidebar && (
          <button
            onClick={handleBackToMain}
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            title="Back to Main Menu"
          >
            <ArrowLeft className="h-5 w-5 text-blue-600" />
          </button>
        )}
      </div>
    </div>
  );
} 