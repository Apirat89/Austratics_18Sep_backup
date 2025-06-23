'use client';

import React from 'react';
import { Search, History, Scale, Clock, X, Eye, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HistoryPanelProps {
  searchHistory: string[];
  comparisonHistory: any[]; // TODO: Define proper type
  isOpen: boolean;
  onClose: () => void;
  onHide?: () => void;
  onSearchSelect: (searchTerm: string) => void;
  onComparisonSelect: (comparison: any) => void;
  onClearSearchHistory: () => void;
  onClearComparisonHistory: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  searchHistory,
  comparisonHistory,
  isOpen,
  onClose,
  onHide,
  onSearchSelect,
  onComparisonSelect,
  onClearSearchHistory,
  onClearComparisonHistory,
}) => {
  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          History
        </h2>
        {onHide && (
          <button
            onClick={onHide}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-gray-700"
          >
            Hide
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Recent Searches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-green-600" />
              Recent Searches
            </h3>
            {searchHistory.length > 0 && (
              <button
                onClick={onClearSearchHistory}
                className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
            
          {searchHistory.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-2">No recent searches</p>
              <p className="text-xs text-gray-400">Search for facilities and click "View Details" to see them here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchHistory.map((search, index) => (
                <div
                  key={index}
                  className="p-3 bg-green-50 rounded-lg hover:bg-green-100 cursor-pointer transition-colors border border-green-200"
                  onClick={() => onSearchSelect(search)}
                >
                  <div className="flex items-start gap-2">
                    <Search className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 leading-relaxed break-words">
                        {search}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">Recently searched</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Comparisons */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-600" />
              Recent Comparisons
            </h3>
            {comparisonHistory.length > 0 && (
              <button
                onClick={onClearComparisonHistory}
                className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
            
            {comparisonHistory.length === 0 ? (
              <div className="text-center py-8">
                <Scale className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-2">No recent comparisons</p>
                <p className="text-xs text-gray-400">Select facilities and click "View Comparison" to see them here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {comparisonHistory.map((comparisonName, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
                    onClick={() => onComparisonSelect(comparisonName)}
                  >
                    <div className="flex items-start gap-2">
                      <Scale className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 leading-relaxed break-words">
                          {comparisonName}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">Recently viewed</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-1">💡 Tips</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Click "View Details" on search results to save to recent searches</li>
              <li>• Select facilities with checkboxes for comparison</li>
              <li>• Click "View Comparison" to save to recent comparisons</li>
              <li>• History is stored in your browser</li>
            </ul>
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel; 