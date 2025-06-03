'use client';

import React, { useState } from 'react';
import { Settings, ChevronDown, ChevronUp, Map, Check, Building, Home, Mail } from 'lucide-react';
import BoundaryControls from './BoundaryControls';

type MapStyleType = 'basic' | 'topo' | 'satellite' | 'terrain' | 'streets';
type GeoLayerType = 'sa2' | 'sa3' | 'sa4' | 'lga' | 'postcode' | 'locality';

interface FacilityTypes {
  residential: boolean;
  home: boolean;
  retirement: boolean;
}

interface MapSettingsProps {
  selectedMapStyle: MapStyleType;
  onMapStyleChange: (style: MapStyleType) => void;
  selectedGeoLayer: GeoLayerType;
  onGeoLayerChange: (layer: GeoLayerType) => void;
  facilityTypes: FacilityTypes;
  onToggleFacilityType: (type: keyof FacilityTypes) => void;
  className?: string;
}

export default function MapSettings({
  selectedMapStyle,
  onMapStyleChange,
  selectedGeoLayer,
  onGeoLayerChange,
  facilityTypes,
  onToggleFacilityType,
  className = ""
}: MapSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapStyleExpanded, setMapStyleExpanded] = useState(false);

  const mapStyleOptions = [
    { key: 'basic', label: 'Basic' },
    { key: 'topo', label: 'Topographic' },
    { key: 'satellite', label: 'Satellite' },
    { key: 'terrain', label: 'Terrain' },
    { key: 'streets', label: 'Streets' }
  ];

  const facilityTypeLabels = {
    residential: 'Residential Care',
    home: 'Home Care',
    retirement: 'Retirement Living'
  };

  const facilityTypeIcons = {
    residential: Building,
    home: Home,
    retirement: Mail
  };

  const facilityTypeColors = {
    residential: 'text-red-600',
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
          <div className="space-y-6">
            {/* 1. Boundary Controls - First */}
            <BoundaryControls
              selectedGeoLayer={selectedGeoLayer}
              onGeoLayerChange={onGeoLayerChange}
            />

            {/* 2. Aged Care Facilities - Second */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Aged Care Facilities</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full ml-auto">
                  {Object.values(facilityTypes).filter(Boolean).length} active
                </span>
              </div>
              
              <div className="space-y-1">
                {Object.entries(facilityTypes).map(([key, value]) => {
                  const Icon = facilityTypeIcons[key as keyof FacilityTypes];
                  const colorClass = facilityTypeColors[key as keyof FacilityTypes];
                  return (
                    <button
                      key={key}
                      onClick={() => onToggleFacilityType(key as keyof FacilityTypes)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded text-left transition-colors"
                    >
                      <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                        value ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                        {value && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <Icon className={`h-4 w-4 ${value ? colorClass : 'text-gray-400'}`} />
                      <span className={`text-sm ${
                        value ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {facilityTypeLabels[key as keyof FacilityTypes]}
                      </span>
                    </button>
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
                  onClick={() => setMapStyleExpanded(!mapStyleExpanded)}
                  className="w-full flex items-center justify-between p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-700">{getMapStyleDisplayName()}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${mapStyleExpanded ? 'rotate-180' : ''}`} />
                </button>
                
                {mapStyleExpanded && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="p-1">
                      {mapStyleOptions.map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() => {
                            onMapStyleChange(key as MapStyleType);
                            setMapStyleExpanded(false);
                          }}
                          className={`w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded text-left transition-colors ${
                            selectedMapStyle === key ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          <div className={`w-4 h-4 border rounded-full flex items-center justify-center ${
                            selectedMapStyle === key ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                          }`}>
                            {selectedMapStyle === key && (
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            )}
                          </div>
                          <span className="text-sm">{label}</span>
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