'use client';

import React, { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Map, Check, Building, Home, Mail, Building2 } from 'lucide-react';
import BoundaryControls from './BoundaryControls';

type MapStyleType = 'basic' | 'topo' | 'satellite' | 'terrain' | 'streets';
type GeoLayerType = 'sa2' | 'sa3' | 'sa4' | 'lga' | 'postcode' | 'locality' | 'acpr' | 'mmm';

interface FacilityTypes {
  residential: boolean;
  mps: boolean;
  home: boolean;
  retirement: boolean;
}

interface MapSettingsProps {
  selectedMapStyle: MapStyleType;
  onMapStyleChange: (style: MapStyleType) => void;
  selectedGeoLayer: GeoLayerType;
  onGeoLayerChange: (layer: GeoLayerType) => void;
  facilityTypes: FacilityTypes;
  onToggleFacilityType?: (type: keyof FacilityTypes) => void; // Optional now
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
  facilityTypes,
  onToggleFacilityType,
  className = "",
  preloadingData = false,
  preloadProgress = { current: 0, total: 0 },
  stylesPreloaded = false,
  stylePreloadProgress = { current: 0, total: 5 }
}: MapSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapStyleExpanded, setMapStyleExpanded] = useState(false);
  const [isChangingStyle, setIsChangingStyle] = useState(false);

  const mapStyleOptions = [
    { key: 'basic', label: 'Basic' },
    { key: 'topo', label: 'Topographic' },
    { key: 'satellite', label: 'Satellite' },
    { key: 'terrain', label: 'Terrain' },
    { key: 'streets', label: 'Streets' }
  ];

  const facilityTypeLabels = {
    residential: 'Residential Care',
    mps: 'Multi-Purpose Service',
    home: 'Home Care',
    retirement: 'Retirement Living'
  };

  const facilityTypeIcons = {
    residential: Building,
    mps: Building2,
    home: Home,
    retirement: Mail
  };

  const facilityTypeColors = {
    residential: 'text-red-600',
    mps: 'text-blue-600',
    home: 'text-green-600', 
    retirement: 'text-purple-600'
  };

  const getMapStyleDisplayName = () => {
    const style = mapStyleOptions.find(s => s.key === selectedMapStyle);
    return style ? style.label : 'Unknown';
  };

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

            {/* 2. Aged Care Facilities - Second (Fixed as Selected) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Aged Care Facilities</span>
                <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full ml-auto">
                  All Active
                </span>
              </div>
              
              <div className="space-y-1">
                {Object.entries(facilityTypes).map(([key, value]) => {
                  const Icon = facilityTypeIcons[key as keyof FacilityTypes];
                  const colorClass = facilityTypeColors[key as keyof FacilityTypes];
                  return (
                    <div
                      key={key}
                      className="w-full flex items-center gap-3 p-2 bg-green-50 rounded text-left"
                    >
                      <div className="w-4 h-4 border-2 rounded flex items-center justify-center bg-green-600 border-green-600">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <Icon className={`h-4 w-4 ${colorClass}`} />
                      <span className="text-sm text-gray-900">
                        {facilityTypeLabels[key as keyof FacilityTypes]}
                      </span>
                      <span className="text-xs text-green-600 ml-auto">Always On</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Map Style - Third (Dropdown) */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-medium text-gray-700">Map Style</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full ml-auto capitalize">
                  {selectedMapStyle}
                </span>
              </div>
              
              <div className="relative">
                <button
                  onClick={() => !isChangingStyle && setMapStyleExpanded(!mapStyleExpanded)}
                  disabled={isChangingStyle}
                  className={`w-full flex items-center justify-between p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
                    isChangingStyle ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span className="text-sm text-gray-700">
                    {getMapStyleDisplayName()}
                    {isChangingStyle && (
                      <span className="text-xs text-blue-500 ml-1">(Changing...)</span>
                    )}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${mapStyleExpanded ? 'rotate-180' : ''} ${
                    isChangingStyle ? 'animate-pulse' : ''
                  }`} />
                </button>
                
                {mapStyleExpanded && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-1">
                      {mapStyleOptions.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => {
                            if (!isChangingStyle && key !== selectedMapStyle) {
                              setIsChangingStyle(true);
                              onMapStyleChange(key as MapStyleType);
                              setMapStyleExpanded(false);
                              // Reset loading state after a longer delay to match backend
                              setTimeout(() => setIsChangingStyle(false), 4000);
                            }
                          }}
                          disabled={isChangingStyle}
                          className={`w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded text-left transition-colors ${
                            selectedMapStyle === key ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          } ${isChangingStyle ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className={`w-4 h-4 border rounded-full flex items-center justify-center ${
                            selectedMapStyle === key ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                          }`}>
                            {selectedMapStyle === key && !isChangingStyle && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                            {isChangingStyle && selectedMapStyle === key && (
                              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <span className="text-sm">
                            {label}
                            {isChangingStyle && selectedMapStyle === key && (
                              <span className="text-xs text-blue-500 ml-1">(Loading...)</span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 