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
        {/* Search History */}
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
              <p className="text-sm text-gray-500 italic">No recent searches</p>
            ) : (
              <div className="space-y-2">
                {searchHistory.map((search, index) => (
                  <div
                    key={index}
                    className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200"
                    onClick={() => onSearchSelect(search)}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-sm text-gray-700 truncate">{search}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comparison History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600" />
                Saved Comparisons
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
              <p className="text-sm text-gray-500 italic">No saved comparisons</p>
            ) : (
              <div className="space-y-3">
                {comparisonHistory.map((comparison, index) => (
                  <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {comparison.facilities?.length || 0} Facilities
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            {comparison.facilities?.slice(0, 2).map((facility: any, idx: number) => (
                              <div key={idx} className="truncate">
                                • {facility["Service Name"]}
                              </div>
                            ))}
                            {(comparison.facilities?.length || 0) > 2 && (
                              <div className="text-gray-400">
                                +{(comparison.facilities?.length || 0) - 2} more
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {comparison.createdAt ? new Date(comparison.createdAt).toLocaleDateString() : 'Unknown date'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => onComparisonSelect(comparison)}
                          className="p-1 hover:bg-blue-100 rounded text-blue-600 hover:text-blue-800"
                          title="View comparison"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-1">💡 Tips</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Click on recent searches to quickly repeat them</li>
              <li>• Save comparisons to review them later</li>
              <li>• History is stored in your browser</li>
            </ul>
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel; 