import React from 'react';
import { Card } from '../ui/card';
import BackToMainButton from '../BackToMainButton';

export function NewsLoadingState() {
  const SkeletonCard = () => (
    <Card className="p-6">
      <div className="animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
            <div className="flex gap-4 mb-3">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
          <div className="w-24 h-24 bg-gray-200 rounded-lg ml-4"></div>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            <div className="h-6 bg-gray-200 rounded-full w-16"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <BackToMainButton />
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Aged Care News
            </h1>
            <p className="text-lg text-gray-600">
              Latest news from Australian health authorities and aged care industry
            </p>
          </div>
          
          {/* Loading metadata */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  <div className="h-6 bg-gray-200 rounded-full w-12"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading filters */}
        <div className="mb-8">
          <Card className="p-4">
            <div className="animate-pulse">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-5 w-5 bg-gray-200 rounded"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-12 mb-2"></div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-gray-200 rounded-full w-20"></div>
                    <div className="h-8 bg-gray-200 rounded-full w-24"></div>
                    <div className="h-8 bg-gray-200 rounded-full w-28"></div>
                  </div>
                </div>
                
                <div>
                  <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-gray-200 rounded-full w-24"></div>
                    <div className="h-8 bg-gray-200 rounded-full w-16"></div>
                    <div className="h-8 bg-gray-200 rounded-full w-20"></div>
                  </div>
                </div>
                
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="flex gap-2">
                    <div className="h-8 bg-gray-200 rounded w-8"></div>
                    <div className="h-8 bg-gray-200 rounded w-8"></div>
                    <div className="h-8 bg-gray-200 rounded w-8"></div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Loading news cards */}
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>

        {/* Loading status */}
        <div className="text-center mt-8">
          <div className="flex items-center justify-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-lg">Loading latest news...</span>
          </div>
          <p className="text-gray-500 mt-2">
            Fetching news from multiple sources
          </p>
        </div>
      </div>
    </div>
  );
} 