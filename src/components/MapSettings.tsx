'use client';

import React, { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Map } from 'lucide-react';
import BoundaryControls from './BoundaryControls';

type MapStyleType = 'basic' | 'topo' | 'satellite' | 'terrain' | 'streets';
type GeoLayerType = 'sa2' | 'sa3' | 'sa4' | 'lga' | 'postcode' | 'locality' | 'acpr' | 'mmm';

interface FacilityTypes {
  residential: boolean;
  multipurpose_others: boolean;
  home: boolean;
  retirement: boolean;
}

interface MapSettingsProps {
  selectedMapStyle: MapStyleType;
  onMapStyleChange: (style: MapStyleType) => void;
  selectedGeoLayer: GeoLayerType;
  onGeoLayerChange: (layer: GeoLayerType) => void;
  className?: string;
  preloadingData?: boolean;
  preloadProgress?: { current: number; total: number };
  stylesPreloaded?: boolean;
  stylePreloadProgress?: { current: number; total: number };
}

export default function MapSettings({
  selectedMapStyle,
  onMapStyleChange,
  selectedGeoLayer,
  onGeoLayerChange,
  className = "",
  preloadingData = false,
  preloadProgress = { current: 0, total: 0 },
  stylesPreloaded = false,
  stylePreloadProgress = { current: 0, total: 5 }
}: MapSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className={`${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 p-4 w-full hover:bg-gray-50 transition-colors text-left"
      >
        <Settings className="h-5 w-5 text-gray-600" />
        <span className="text-sm font-medium text-gray-900">Map Settings</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400 ml-auto" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {/* Preload Progress Banners */}
          {(preloadingData || !stylesPreloaded) && (
            <div className="space-y-3 mb-6">
              {/* Boundary Data Preload */}
              {preloadingData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm font-medium text-blue-800">Loading Boundary Data</span>
                  </div>
                  <div className="text-xs text-blue-600 mb-2">
                    Preloading {preloadProgress.current}/{preloadProgress.total} boundary files
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${preloadProgress.total > 0 ? (preloadProgress.current / preloadProgress.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {/* Style Data Preload */}
              {!stylesPreloaded && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="animate-spin h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
                    <span className="text-sm font-medium text-purple-800">Loading Map Styles</span>
                  </div>
                  <div className="text-xs text-purple-600 mb-2">
                    Preloading {stylePreloadProgress.current}/{stylePreloadProgress.total} map styles
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stylePreloadProgress.total > 0 ? (stylePreloadProgress.current / stylePreloadProgress.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-6">
            {/* 1. Boundary Controls - First */}
            <BoundaryControls
              selectedGeoLayer={selectedGeoLayer}
              onGeoLayerChange={onGeoLayerChange}
            />

            {/* Map Style selector has been removed as requested */}
          </div>
        </div>
      )}
    </div>
  );
} 