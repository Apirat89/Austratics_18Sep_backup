'use client';

import React, { Suspense } from 'react';
import ConfirmPageContent from './confirm-content';

// Simple loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-6"></div>
        <h1 className="text-xl font-semibold text-gray-900">Loading authentication page...</h1>
      </div>
    </div>
  );
}

// Export a simple component that only renders the suspense boundary
export default function ConfirmPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ConfirmPageContent />
    </Suspense>
  );
} 