import React from 'react';

interface FacilityLoadingSpinnerProps {
  visible: boolean;
  message?: string;
}

export default function FacilityLoadingSpinner({ 
  visible, 
  message = "Loading facilities..." 
}: FacilityLoadingSpinnerProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
      {/* Map area backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-30 pointer-events-auto" />
      
      {/* Spinner container */}
      <div className="relative bg-white rounded-lg shadow-lg p-6 flex flex-col items-center space-y-4 pointer-events-auto">
        {/* Minimal spinner */}
        <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        
        {/* Loading message */}
        <p className="text-gray-700 text-sm font-medium">{message}</p>
      </div>
    </div>
  );
} 