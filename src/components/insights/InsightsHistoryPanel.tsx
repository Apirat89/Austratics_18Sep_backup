'use client';

import React, { useState } from 'react';
import { Search, History, Clock, Trash2, MapPin, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  InsightsSearchHistoryItem,
  deleteInsightsSearchHistoryItem,
  clearInsightsSearchHistory
} from '../../lib/insightsHistory';

interface InsightsHistoryPanelProps {
  searchHistory: InsightsSearchHistoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onHide?: () => void;
  onSearchSelect: (search: InsightsSearchHistoryItem) => void;
  onClearSearchHistory: () => void | Promise<void>;
  onDeleteSearchItem: (itemId: number) => void | Promise<void>;
  currentUser?: { id: string } | null;
}

const InsightsHistoryPanel: React.FC<InsightsHistoryPanelProps> = ({
  searchHistory,
  isOpen,
  onClose,
  onHide,
  onSearchSelect,
  onClearSearchHistory,
  onDeleteSearchItem,
  currentUser
}) => {

  const handleClearSearchHistory = () => {
    if (confirm('Are you sure you want to clear all search history? This action cannot be undone.')) {
      onClearSearchHistory();
    }
  };

  const handleDeleteSearchItem = (e: React.MouseEvent, itemId: number) => {
    e.stopPropagation();
    onDeleteSearchItem(itemId);
  };

  const getLocationTypeIcon = (type?: string) => {
    switch (type) {
      case 'sa2': return '📍';
      case 'sa3': return '🗺️';
      case 'sa4': return '🌏';
      case 'lga': return '🏛️';
      case 'postcode': return '📮';
      case 'locality': return '🏘️';
      default: return '📍';
    }
  };

  const getLocationTypeColor = (type?: string) => {
    const colorMap: Record<string, string> = {
      'sa2': 'bg-blue-100 text-blue-800 border-blue-200',
      'sa3': 'bg-green-100 text-green-800 border-green-200',
      'sa4': 'bg-purple-100 text-purple-800 border-purple-200',
      'lga': 'bg-orange-100 text-orange-800 border-orange-200',
      'postcode': 'bg-red-100 text-red-800 border-red-200',
      'locality': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'other': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colorMap[type || 'other'] || colorMap['other'];
  };

  if (!isOpen) return null;

  return (
    <div className="min-h-full bg-white flex flex-col">
      {/* Content - Single tab for search history only */}
      <div className="flex-1 p-4">
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-600" />
              Recent Searches
            </h3>
            {searchHistory.length > 0 && (
              <button
                onClick={handleClearSearchHistory}
                className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>
            
          {searchHistory.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-2">No recent searches</p>
              <p className="text-xs text-gray-400">Search SA2 regions to see them here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchHistory.map((search, index) => {
                // Normalize ID for key - always a string
                const rowKey = (search.id ?? index).toString();
                
                return (
                  <div
                    key={rowKey}
                    className="w-full p-3 bg-blue-50 rounded-lg hover:bg-blue-100 cursor-pointer transition-colors border border-blue-200"
                    onClick={() => onSearchSelect(search)}
                  >
                    <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
                      <div className="flex items-center mt-0.5">
                        {search.selected_location_type ? (
                          <span className="text-lg">{getLocationTypeIcon(search.selected_location_type)}</span>
                        ) : (
                          <Search className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 leading-relaxed font-medium truncate">
                          {search.search_term}
                        </p>
                        
                        {search.selected_location_name && (
                          <p className="text-xs text-gray-600 truncate mt-1">
                            Selected: {search.selected_location_name}
                          </p>
                        )}
                        
                        {search.sa2_name && (
                          <p className="text-xs text-green-700 truncate mt-1 font-medium">
                            ✅ SA2: {search.sa2_name}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {search.created_at ? new Date(search.created_at).toLocaleDateString() : 'Recently searched'}
                          </span>
                          
                          {search.results_count !== undefined && search.results_count > 0 && (
                            <Badge variant="outline" className="text-xs bg-white">
                              {search.results_count} results
                            </Badge>
                          )}
                          
                          {search.selected_location_type && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getLocationTypeColor(search.selected_location_type)}`}
                            >
                              {search.selected_location_type.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Delete Icon */}
                        {search.id && (
                          <button
                            onClick={(e) => handleDeleteSearchItem(e, search.id!)}
                            className="text-gray-400 hover:text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors"
                            title="Delete this search"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200">
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-1">💡 Tips</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Search history is kept for 30 days</li>
            <li>• Click any search to re-run it</li>
            <li>• Green checkmark shows SA2 analytics were viewed</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default InsightsHistoryPanel; 