'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, ChevronRight, BarChart3, X } from 'lucide-react';
import { RankedSA2Data } from './HeatmapDataService';

interface TopBottomPanelProps {
  className?: string;
  rankedData: RankedSA2Data | null;
  isVisible?: boolean;
  onToggle?: () => void;
  onRegionClick?: (sa2Id: string, sa2Name: string) => void;
}

export default function TopBottomPanel({
  className = "",
  rankedData,
  isVisible = false,
  onToggle,
  onRegionClick
}: TopBottomPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Handle region click
  const handleRegionClick = (sa2Id: string, sa2Name: string) => {
    console.log('🎯 Regional Rankings: Clicked region:', { sa2Id, sa2Name });
    onRegionClick?.(sa2Id, sa2Name);
  };

  // Don't render panel if no data is available
  if (!rankedData) {
    return null;
  }

  // If not visible, show collapsed button to allow user to expand
  if (!isVisible) {
    return (
      <div className={`${className}`}>
        <button
          onClick={() => onToggle?.()}
          className="flex items-center justify-center w-12 h-12 bg-white border border-gray-300 rounded-lg shadow-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-xl"
          title="Show Regional Rankings"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    );
  }

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Show only the expand button when collapsed
  if (isCollapsed) {
    return (
      <div className={`${className}`}>
        <button
          onClick={handleToggleCollapse}
          className="flex items-center justify-center w-12 h-12 bg-white border border-gray-300 rounded-lg shadow-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-xl"
          title="Expand Regional Rankings"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div className={`relative bg-white rounded-lg shadow-lg border border-gray-200 w-96 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-100 bg-gray-50">
        <BarChart3 className="h-4 w-4 text-gray-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900">
            Regional Rankings
          </div>
          <div className="text-xs text-gray-600 break-words">
            {rankedData.selectedVariable}
          </div>
        </div>
        {/* Close Button */}
        <button
          onClick={() => onToggle?.()}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
          title="Close Regional Rankings"
        >
          <X className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
        {/* Top 3 Regions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900">Highest Values</span>
          </div>
          <div className="space-y-2">
            {rankedData.topRegions.length > 0 ? (
              rankedData.topRegions.map((region, index) => (
                <button
                  key={region.sa2Id}
                  onClick={() => handleRegionClick(region.sa2Id, region.sa2Name)}
                  className="w-full bg-green-50 border border-green-200 rounded-lg p-3 hover:bg-green-100 hover:border-green-300 transition-all duration-200 cursor-pointer text-left"
                  title={`Click to zoom to ${region.sa2Name}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 break-words leading-tight">
                          {region.sa2Name} ({region.sa2Id})
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-green-700 flex-shrink-0">
                      {region.value.toLocaleString()}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-xs text-gray-500 italic">No data available</div>
            )}
          </div>
        </div>

        {/* Bottom 3 Regions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-gray-900">Lowest Values</span>
          </div>
          <div className="space-y-2">
            {rankedData.bottomRegions.length > 0 ? (
              rankedData.bottomRegions.map((region, index) => (
                <button
                  key={region.sa2Id}
                  onClick={() => handleRegionClick(region.sa2Id, region.sa2Name)}
                  className="w-full bg-red-50 border border-red-200 rounded-lg p-3 hover:bg-red-100 hover:border-red-300 transition-all duration-200 cursor-pointer text-left"
                  title={`Click to zoom to ${region.sa2Name}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 break-words leading-tight">
                          {region.sa2Name} ({region.sa2Id})
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-red-700 flex-shrink-0">
                      {region.value.toLocaleString()}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-xs text-gray-500 italic">No data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Arrow Button - Bottom Left */}
      <div className="absolute bottom-2 left-2">
        <button
          onClick={handleToggleCollapse}
          className="flex items-center justify-center w-8 h-8 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
          title="Collapse Regional Rankings"
        >
          <ChevronRight className="h-4 w-4 text-gray-600 transition-transform duration-200 rotate-180" />
        </button>
      </div>
    </div>
  );
} 