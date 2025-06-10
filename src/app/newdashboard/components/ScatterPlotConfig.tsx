'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Settings, ChevronDown, Info, Palette } from 'lucide-react';

interface ChartConfiguration {
  id: string;
  name: string;
  chartType: 'scatter';
  dataset: 'healthcare' | 'demographics' | 'economics' | 'healthStats';
  xAxis: string;
  yAxis: string;
  colorPalette?: string;
  createdAt: Date;
}

interface ScatterPlotConfigProps {
  config: ChartConfiguration;
  availableVariables: {
    healthcare: string[];
    demographics: string[];
    economics: string[];
    healthStats: string[];
  };
  onConfigChange: (config: ChartConfiguration) => void;
  onComplete: (config: ChartConfiguration) => void;
}

const COLOR_PALETTES = [
  { id: 'default', name: 'Default Blue', preview: '#1f77b4', colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'] },
  { id: 'healthcare', name: 'Healthcare', preview: '#2563eb', colors: ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6'] },
  { id: 'warm', name: 'Warm Tones', preview: '#dc2626', colors: ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb'] },
  { id: 'cool', name: 'Cool Tones', preview: '#0891b2', colors: ['#0891b2', '#0d9488', '#059669', '#7c3aed', '#db2777'] },
  { id: 'earth', name: 'Earth Tones', preview: '#92400e', colors: ['#92400e', '#b45309', '#a16207', '#15803d', '#1d4ed8'] }
];

export default function ScatterPlotConfig({ 
  config, 
  availableVariables, 
  onConfigChange, 
  onComplete 
}: ScatterPlotConfigProps) {
  const [chartName, setChartName] = useState(config.name);
  const [selectedDataset, setSelectedDataset] = useState(config.dataset);
  const [selectedXAxis, setSelectedXAxis] = useState(config.xAxis);
  const [selectedYAxis, setSelectedYAxis] = useState(config.yAxis);
  const [selectedPalette, setSelectedPalette] = useState(config.colorPalette || 'default');
  const [showPaletteDropdown, setShowPaletteDropdown] = useState(false);
  
  // Use ref to track if we're in initialization phase
  const isInitialized = useRef(false);

  // Initialize state from config only once
  useEffect(() => {
    if (!isInitialized.current) {
      setChartName(config.name);
      setSelectedDataset(config.dataset);
      setSelectedXAxis(config.xAxis);
      setSelectedYAxis(config.yAxis);
      setSelectedPalette(config.colorPalette || 'default');
      isInitialized.current = true;
    }
  }, [config.name, config.dataset, config.xAxis, config.yAxis, config.colorPalette]);

  // Update configuration when any values change (but only after initialization)
  useEffect(() => {
    if (isInitialized.current) {
      const updatedConfig = {
        ...config,
        name: chartName,
        dataset: selectedDataset,
        xAxis: selectedXAxis,
        yAxis: selectedYAxis,
        colorPalette: selectedPalette
      };
      onConfigChange(updatedConfig);
    }
  }, [chartName, selectedDataset, selectedXAxis, selectedYAxis, selectedPalette]);

  const isConfigurationValid = () => {
    return chartName.trim() !== '' && selectedXAxis !== '' && selectedYAxis !== '' && selectedXAxis !== selectedYAxis;
  };

  const handleComplete = () => {
    if (isConfigurationValid()) {
      const finalConfig = {
        ...config,
        name: chartName,
        dataset: selectedDataset,
        xAxis: selectedXAxis,
        yAxis: selectedYAxis,
        colorPalette: selectedPalette
      };
      onComplete(finalConfig);
    }
  };

  const getVariablesByDataset = () => {
    const variables: { [key: string]: { name: string; variables: string[] } } = {
      healthcare: { name: 'Healthcare', variables: availableVariables.healthcare },
      demographics: { name: 'Demographics', variables: availableVariables.demographics },
      economics: { name: 'Economics', variables: availableVariables.economics },
      healthStats: { name: 'Health Statistics', variables: availableVariables.healthStats }
    };
    return variables;
  };

  const variablesByDataset = getVariablesByDataset();
  const currentDatasetVariables = variablesByDataset[selectedDataset]?.variables || [];

  return (
    <div className="space-y-6">
      {/* Chart Name */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Chart Title</label>
        <input
          type="text"
          value={chartName}
          onChange={(e) => setChartName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter custom chart title..."
        />
      </div>

      {/* Color Palette Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Color Palette</label>
        <div className="relative">
          <button
            onClick={() => setShowPaletteDropdown(!showPaletteDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full border border-gray-300"
                style={{ backgroundColor: COLOR_PALETTES.find(p => p.id === selectedPalette)?.preview }}
              />
              <span>{COLOR_PALETTES.find(p => p.id === selectedPalette)?.name}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
          
          {showPaletteDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
              {COLOR_PALETTES.map(palette => (
                <button
                  key={palette.id}
                  onClick={() => {
                    setSelectedPalette(palette.id);
                    setShowPaletteDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                >
                  <div 
                    className="w-4 h-4 rounded-full border border-gray-300"
                    style={{ backgroundColor: palette.preview }}
                  />
                  <span className="flex-1">{palette.name}</span>
                  <div className="flex gap-1">
                    {palette.colors.slice(0, 3).map((color, idx) => (
                      <div 
                        key={idx}
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dataset Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Data Source</label>
        <select
          value={selectedDataset}
          onChange={(e) => {
            setSelectedDataset(e.target.value as any);
            setSelectedXAxis('');
            setSelectedYAxis('');
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {Object.entries(variablesByDataset).map(([key, { name }]) => (
            <option key={key} value={key}>{name}</option>
          ))}
        </select>
      </div>

      {/* X-Axis Variable */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">X-Axis Variable</label>
        <select
          value={selectedXAxis}
          onChange={(e) => setSelectedXAxis(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select X-axis variable...</option>
          {currentDatasetVariables.map(variable => (
            <option key={variable} value={variable}>{variable}</option>
          ))}
        </select>
      </div>

      {/* Y-Axis Variable */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Y-Axis Variable</label>
        <select
          value={selectedYAxis}
          onChange={(e) => setSelectedYAxis(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select Y-axis variable...</option>
          {currentDatasetVariables.map(variable => (
            <option key={variable} value={variable} disabled={variable === selectedXAxis}>
              {variable}
            </option>
          ))}
        </select>
      </div>

      {/* Configuration Info */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-1">Scatter Plot with Median Quadrants</p>
          <p>SA2 regions will be plotted as dots with median crosshairs dividing the plot into quadrants. Hover over dots to see SA2 details.</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button
          onClick={handleComplete}
          disabled={!isConfigurationValid()}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
            isConfigurationValid()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Check className="h-4 w-4" />
          Create Chart
        </button>
      </div>
    </div>
  );
} 