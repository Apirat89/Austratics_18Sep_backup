'use client';

import React, { useState } from 'react';
import { Database, ChevronDown, ChevronUp, TrendingUp, Users, Heart, Eye, EyeOff } from 'lucide-react';
import { PROGRAM_TYPES, getFlattenedHealthcareOptions, DEMOGRAPHICS_TYPES, getFlattenedDemographicsOptions } from './HeatmapDataService';

interface DataLayersProps {
  className?: string;
  onHeatmapToggle?: (visible: boolean) => void;
  onHeatmapDataSelect?: (category: string, subcategory: string, dataType: 'healthcare' | 'demographics') => void;
  onHeatmapClear?: () => void;
  heatmapVisible?: boolean;
  selectedVariableName?: string;
  heatmapMinValue?: number;
  heatmapMaxValue?: number;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export default function DataLayers({
  className = "",
  onHeatmapToggle,
  onHeatmapDataSelect,
  onHeatmapClear,
  heatmapVisible = false,
  selectedVariableName = "",
  heatmapMinValue,
  heatmapMaxValue,
  isExpanded = false,
  onExpandedChange
}: DataLayersProps) {
  // Use prop if provided, otherwise use internal state for backwards compatibility
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = onExpandedChange ? isExpanded : internalExpanded;
  const [showHealthOptions, setShowHealthOptions] = useState(false);
  const [showDemographicsOptions, setShowDemographicsOptions] = useState(false);

  const dataCategories = [
    {
      key: 'economics',
      label: 'Economics',
      icon: TrendingUp,
      color: 'text-green-600',
      disabled: true
    },
    {
      key: 'demographics',
      label: 'Demographics', 
      icon: Users,
      color: 'text-blue-600',
      disabled: false // ENABLED demographics
    },
    {
      key: 'health',
      label: 'Health',
      icon: Heart,
      color: 'text-purple-600',
      disabled: false
    }
  ];

  // Get flattened options for both data types
  const healthcareOptions = getFlattenedHealthcareOptions();
  const demographicsOptions = getFlattenedDemographicsOptions();

  // Handle health section click
  const handleHealthClick = () => {
    if (!showHealthOptions) {
      setShowHealthOptions(true);
      setShowDemographicsOptions(false); // Close demographics when opening health
    }
  };

  // Handle demographics section click
  const handleDemographicsClick = () => {
    if (!showDemographicsOptions) {
      setShowDemographicsOptions(true);
      setShowHealthOptions(false); // Close health when opening demographics
    }
  };

  // Handle healthcare option selection
  const handleHealthcareOptionSelect = (option: any) => {
    setShowHealthOptions(false);
    onHeatmapDataSelect?.(option.category, option.subcategory, 'healthcare');
  };

  // Handle demographics option selection
  const handleDemographicsOptionSelect = (option: any) => {
    setShowDemographicsOptions(false);
    onHeatmapDataSelect?.(option.category, option.subcategory, 'demographics');
  };

  // Handle heatmap visibility toggle
  const handleHeatmapToggle = () => {
    const newVisible = !heatmapVisible;
    onHeatmapToggle?.(newVisible);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 w-full border-b border-gray-100">
        <button
          onClick={() => {
            const newExpanded = !expanded;
            if (onExpandedChange) {
              onExpandedChange(newExpanded);
            } else {
              setInternalExpanded(newExpanded);
            }
          }}
          className="flex items-center gap-3 flex-1 hover:bg-gray-50 transition-colors text-left rounded p-2"
        >
          <Database className="h-4 w-4 text-gray-600" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900">Data Layers</span>
            <span className="text-[10px] text-gray-500">[SA2 level only]</span>
          </div>
          <div className="ml-auto">
            {expanded ? (
              <ChevronUp className="h-3 w-3 text-gray-400" />
            ) : (
              <ChevronDown className="h-3 w-3 text-gray-400" />
            )}
          </div>
        </button>
        
        {/* Visibility Toggle - separate button */}
        <button
          onClick={handleHeatmapToggle}
          className="flex items-center gap-1 px-2 py-1 rounded bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          {heatmapVisible ? (
            <><Eye className="h-3 w-3 text-green-600" /><span className="text-xs text-green-600">Visible</span></>
          ) : (
            <><EyeOff className="h-3 w-3 text-gray-500" /><span className="text-xs text-gray-500">Hidden</span></>
          )}
        </button>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-3">
          <div className="space-y-2">
            {/* Heatmap Layer Display */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900 flex-1">
                  {selectedVariableName || "No selection made"}
                </span>
                {selectedVariableName && (
                  <button
                    onClick={() => onHeatmapClear?.()}
                    className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
              
              {/* Horizontal Gradient Legend */}
              {selectedVariableName && heatmapMinValue !== undefined && heatmapMaxValue !== undefined && (
                <div className="space-y-2">
                  {/* Gradient Bar */}
                  <div className="relative h-4 rounded-full bg-gradient-to-r from-red-100 via-red-300 to-red-600 border border-gray-300">
                  </div>
                  
                  {/* Min/Max Labels */}
                  <div className="flex justify-between items-center text-xs text-gray-600">
                    <span className="bg-white px-2 py-1 rounded border shadow-sm">
                      Min: {heatmapMinValue.toLocaleString()}
                    </span>
                    <span className="bg-white px-2 py-1 rounded border shadow-sm">
                      Max: {heatmapMaxValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Data Categories */}
            {dataCategories.map(({ key, label, icon: Icon, color, disabled }) => (
              <div key={key} className="relative">
                <div 
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                    key === 'health' 
                      ? 'bg-purple-50 hover:bg-purple-100 border border-purple-200' 
                      : key === 'demographics'
                        ? 'bg-blue-50 hover:bg-blue-100 border border-blue-200'
                        : disabled 
                          ? 'bg-gray-50 opacity-60 cursor-not-allowed' 
                          : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={
                    key === 'health' ? handleHealthClick : 
                    key === 'demographics' ? handleDemographicsClick : 
                    undefined
                  }
                >
                  <div className={`w-3 h-3 border border-gray-300 rounded ${
                    key === 'health' && !disabled ? 'bg-purple-200' : 
                    key === 'demographics' && !disabled ? 'bg-blue-200' :
                    ''
                  }`}></div>
                  <Icon className={`h-3 w-3 ${color}`} />
                  <span className="text-xs text-gray-600">{label}</span>
                  {(key === 'health' || key === 'demographics') && !disabled && (
                    <span className={`ml-auto text-xs font-medium ${
                      key === 'health' ? 'text-purple-600' : 'text-blue-600'
                    }`}>
                      Click to select
                    </span>
                  )}
                </div>
                
                {/* Health Options Dropdown */}
                {key === 'health' && showHealthOptions && (
                  <div className="absolute top-[-180px] left-full ml-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-64 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                      <span className="text-xs font-bold text-gray-700">Healthcare Data Categories ({healthcareOptions.length} options)</span>
                      <button
                        onClick={() => setShowHealthOptions(false)}
                        className="float-right text-xs text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-52">
                      {healthcareOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleHealthcareOptionSelect(option)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-purple-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-purple-700">{option.category}</div>
                          <div className="text-gray-600">{option.subcategory}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Demographics Options Dropdown */}
                {key === 'demographics' && showDemographicsOptions && (
                  <div className="absolute top-[-180px] left-full ml-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-64 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                      <span className="text-xs font-bold text-gray-700">Demographics Data Categories ({demographicsOptions.length} options)</span>
                      <button
                        onClick={() => setShowDemographicsOptions(false)}
                        className="float-right text-xs text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-52">
                      {demographicsOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleDemographicsOptionSelect(option)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-blue-700">{option.category}</div>
                          <div className="text-gray-600">{option.subcategory}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 