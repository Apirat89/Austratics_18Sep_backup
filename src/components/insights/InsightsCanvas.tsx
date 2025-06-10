'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Download, Trash2 } from 'lucide-react';
import { EnhancedChartConfiguration, InsightsDataService } from './InsightsDataService';
import ChartTypeSelector from './ChartTypeSelector';
import ChartRenderer from './ChartRenderer';
import VariableConfig from './VariableConfig';

interface InsightsCanvasProps {
  onSaveAnalysis: (config: EnhancedChartConfiguration) => void;
  savedAnalyses: EnhancedChartConfiguration[];
  onLoadAnalysis: (config: EnhancedChartConfiguration) => void;
  onDeleteAnalysis: (id: string) => void;
}

interface WidgetState {
  id: string;
  isConfiguring: boolean;
  config: EnhancedChartConfiguration | null;
  isLoading: boolean;
}

export default function InsightsCanvas({ 
  onSaveAnalysis, 
  savedAnalyses, 
  onLoadAnalysis,
  onDeleteAnalysis 
}: InsightsCanvasProps) {
  const [widgets, setWidgets] = useState<WidgetState[]>([]);
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
  const [isChartSelectorOpen, setIsChartSelectorOpen] = useState(false);
  const [dataService] = useState(() => InsightsDataService.getInstance());

  // Effect to handle loading analysis from sidebar
  useEffect(() => {
    const handleAnalysisLoad = (event: CustomEvent<EnhancedChartConfiguration>) => {
      const config = event.detail;
      
      // Create new widget with the loaded configuration
      const newWidget: WidgetState = {
        id: `widget-${Date.now()}`,
        isConfiguring: false,
        config: config,
        isLoading: false
      };
      
      setWidgets(prev => [...prev, newWidget]);
    };

    window.addEventListener('load-analysis', handleAnalysisLoad as EventListener);
    return () => {
      window.removeEventListener('load-analysis', handleAnalysisLoad as EventListener);
    };
  }, []);

  // Initialize data service
  useEffect(() => {
    dataService.loadAllData().catch(error => {
      console.warn('Data service initialization failed:', error);
    });
  }, [dataService]);

  const createNewWidget = () => {
    const newWidget: WidgetState = {
      id: `widget-${Date.now()}`,
      isConfiguring: false,
      config: null,
      isLoading: false
    };
    setWidgets(prev => [...prev, newWidget]);
    setActiveWidgetId(newWidget.id);
    setIsChartSelectorOpen(true);
  };

  const handleChartTypeSelect = (chartType: string) => {
    if (!activeWidgetId) return;

    const newConfig: EnhancedChartConfiguration = {
      id: `chart-${Date.now()}`,
      name: `Untitled ${chartType} Chart`,
      chartType: chartType as any,
      selectedVariables: [],
      createdAt: new Date(),
      isSaved: false
    };

    setWidgets(prev => prev.map(widget => 
      widget.id === activeWidgetId 
        ? { ...widget, config: newConfig, isConfiguring: true }
        : widget
    ));
    setIsChartSelectorOpen(false);
  };

  const handleConfigurationComplete = (widgetId: string, config: EnhancedChartConfiguration) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, config, isConfiguring: false }
        : widget
    ));
  };

  const handleSaveWidget = (widgetId: string) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (widget?.config) {
      const savedConfig = { ...widget.config, isSaved: true };
      onSaveAnalysis(savedConfig);
      setWidgets(prev => prev.map(w => 
        w.id === widgetId 
          ? { ...w, config: savedConfig }
          : w
      ));
    }
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
    if (activeWidgetId === widgetId) {
      setActiveWidgetId(null);
    }
  };

  const handleEditWidget = (widgetId: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, isConfiguring: true }
        : widget
    ));
  };

  return (
    <div className="flex-1 bg-gray-50">
      <div className="h-full">
        <div className="h-full p-4 grid grid-cols-1 gap-4">
          {/* Widgets */}
          {widgets.map(widget => (
            <div key={widget.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {/* Widget Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-900 truncate">
                  {widget.config?.name || 'Untitled Chart'}
                </h3>
                <div className="flex items-center gap-2">
                  {widget.config && !widget.isConfiguring && (
                    <>
                      <button
                        onClick={() => handleEditWidget(widget.id)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                        title="Edit chart"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleSaveWidget(widget.id)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"
                        title="Save analysis"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDeleteWidget(widget.id)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600"
                    title="Delete widget"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Widget Content */}
              <div className="p-4">
                {widget.isConfiguring && widget.config ? (
                  <VariableConfig
                    config={widget.config}
                    onConfigChange={(newConfig: EnhancedChartConfiguration) => {
                      setWidgets(prev => prev.map(w => 
                        w.id === widget.id ? { ...w, config: newConfig } : w
                      ));
                    }}
                    onComplete={(finalConfig: EnhancedChartConfiguration) => handleConfigurationComplete(widget.id, finalConfig)}
                  />
                ) : widget.config ? (
                  <ChartRenderer 
                    config={widget.config}
                    height="300px"
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <span>Select chart type to configure</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Add New Widget Button */}
          {widgets.length === 0 && (
            <div 
              onClick={createNewWidget}
              className="h-full bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 cursor-pointer transition-colors group"
            >
              <div className="h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-blue-500">
                <Plus className="h-12 w-12 mb-3" />
                <span className="font-medium">Create New Chart</span>
                <span className="text-sm text-gray-400 mt-1">Click to add analysis</span>
              </div>
            </div>
          )}

          {/* Additional widgets for non-empty state */}
          {widgets.length > 0 && (
            <div 
              onClick={createNewWidget}
              className="bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 cursor-pointer transition-colors group min-h-[300px]"
            >
              <div className="h-full flex flex-col items-center justify-center text-gray-400 group-hover:text-blue-500 py-12">
                <Plus className="h-12 w-12 mb-3" />
                <span className="font-medium">Create New Chart</span>
                <span className="text-sm text-gray-400 mt-1">Click to add analysis</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Type Selection Modal */}
      <ChartTypeSelector
        isOpen={isChartSelectorOpen}
        onClose={() => setIsChartSelectorOpen(false)}
        onSelect={handleChartTypeSelect}
      />
    </div>
  );
} 