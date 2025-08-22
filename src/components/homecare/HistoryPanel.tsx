import React from 'react';
import { Clock, Trash2, Search, Scale, X, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { 
  HomecareSearchHistoryItem, 
  HomecareComparisonHistoryItem 
} from '@/types/homecare';

interface HomecareHistoryPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  searchHistory: HomecareSearchHistoryItem[];
  comparisonHistory: HomecareComparisonHistoryItem[];
  onSearchHistoryClick: (item: HomecareSearchHistoryItem) => void;
  onComparisonHistoryClick: (item: HomecareComparisonHistoryItem) => void;
  onDeleteSearchHistory: (itemId: string) => void;
  onDeleteComparisonHistory: (itemId: string) => void;
  onClearSearchHistory: () => void;
  onClearComparisonHistory: () => void;
}

export default function HomecareHistoryPanel({
  isVisible,
  onToggle,
  searchHistory,
  comparisonHistory,
  onSearchHistoryClick,
  onComparisonHistoryClick,
  onDeleteSearchHistory,
  onDeleteComparisonHistory,
  onClearSearchHistory,
  onClearComparisonHistory,
}: HomecareHistoryPanelProps) {
  if (!isVisible) {
    return (
      <div className="fixed left-0 top-0 h-full w-12 bg-white border-r border-gray-200 z-30 flex flex-col items-center py-4">
        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Show History Panel"
        >
          <History className="w-6 h-6 text-gray-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-0 h-full w-80 bg-white border-r border-gray-200 z-30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">History</h2>
          </div>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700 transition-colors"
            title="Hide History Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Recent Searches */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Recent Searches
            </h3>
            {searchHistory.length > 0 && (
              <button
                onClick={onClearSearchHistory}
                className="text-xs text-red-600 hover:text-red-800 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          
          {searchHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No search history yet</p>
          ) : (
            <div className="space-y-2">
              {searchHistory.map((item) => (
                <Card key={item.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => onSearchHistoryClick(item)}
                      >
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {item.search_term}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {new Date(item.searched_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {item.results_count} results
                        </div>
                        
                        {/* Applied Filters */}
                        {item.filters_applied && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.filters_applied.package_levels?.map((level) => (
                              <Badge key={level} variant="secondary" className="text-xs">
                                Level {level}
                              </Badge>
                            ))}
                            {item.filters_applied.organization_types?.map((type) => (
                              <Badge key={type} variant="secondary" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSearchHistory(item.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete search"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Comparisons */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Recent Comparisons
            </h3>
            {comparisonHistory.length > 0 && (
              <button
                onClick={onClearComparisonHistory}
                className="text-xs text-red-600 hover:text-red-800 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          
          {comparisonHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No comparison history yet</p>
          ) : (
            <div className="space-y-2">
              {comparisonHistory.map((item) => (
                <Card key={item.id} className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => onComparisonHistoryClick(item)}
                      >
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {item.comparison_name}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mb-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.compared_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-600">
                          {item.provider_names.length} providers compared
                        </div>
                        {item.comparison_notes && (
                          <div className="text-xs text-gray-600 mt-1 italic">
                            "{item.comparison_notes.substring(0, 50)}{item.comparison_notes.length > 50 ? '...' : ''}"
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteComparisonHistory(item.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete comparison"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 