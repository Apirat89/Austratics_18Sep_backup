'use client';

import React, { useState, useCallback } from 'react';
import { Plus, Edit3, Download, Trash2 } from 'lucide-react';
import ChartTypeSelector from './ChartTypeSelector';
import ScatterPlotConfig from './ScatterPlotConfig';
import QuadrantScatterPlot from './QuadrantScatterPlot';

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

interface WidgetState {
  id: string;
  isConfiguring: boolean;
  config: ChartConfiguration | null;
  isLoading: boolean;
}

interface DashboardCanvasProps {
  healthcareData: any[];
  demographicsData: any[];
  economicsData: any[];
  healthStatsData: any[];
  availableVariables: {
    healthcare: string[];
    demographics: string[];
    economics: string[];
    healthStats: string[];
  };
  medianCalculations: {
    healthcare: any[];
    demographics: any[];
    economics: any[];
    healthStats: any[];
  } | null;
}

export default function DashboardCanvas({ 
  healthcareData,
  demographicsData,
  economicsData,
  healthStatsData,
  availableVariables,
  medianCalculations
}: DashboardCanvasProps) {
  const [widgets, setWidgets] = useState<WidgetState[]>([]);
  const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
  const [isChartSelectorOpen, setIsChartSelectorOpen] = useState(false);

  const createNewWidget = useCallback(() => {
    const newWidget: WidgetState = {
      id: `widget-${Date.now()}`,
      isConfiguring: false,
      config: null,
      isLoading: false
    };
    setWidgets(prev => [...prev, newWidget]);
    setActiveWidgetId(newWidget.id);
    setIsChartSelectorOpen(true);
  }, []);

  const handleChartTypeSelect = useCallback((chartType: string) => {
    if (!activeWidgetId || chartType !== 'scatter') return;

    const newConfig: ChartConfiguration = {
      id: `chart-${Date.now()}`,
      name: 'Untitled Scatter Plot',
      chartType: 'scatter',
      dataset: 'healthcare',
      xAxis: '',
      yAxis: '',
      colorPalette: 'default',
      createdAt: new Date()
    };

    setWidgets(prev => prev.map(widget => 
      widget.id === activeWidgetId 
        ? { ...widget, config: newConfig, isConfiguring: true }
        : widget
    ));
    setIsChartSelectorOpen(false);
  }, [activeWidgetId]);

  const handleConfigurationComplete = useCallback((widgetId: string, config: ChartConfiguration) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, config, isConfiguring: false }
        : widget
    ));
  }, []);

  const handleDeleteWidget = useCallback((widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
    if (activeWidgetId === widgetId) {
      setActiveWidgetId(null);
    }
  }, [activeWidgetId]);

  const handleEditWidget = useCallback((widgetId: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, isConfiguring: true }
        : widget
    ));
  }, []);

  const getDatasetByName = useCallback((name: string) => {
    switch (name) {
      case 'healthcare': return healthcareData;
      case 'demographics': return demographicsData;
      case 'economics': return economicsData;
      case 'healthStats': return healthStatsData;
      default: return [];
    }
  }, [healthcareData, demographicsData, economicsData, healthStatsData]);

  const handleConfigChange = useCallback((widgetId: string) => {
    return (newConfig: ChartConfiguration) => {
      setWidgets(prev => prev.map(w => 
        w.id === widgetId ? { ...w, config: newConfig } : w
      ));
    };
  }, []);

  return (
    <div className="flex-1 bg-gray-50">
      <div className="h-full">
        <div className="h-full p-4">
          {/* Empty State */}
          {widgets.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                  <Plus className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Create Your First Chart
                </h3>
                <p className="text-gray-600 mb-6">
                  Start building interactive scatter plots to explore relationships between variables across SA2 regions.
                </p>
                <button
                  onClick={createNewWidget}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Widget
                </button>
              </div>
            </div>
          )}

          {/* Widgets Grid */}
          {widgets.length > 0 && (
            <div className="space-y-6">
              {/* Add Widget Button */}
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
                <button
                  onClick={createNewWidget}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Widget
                </button>
              </div>

              {/* Widgets */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {widgets.map(widget => (
                  <div key={widget.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    {/* Widget Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                      <h3 className="font-medium text-gray-900 truncate">
                        {widget.config?.name || 'Untitled Chart'}
                      </h3>
                      <div className="flex items-center gap-2">
                        {widget.config && !widget.isConfiguring && (
                          <button
                            onClick={() => handleEditWidget(widget.id)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                            title="Edit chart"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
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
                        <ScatterPlotConfig
                          config={widget.config}
                          availableVariables={availableVariables}
                          onConfigChange={handleConfigChange(widget.id)}
                          onComplete={(finalConfig) => handleConfigurationComplete(widget.id, finalConfig)}
                        />
                      ) : widget.config && widget.config.xAxis && widget.config.yAxis ? (
                        <QuadrantScatterPlot
                          config={widget.config}
                          data={getDatasetByName(widget.config.dataset)}
                          medianCalculations={medianCalculations}
                        />
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-400">
                          <span>Configure chart to display visualization</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Type Selector Modal */}
      <ChartTypeSelector
        isOpen={isChartSelectorOpen}
        onClose={() => setIsChartSelectorOpen(false)}
        onSelect={handleChartTypeSelect}
      />
    </div>
  );
} 