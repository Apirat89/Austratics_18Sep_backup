import React from 'react';

interface FacilityLoadingSpinnerProps {
  visible: boolean;
  message?: string;
}

export default function FacilityLoadingSpinner({ 
  visible, 
  message = "Loading facilities..." 
}: FacilityLoadingSpinnerProps) {
  console.log('🔄 SPINNER DEBUG: FacilityLoadingSpinner render, visible:', visible);
  if (!visible) return null;

  console.log('🎯 SPINNER DEBUG: Spinner should be visible now!');

  return (
    <div className="flex items-center gap-2 py-1">
      {/* Compact spinner */}
      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0" />
      
      {/* Loading message */}
      <span className="text-gray-600 text-xs font-medium">{message}</span>
    </div>
  );
} 