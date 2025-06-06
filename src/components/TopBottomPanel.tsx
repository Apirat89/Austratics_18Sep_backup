'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, ChevronRight, BarChart3 } from 'lucide-react';
import { RankedSA2Data } from './HeatmapDataService';

interface TopBottomPanelProps {
  className?: string;
  rankedData: RankedSA2Data | null;
  onToggle?: () => void;
}

export default function TopBottomPanel({
  className = "",
  rankedData,
  onToggle
}: TopBottomPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Don't render panel if no data is available
  if (!rankedData) {
    return null;
  }

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    onToggle?.();
  };

  return (
    <div className={`relative bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 ${
      isCollapsed ? 'w-12 h-12' : 'w-96'
    } ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-gray-100 bg-gray-50">
        {!isCollapsed && (
          <>
            <BarChart3 className="h-4 w-4 text-gray-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">
                Regional Rankings
              </div>
              <div className="text-xs text-gray-600 break-words">
                {rankedData.selectedVariable}
              </div>
            </div>
          </>
        )}
        
        {isCollapsed && (
          <div className="flex-1 flex justify-center">
            <BarChart3 className="h-4 w-4 text-gray-600" />
          </div>
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
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
                  <div
                    key={region.sa2Id}
                    className="bg-green-50 border border-green-200 rounded-lg p-3"
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
                  </div>
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
                  <div
                    key={region.sa2Id}
                    className="bg-red-50 border border-red-200 rounded-lg p-3"
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
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 italic">No data available</div>
              )}
            </div>
          </div>


        </div>
      )}

      {/* Collapsible Arrow Button - Bottom Left */}
      <div className="absolute bottom-2 left-2">
        <button
          onClick={handleToggleCollapse}
          className="flex items-center justify-center w-8 h-8 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
          title={isCollapsed ? "Expand Regional Rankings" : "Collapse Regional Rankings"}
        >
          <ChevronRight className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${
            isCollapsed ? 'rotate-0' : 'rotate-180'
          }`} />
        </button>
      </div>
    </div>
  );
} 