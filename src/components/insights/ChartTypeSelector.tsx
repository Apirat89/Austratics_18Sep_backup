'use client';

import React from 'react';
import { X, BarChart3, GitBranch, Circle, PieChart, BarChart2, Map, Info, Target } from 'lucide-react';
import { CHART_TYPES } from './InsightsDataService';

interface ChartTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (chartType: string) => void;
}

const iconMap = {
  BarChart3,
  GitBranch,
  Circle,
  PieChart,
  BarChart2,
  Map,
  Target
};

export default function ChartTypeSelector({ isOpen, onClose, onSelect }: ChartTypeSelectorProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleChartSelect = (chartType: string) => {
    console.log('🎯 Chart type selected:', chartType);
    console.log('🎯 onSelect function:', onSelect);
    onSelect(chartType);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto" onClick={handleBackdropClick}>
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 -z-10" aria-hidden="true" />

        {/* Modal panel */}
        <div 
          className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Choose Chart Type</h3>
                <p className="text-sm text-gray-500 mt-1">Select the best visualization for your snapshot data analysis</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Chart type grid */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CHART_TYPES.map((chartType) => {
                const IconComponent = iconMap[chartType.icon as keyof typeof iconMap];
                
                return (
                  <button
                    key={chartType.type}
                    onClick={() => handleChartSelect(chartType.type)}
                    className="group p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {/* Chart type header */}
                    <div className="flex items-center mb-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <IconComponent className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-900">
                          {chartType.name}
                        </h4>
                        <span className="text-xs text-gray-500 capitalize">
                          {chartType.dataPattern}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-600 mb-3">
                      {chartType.description}
                    </p>

                    {/* Use cases */}
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <Info className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-700 mb-1">Best for:</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {chartType.useCases?.map((useCase, index) => (
                              <li key={index} className="flex items-center">
                                <span className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                                {useCase}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Requirements */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Requires: {chartType.requiredAxes.length === 1 
                          ? `1 ${chartType.requiredAxes[0]}`
                          : `${chartType.requiredAxes.length} variables`}
                        {chartType.optionalAxes.length > 0 && (
                          <span className="text-gray-400"> + optional grouping</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4">
            <div className="flex items-center text-sm text-gray-600">
              <Info className="h-4 w-4 mr-2" />
              <span>After selecting a chart type, you'll configure the specific variables to visualize</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 