'use client';

import React, { useState } from 'react';
import { Database, ChevronDown, ChevronUp, TrendingUp, Users, Heart, Eye, EyeOff } from 'lucide-react';
import { PROGRAM_TYPES, getFlattenedOptions } from './HeatmapDataService';

interface DataLayersProps {
  className?: string;
  onHeatmapToggle?: (visible: boolean) => void;
  onHeatmapDataSelect?: (category: string, subcategory: string) => void;
  onHeatmapClear?: () => void;
  heatmapVisible?: boolean;
  selectedVariableName?: string;
  heatmapMinValue?: number;
  heatmapMaxValue?: number;
}

export default function DataLayers({
  className = "",
  onHeatmapToggle,
  onHeatmapDataSelect,
  onHeatmapClear,
  heatmapVisible = false,
  selectedVariableName = "",
  heatmapMinValue,
  heatmapMaxValue
}: DataLayersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHealthOptions, setShowHealthOptions] = useState(false);

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
      disabled: true
    },
    {
      key: 'health',
      label: 'Health',
      icon: Heart,
      color: 'text-purple-600',
      disabled: false
    }
  ];

  // Get flattened healthcare options
  const healthcareOptions = getFlattenedOptions();

  // Handle health section double-click
  const handleHealthDoubleClick = () => {
    if (!showHealthOptions) {
      setShowHealthOptions(true);
    }
  };

  // Handle healthcare option selection
  const handleHealthcareOptionSelect = (option: any) => {
    setShowHealthOptions(false);
    onHeatmapDataSelect?.(option.category, option.subcategory);
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
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 flex-1 hover:bg-gray-50 transition-colors text-left rounded p-2"
        >
          <Database className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">Data Layers</span>
          <div className="ml-auto">
            {isExpanded ? (
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
      {isExpanded && (
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
                      : disabled 
                        ? 'bg-gray-50 opacity-60 cursor-not-allowed' 
                        : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onDoubleClick={key === 'health' ? handleHealthDoubleClick : undefined}
                  onClick={key === 'health' ? handleHealthDoubleClick : undefined}
                >
                  <div className={`w-3 h-3 border border-gray-300 rounded ${
                    key === 'health' && !disabled ? 'bg-purple-200' : ''
                  }`}></div>
                  <Icon className={`h-3 w-3 ${color}`} />
                  <span className="text-xs text-gray-600">{label}</span>
                  {key === 'health' && (
                    <span className="ml-auto text-xs text-purple-600 font-medium">
                      Click to select
                    </span>
                  )}
                </div>
                
                {/* Health Options Dropdown */}
                {key === 'health' && showHealthOptions && (
                  <div className="absolute top-[-180px] left-full ml-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-64 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                      <span className="text-xs font-bold text-gray-700">Healthcare Data Categories (18 options)</span>
                      <button
                        onClick={() => setShowHealthOptions(false)}
                        className="float-right text-xs text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-52">
                      {Object.entries(PROGRAM_TYPES).map(([category, subcategories]) => (
                        <div key={category} className="border-b border-gray-100 last:border-b-0">
                          <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-700 underline">
                            {category}
                          </div>
                          {subcategories.map((subcategory) => {
                            const option = healthcareOptions.find(opt => 
                              opt.category === category && opt.subcategory === subcategory
                            );
                            return (
                              <button
                                key={subcategory}
                                onClick={() => option && handleHealthcareOptionSelect(option)}
                                className="w-full text-left px-4 py-2 text-xs text-gray-600 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                              >
                                {subcategory}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            <div className="mt-3 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 italic">
                Economics and Demographics layers coming in future updates
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Click outside handler */}
      {showHealthOptions && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => setShowHealthOptions(false)}
        />
      )}
    </div>
  );
} 