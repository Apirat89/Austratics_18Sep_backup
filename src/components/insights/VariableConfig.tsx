'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Settings, ChevronDown, Info, Lightbulb, Search, Filter } from 'lucide-react';
import { 
  EnhancedChartConfiguration, 
  getEnhancedVariableOptions, 
  getVariablesByPurpose,
  getChartRecommendations,
  SnapshotVariableOption,
  CHART_TYPES 
} from './InsightsDataService';

interface VariableConfigProps {
  config: EnhancedChartConfiguration;
  onConfigChange: (config: EnhancedChartConfiguration) => void;
  onComplete: (config: EnhancedChartConfiguration) => void;
}

export default function VariableConfig({ config, onConfigChange, onComplete }: VariableConfigProps) {
  const [enhancedVariables] = useState(() => getEnhancedVariableOptions());
  const [variablesByPurpose] = useState(() => getVariablesByPurpose());
  const [selectedVariables, setSelectedVariables] = useState<SnapshotVariableOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'measure' | 'dimension' | 'geographic'>('all');
  const [chartName, setChartName] = useState(config.name);

  const chartType = CHART_TYPES.find(ct => ct.type === config.chartType);

  useEffect(() => {
    if (chartName !== config.name) {
      onConfigChange({ ...config, name: chartName });
    }
  }, [chartName, config, onConfigChange]);

  // Get filtered variables based on search and role filter
  const getFilteredVariables = () => {
    let variables = enhancedVariables;
    
    if (filterRole !== 'all') {
      variables = variables.filter(v => v.role === filterRole);
    }
    
    if (searchTerm) {
      variables = variables.filter(v => 
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return variables;
  };

  // Handle variable selection
  const handleVariableSelect = (variable: SnapshotVariableOption) => {
    const isSelected = selectedVariables.some(v => v.id === variable.id);
    let newSelection: SnapshotVariableOption[];
    
    if (isSelected) {
      newSelection = selectedVariables.filter(v => v.id !== variable.id);
    } else {
      newSelection = [...selectedVariables, variable];
    }
    
    setSelectedVariables(newSelection);
    
    // Update config with new selection
    const newConfig = { 
      ...config, 
      selectedVariables: newSelection,
      // Auto-assign variables to chart roles based on their types
      ...autoAssignVariables(newSelection, config.chartType)
    };
    
    onConfigChange(newConfig);
  };

  // Automatically assign variables to chart configuration based on their roles
  const autoAssignVariables = (variables: SnapshotVariableOption[], chartType: string) => {
    const measures = variables.filter(v => v.role === 'measure');
    const dimensions = variables.filter(v => v.role === 'dimension');
    
    const assignment: Partial<EnhancedChartConfiguration> = {};
    
    switch (chartType) {
      case 'bar':
      case 'pie':
        if (measures.length > 0) assignment.measure = measures[0].id;
        if (dimensions.length > 0) assignment.dimension = dimensions[0].id;
        break;
        
      case 'scatter':
      case 'quadrant-scatter':
        if (measures.length >= 2) {
          assignment.measureX = measures[0].id;
          assignment.measureY = measures[1].id;
          // For quadrant scatter, we can also use a third measure for bubble size
          if (measures.length >= 3) {
            assignment.bubbleSize = measures[2].id;
          }
        }
        break;
        
      case 'bubble':
        if (measures.length >= 3) {
          assignment.measureX = measures[0].id;
          assignment.measureY = measures[1].id;
          assignment.bubbleSize = measures[2].id;
        }
        break;
        
      case 'histogram':
      case 'choropleth':
        if (measures.length > 0) assignment.measure = measures[0].id;
        break;
    }
    
    return assignment;
  };

  // Get chart recommendations
  const recommendations = getChartRecommendations(selectedVariables);

  // Check if configuration is valid
  const isConfigurationValid = () => {
    if (!chartType || selectedVariables.length === 0) return false;
    
    const measures = selectedVariables.filter(v => v.role === 'measure');
    const dimensions = selectedVariables.filter(v => v.role === 'dimension');
    
         switch (config.chartType) {
       case 'bar':
       case 'pie':
         return measures.length >= 1 && dimensions.length >= 1;
       case 'scatter':
       case 'quadrant-scatter':
         return measures.length >= 2;
       case 'bubble':
         return measures.length >= 3;
       case 'histogram':
       case 'choropleth':
         return measures.length >= 1;
       default:
         return false;
     }
  };

  return (
    <div className="space-y-6">
      {/* Chart Name Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Chart Name</label>
        <input
          type="text"
          value={chartName}
          onChange={(e) => setChartName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter chart name..."
        />
      </div>

      {/* Chart Type Display */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <Settings className="h-4 w-4 text-blue-600" />
        <div>
          <span className="text-sm font-medium text-blue-900">
            Configuring {chartType?.name}
          </span>
          <p className="text-xs text-blue-700 mt-1">{chartType?.description}</p>
        </div>
      </div>

      {/* Enhanced Configuration for Quadrant Scatter Plot */}
      {config.chartType === 'quadrant-scatter' && (
        <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="text-sm font-medium text-purple-900">Enhanced Scatter Plot Options</h4>
          
          {/* Color Palette Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Color Palette</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { key: 'default', name: 'Default', colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'] },
                { key: 'healthcare', name: 'Healthcare', colors: ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'] },
                { key: 'warm', name: 'Warm', colors: ['#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#059669'] },
                { key: 'cool', name: 'Cool', colors: ['#1e40af', '#0891b2', '#059669', '#7c3aed', '#be185d'] },
                { key: 'earth', name: 'Earth', colors: ['#92400e', '#a16207', '#166534', '#0f766e', '#7c2d12'] }
              ].map((palette) => (
                <button
                  key={palette.key}
                  onClick={() => onConfigChange({ ...config, colorBy: palette.key })}
                  className={`p-2 rounded-md border-2 transition-all ${
                    config.colorBy === palette.key 
                      ? 'border-purple-500 bg-purple-100' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-xs font-medium text-gray-700 mb-1">{palette.name}</div>
                  <div className="flex gap-1">
                    {palette.colors.map((color, index) => (
                      <div
                        key={index}
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Enhanced Features Display */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm text-purple-700">
              <Check className="h-4 w-4" />
              <span>Median quadrants</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-purple-700">
              <Check className="h-4 w-4" />
              <span>Interactive tooltips</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-purple-700">
              <Check className="h-4 w-4" />
              <span>Zoom controls</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-purple-700">
              <Check className="h-4 w-4" />
              <span>Bubble size option</span>
            </div>
          </div>
        </div>
      )}

      {/* Variable Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Select Variables</h4>
          <span className="text-xs text-gray-500">
            {selectedVariables.length} selected
          </span>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search variables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Variables</option>
            <option value="measure">Measures</option>
            <option value="dimension">Dimensions</option>
            <option value="geographic">Geographic</option>
          </select>
        </div>

        {/* Variable List */}
        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
          {getFilteredVariables().map((variable) => {
            const isSelected = selectedVariables.some(v => v.id === variable.id);
            
            return (
              <button
                key={variable.id}
                onClick={() => handleVariableSelect(variable)}
                className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="text-sm font-medium text-gray-900 truncate">
                        {variable.name}
                      </h5>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        variable.role === 'measure' ? 'bg-green-100 text-green-700' :
                        variable.role === 'dimension' ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {variable.role}
                      </span>
                      {variable.units && (
                        <span className="text-xs text-gray-500">({variable.units})</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{variable.description}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{variable.category}</span>
                      {variable.sampleRange && (
                        <>
                          <span>•</span>
                          <span>Range: {variable.sampleRange}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {isSelected ? (
                      <Check className="h-4 w-4 text-blue-600" />
                    ) : (
                      <div className="h-4 w-4 border border-gray-300 rounded" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Recommendations */}
      {selectedVariables.length > 0 && recommendations.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h5 className="text-sm font-medium text-yellow-800 mb-2">Chart Recommendations</h5>
              <div className="space-y-2">
                {recommendations.slice(0, 2).map((rec, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium text-yellow-800 capitalize">{rec.chartType}:</span>
                    <span className="text-yellow-700 ml-1">{rec.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Variable Assignment Preview */}
      {selectedVariables.length > 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Variable Assignment</h5>
          <div className="space-y-1 text-sm text-gray-600">
            {config.measure && (
              <div>
                <span className="font-medium">Primary Measure:</span>{' '}
                {enhancedVariables.find(v => v.id === config.measure)?.name}
              </div>
            )}
            {config.measureX && (
              <div>
                <span className="font-medium">X-Axis:</span>{' '}
                {enhancedVariables.find(v => v.id === config.measureX)?.name}
              </div>
            )}
            {config.measureY && (
              <div>
                <span className="font-medium">Y-Axis:</span>{' '}
                {enhancedVariables.find(v => v.id === config.measureY)?.name}
              </div>
            )}
            {config.bubbleSize && (
              <div>
                <span className="font-medium">Bubble Size:</span>{' '}
                {enhancedVariables.find(v => v.id === config.bubbleSize)?.name}
              </div>
            )}
            {config.dimension && (
              <div>
                <span className="font-medium">Group By:</span>{' '}
                {enhancedVariables.find(v => v.id === config.dimension)?.name}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuration Status */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          {isConfigurationValid() ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700">Configuration complete</span>
            </>
          ) : (
            <>
              <X className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">
                Select {chartType?.requiredAxes.length || 1} or more variables to continue
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onComplete(config)}
          disabled={!isConfigurationValid()}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Create Chart
        </button>
      </div>
    </div>
  );
} 