'use client';

import React, { useState } from 'react';
import { Database, ChevronDown, ChevronUp, TrendingUp, Users, Heart, Eye, EyeOff, Cross, DollarSign, BarChart3 } from 'lucide-react';
import { PROGRAM_TYPES, getFlattenedHealthcareOptions, DEMOGRAPHICS_TYPES, getFlattenedDemographicsOptions, getFlattenedEconomicOptions, getFlattenedHealthStatsOptions } from './HeatmapDataService';

interface DataLayersProps {
  className?: string;
  onHeatmapToggle?: (visible: boolean) => void;
  onHeatmapDataSelect?: (category: string, subcategory: string, dataType: 'healthcare' | 'demographics' | 'economics' | 'health-statistics') => void;
  onHeatmapClear?: () => void;
  heatmapVisible?: boolean;
  selectedVariableName?: string;
  heatmapMinValue?: number;
  heatmapMaxValue?: number;
  isExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  heatmapDataType?: 'healthcare' | 'demographics' | 'economics' | 'health-statistics';
  onHeatmapLoadingComplete?: (callback: () => void) => void;
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
  onExpandedChange,
  heatmapDataType = 'healthcare',
  onHeatmapLoadingComplete
}: DataLayersProps) {
  // Use prop if provided, otherwise use internal state for backwards compatibility
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = onExpandedChange ? isExpanded : internalExpanded;
  const [showHealthOptions, setShowHealthOptions] = useState(false);
  const [showDemographicsOptions, setShowDemographicsOptions] = useState(false);
  const [showEconomicsOptions, setShowEconomicsOptions] = useState(false);
  const [showHealthStatsOptions, setShowHealthStatsOptions] = useState(false);
  
  // 🔄 Loading state for heatmap changes
  const [isHeatmapLoading, setIsHeatmapLoading] = useState(false);

  const dataCategories = [
    {
      key: 'economics',
      label: 'Economics',
      icon: TrendingUp,
      color: 'text-green-600',
      disabled: false // ENABLED - economic statistics data available
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
      label: 'Health Sector',
      icon: Heart,
      color: 'text-purple-600',
      disabled: false
    },
    {
      key: 'health-statistics',
      label: 'Health Stats',
      icon: Cross,
      color: 'text-red-600',
      disabled: false // ENABLED - health statistics data available
    }
  ];

  // Get flattened options for all data types
  const healthcareOptions = getFlattenedHealthcareOptions();
  const demographicsOptions = getFlattenedDemographicsOptions();
  const economicsOptions = getFlattenedEconomicOptions();
  const healthStatsOptions = getFlattenedHealthStatsOptions();

  // Handle health section click
  const handleHealthClick = () => {
    if (!showHealthOptions) {
      setShowHealthOptions(true);
      setShowDemographicsOptions(false); // Close demographics when opening health
      setShowEconomicsOptions(false); // Close economics when opening health
      setShowHealthStatsOptions(false); // Close health stats when opening health
    }
  };

  // Handle demographics section click
  const handleDemographicsClick = () => {
    if (!showDemographicsOptions) {
      setShowDemographicsOptions(true);
      setShowHealthOptions(false); // Close health when opening demographics
      setShowEconomicsOptions(false); // Close economics when opening demographics
      setShowHealthStatsOptions(false); // Close health stats when opening demographics
    }
  };

  // Handle economics section click
  const handleEconomicsClick = () => {
    if (!showEconomicsOptions) {
      setShowEconomicsOptions(true);
      setShowHealthOptions(false); // Close health when opening economics
      setShowDemographicsOptions(false); // Close demographics when opening economics
      setShowHealthStatsOptions(false); // Close health stats when opening economics
    }
  };

  // Handle health statistics section click
  const handleHealthStatsClick = () => {
    if (!showHealthStatsOptions) {
      setShowHealthStatsOptions(true);
      setShowHealthOptions(false); // Close health when opening health stats
      setShowDemographicsOptions(false); // Close demographics when opening health stats
      setShowEconomicsOptions(false); // Close economics when opening health stats
    }
  };

  // Handle healthcare option selection
  const handleHealthcareOptionSelect = (option: any) => {
    setShowHealthOptions(false);
    setIsHeatmapLoading(true);
    onHeatmapDataSelect?.(option.category, option.subcategory, 'healthcare');
    // ✅ FIXED: Call completion callback asynchronously AND make state update async
    setTimeout(() => {
      onHeatmapLoadingComplete?.(() => {
        // ✅ CRITICAL FIX: Make state update asynchronous to prevent setState during render
        setTimeout(() => setIsHeatmapLoading(false), 0);
      });
    }, 0);
  };

  // Handle demographics option selection
  const handleDemographicsOptionSelect = (option: any) => {
    setShowDemographicsOptions(false);
    setIsHeatmapLoading(true);
    onHeatmapDataSelect?.(option.category, option.subcategory, 'demographics');
    // ✅ FIXED: Call completion callback asynchronously AND make state update async
    setTimeout(() => {
      onHeatmapLoadingComplete?.(() => {
        // ✅ CRITICAL FIX: Make state update asynchronous to prevent setState during render
        setTimeout(() => setIsHeatmapLoading(false), 0);
      });
    }, 0);
  };

  // Handle economics option selection
  const handleEconomicsOptionSelect = (option: any) => {
    setShowEconomicsOptions(false);
    setIsHeatmapLoading(true);
    onHeatmapDataSelect?.(option.category, option.subcategory, 'economics');
    // ✅ FIXED: Call completion callback asynchronously AND make state update async
    setTimeout(() => {
      onHeatmapLoadingComplete?.(() => {
        // ✅ CRITICAL FIX: Make state update asynchronous to prevent setState during render
        setTimeout(() => setIsHeatmapLoading(false), 0);
      });
    }, 0);
  };

  // Handle health statistics option selection
  const handleHealthStatsOptionSelect = (option: any) => {
    setShowHealthStatsOptions(false);
    setIsHeatmapLoading(true);
    onHeatmapDataSelect?.(option.category, option.subcategory, 'health-statistics');
    // ✅ FIXED: Call completion callback asynchronously AND make state update async
    setTimeout(() => {
      onHeatmapLoadingComplete?.(() => {
        // ✅ CRITICAL FIX: Make state update asynchronous to prevent setState during render
        setTimeout(() => setIsHeatmapLoading(false), 0);
      });
    }, 0);
  };

  // Handle heatmap visibility toggle
  const handleHeatmapToggle = () => {
    const newVisible = !heatmapVisible;
    onHeatmapToggle?.(newVisible);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <button
        onClick={() => {
          const newExpanded = !expanded;
          if (onExpandedChange) {
            onExpandedChange(newExpanded);
          } else {
            setInternalExpanded(newExpanded);
          }
        }}
        className="flex items-center gap-3 p-4 w-full hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
      >
        <Database className="h-5 w-5 text-gray-600" />
        <span className="text-sm font-medium text-gray-900">Data Layers</span>
        
        {/* 🔄 Heatmap Loading Indicator */}
        {isHeatmapLoading && (
          <div className="flex items-center gap-2 ml-auto">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-xs text-blue-600 font-medium">Updating...</span>
          </div>
        )}
        
        {/* Heatmap Visibility Toggle */}
        {!isHeatmapLoading && (
          <div
            onClick={(e) => {
              e.stopPropagation(); // Prevent header click
              handleHeatmapToggle();
            }}
            className={`p-1 rounded-md transition-colors ml-auto ${
              heatmapVisible 
                ? 'text-blue-600 hover:bg-blue-50' 
                : 'text-gray-400 hover:bg-gray-50'
            }`}
            title={heatmapVisible ? 'Hide heatmap' : 'Show heatmap'}
          >
            {heatmapVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </div>
        )}
        
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-3">
          <div className="space-y-2">
            {/* Heatmap Layer Display */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 mb-3">
                {/* Dynamic icon based on data type */}
                {heatmapDataType === 'demographics' ? (
                  <Users className="h-4 w-4 text-blue-600" />
                ) : heatmapDataType === 'economics' ? (
                  <DollarSign className="h-4 w-4 text-green-600" />
                ) : heatmapDataType === 'health-statistics' ? (
                  <BarChart3 className="h-4 w-4 text-red-600" />
                ) : (
                  <Heart className="h-4 w-4 text-purple-600" />
                )}
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
                        : key === 'health-statistics'
                          ? 'bg-red-50 hover:bg-red-100 border border-red-200'
                          : disabled 
                            ? 'bg-gray-50 opacity-60 cursor-not-allowed' 
                            : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={
                    key === 'health' ? handleHealthClick : 
                    key === 'demographics' ? handleDemographicsClick : 
                    key === 'economics' ? handleEconomicsClick :
                    key === 'health-statistics' ? handleHealthStatsClick :
                    undefined
                  }
                >
                  <div className={`w-3 h-3 border border-gray-300 rounded ${
                    key === 'health' && !disabled ? 'bg-purple-200' : 
                    key === 'demographics' && !disabled ? 'bg-blue-200' :
                    key === 'health-statistics' && !disabled ? 'bg-red-200' :
                    ''
                  }`}></div>
                  <Icon className={`h-3 w-3 ${color}`} />
                  <span className="text-xs text-gray-600">{label}</span>
                  {(key === 'health' || key === 'demographics' || key === 'economics' || key === 'health-statistics') && !disabled && (
                    <span className={`ml-auto text-xs font-medium ${
                      key === 'health' ? 'text-purple-600' : 
                      key === 'demographics' ? 'text-blue-600' :
                      key === 'economics' ? 'text-green-600' :
                      key === 'health-statistics' ? 'text-red-600' :
                      'text-gray-600'
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

                {/* Economics Options Dropdown */}
                {key === 'economics' && showEconomicsOptions && (
                  <div className="absolute top-[-180px] left-full ml-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-64 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                      <span className="text-xs font-bold text-gray-700">Economics Data Categories ({economicsOptions.length} options)</span>
                      <button
                        onClick={() => setShowEconomicsOptions(false)}
                        className="float-right text-xs text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-52">
                      {economicsOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleEconomicsOptionSelect(option)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-green-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-green-700">{option.category}</div>
                          <div className="text-gray-600">{option.subcategory}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Health Statistics Options Dropdown */}
                {key === 'health-statistics' && showHealthStatsOptions && (
                  <div className="absolute top-[-180px] left-full ml-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-30 max-h-64 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                      <span className="text-xs font-bold text-gray-700">Health Statistics Data Categories ({healthStatsOptions.length} options)</span>
                      <button
                        onClick={() => setShowHealthStatsOptions(false)}
                        className="float-right text-xs text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-52">
                      {healthStatsOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleHealthStatsOptionSelect(option)}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-red-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-red-700">{option.category}</div>
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