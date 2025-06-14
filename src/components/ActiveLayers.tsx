'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, X, ChevronDown, ChevronUp } from 'lucide-react';

interface FacilityTypes {
  residential: boolean;
  home: boolean;
  retirement: boolean;
  mps: boolean;
}

type GeoLayerType = 'sa2' | 'sa3' | 'sa4' | 'lga' | 'postcode' | 'locality';
type MapStyleType = 'basic' | 'topo' | 'satellite' | 'terrain' | 'streets';

interface ActiveLayersProps {
  facilityTypes: FacilityTypes;
  selectedGeoLayer: GeoLayerType;
  selectedMapStyle: MapStyleType;
  highlightedFeature?: string | null;
  highlightedFeatureName?: string | null;
  onClearHighlight?: () => void;
  className?: string;
}

export default function ActiveLayers({
  facilityTypes,
  selectedGeoLayer,
  selectedMapStyle,
  highlightedFeature,
  highlightedFeatureName,
  onClearHighlight,
  className = ""
}: ActiveLayersProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Check if there are active facilities or highlighted features
  const hasActiveFacilities = Object.values(facilityTypes).some(Boolean);
  const hasHighlightedFeature = Boolean(highlightedFeature);
  const hasActiveContent = hasActiveFacilities || hasHighlightedFeature;

  const getMapStyleDisplayName = () => {
    const styleMap = {
      'basic': 'Basic',
      'topo': 'Topographic', 
      'satellite': 'Satellite',
      'terrain': 'Terrain',
      'streets': 'Streets'
    };
    return styleMap[selectedMapStyle] || 'Unknown';
  };

  const getBoundaryDisplayName = () => {
    const boundaryMap = {
      'sa2': 'SA2 Boundaries',
      'sa3': 'SA3 Boundaries', 
      'sa4': 'SA4 Boundaries',
      'lga': 'LGA Boundaries',
      'locality': 'Locality Boundaries',
      'postcode': 'Postcode Areas'
    };
    return boundaryMap[selectedGeoLayer] || 'Unknown';
  };

  return (
    <div className={`${className}`}>
      {/* Clickable Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 p-4 w-full hover:bg-gray-50 transition-colors text-left border-b border-gray-200"
      >
        {isExpanded ? (
          <Eye className={`h-5 w-5 ${hasActiveContent ? 'text-blue-600' : 'text-gray-400'}`} />
        ) : (
          <EyeOff className="h-5 w-5 text-gray-400" />
        )}
        <span className="text-sm font-medium text-gray-900">Map Details</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400 ml-auto" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
        )}
      </button>
      
      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Highlighted Area - Special case, shows at top when present */}
          {highlightedFeature && (
            <div className="pb-3 border-b border-gray-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded border border-white bg-orange-500"></div>
                  <span className="text-xs text-gray-700 font-medium">Selected Area</span>
                </div>
                {onClearHighlight && (
                  <button
                    onClick={onClearHighlight}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Clear selection"
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-600">
                {highlightedFeature ? (
                  <>
                    {/* Always show the ID first, then name if available */}
                    <span className="font-medium">{selectedGeoLayer.toUpperCase()}: {highlightedFeature}</span>
                    {highlightedFeatureName && (
                      <span className="text-gray-500">
                        <br />{highlightedFeatureName}
                      </span>
                    )}
                  </>
                ) : (
                  `${selectedGeoLayer.toUpperCase()}: Unknown`
                )}
              </div>
            </div>
          )}

          {/* 1. Boundary Layer - First (Always show) */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-500 mb-2">Boundaries</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-1 border border-gray-400" style={{backgroundColor: 'transparent'}}></div>
              <span className="text-xs text-gray-700">{getBoundaryDisplayName()}</span>
            </div>
          </div>
          
          {/* 2. Facility Types - Second (Only when active) */}
          {hasActiveFacilities && (
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-500 mb-2">Facility Types</div>
              {facilityTypes.residential && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-600 rounded-full border border-white"></div>
                  <span className="text-xs text-gray-700">Residential Care</span>
                </div>
              )}
              {facilityTypes.mps && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-white" style={{backgroundColor: '#3182CE'}}></div>
                  <span className="text-xs text-gray-700">Multi-Purpose Service</span>
                </div>
              )}
              {facilityTypes.home && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-white" style={{backgroundColor: '#38A169'}}></div>
                  <span className="text-xs text-gray-700">Home Care</span>
                </div>
              )}
              {facilityTypes.retirement && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-white" style={{backgroundColor: '#9B59B6'}}></div>
                  <span className="text-xs text-gray-700">Retirement Living</span>
                </div>
              )}
            </div>
          )}

          {/* 3. Map Style - Third (Always show) */}
          <div className={`space-y-2 ${hasActiveFacilities ? 'pt-2 border-t border-gray-200' : (!highlightedFeature ? '' : 'pt-2 border-t border-gray-200')}`}>
            <div className="text-xs font-medium text-gray-500 mb-2">Map Style</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border border-gray-400 rounded" style={{backgroundColor: 'transparent'}}></div>
              <span className="text-xs text-gray-700">{getMapStyleDisplayName()}</span>
            </div>
          </div>

          {/* No active content message */}
          {!hasActiveContent && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 italic">
                💡 Select facility types or search for locations to see additional active content
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 