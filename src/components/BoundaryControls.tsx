'use client';

import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

type GeoLayerType = 'sa2' | 'sa3' | 'sa4' | 'lga' | 'postcode' | 'locality';

interface BoundaryControlsProps {
  selectedGeoLayer: GeoLayerType;
  onGeoLayerChange: (layer: GeoLayerType) => void;
  className?: string;
}

export default function BoundaryControls({
  selectedGeoLayer,
  onGeoLayerChange,
  className = ""
}: BoundaryControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const geoLayers = [
    { value: 'sa2' as const, label: 'SA2 Areas' },
    { value: 'sa3' as const, label: 'SA3 Areas' },
    { value: 'sa4' as const, label: 'SA4 Areas' },
    { value: 'lga' as const, label: 'Local Government Areas' },
    { value: 'postcode' as const, label: 'Postcode Areas' },
    { value: 'locality' as const, label: 'Localities' }
  ];

  const getLayerDisplayName = () => {
    const layer = geoLayers.find(l => l.value === selectedGeoLayer);
    return layer ? layer.label : 'Unknown';
  };

  return (
    <div className={`${className}`}>
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-700">Boundaries</span>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full ml-auto">
            {selectedGeoLayer.toUpperCase()}
          </span>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm text-gray-700">{getLayerDisplayName()}</span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          
          {isExpanded && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-1">
                {geoLayers.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => {
                      onGeoLayerChange(value);
                      setIsExpanded(false);
                    }}
                    className={`w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded text-left transition-colors ${
                      selectedGeoLayer === value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <div className={`w-4 h-4 border rounded-full flex items-center justify-center ${
                      selectedGeoLayer === value ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {selectedGeoLayer === value && (
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
  );
} 