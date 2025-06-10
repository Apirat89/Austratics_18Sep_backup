'use client';

import React from 'react';
import { X, GitBranch } from 'lucide-react';

interface ChartTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (chartType: string) => void;
}

export default function ChartTypeSelector({ isOpen, onClose, onSelect }: ChartTypeSelectorProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleChartSelect = (chartType: string) => {
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
          className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Choose Chart Type</h3>
                <p className="text-sm text-gray-500 mt-1">Select scatter plot to explore variable relationships</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Chart type selection */}
          <div className="px-6 py-6">
            <button
              onClick={() => handleChartSelect('scatter')}
              className="w-full group p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {/* Chart type header */}
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <GitBranch className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-gray-900 group-hover:text-blue-900">
                    Scatter Plot
                  </h4>
                  <span className="text-sm text-gray-500">
                    Explore relationships between variables
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 mb-4">
                Plot SA2 regions as dots to explore relationships between two variables. 
                Includes median quadrants to identify regional patterns.
              </p>

              {/* Features */}
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-3" />
                  X and Y axis variable selection
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-3" />
                  Median quadrant lines
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-3" />
                  Interactive hover tooltips
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mr-3" />
                  SA2 region identification
                </div>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4">
            <div className="flex items-center text-sm text-gray-600">
              <span>After selecting scatter plot, you'll configure the X and Y axis variables</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 