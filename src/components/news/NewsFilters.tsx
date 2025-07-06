import React from 'react';
import { NewsSource } from '../../types/news';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Filter, X } from 'lucide-react';

interface NewsFiltersProps {
  filters: {
    source: string | null;
    limit: number;
    offset: number;
  };
  sources: NewsSource[];
  onFilterChange: (filters: {
    source?: string | null;
    limit?: number;
  }) => void;
}

export function NewsFilters({ filters, sources, onFilterChange }: NewsFiltersProps) {
  const handleSourceChange = (sourceId: string | null) => {
    onFilterChange({ source: sourceId });
  };

  const handleLimitChange = (limit: number) => {
    onFilterChange({ limit });
  };

  const clearFilters = () => {
    onFilterChange({ source: null });
  };

  const hasActiveFilters = filters.source;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
          >
            <X className="h-4 w-4" />
            Clear all
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Source Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Source
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSourceChange(null)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                !filters.source
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Sources
            </button>
            {sources.map(source => (
              <button
                key={source.id}
                onClick={() => handleSourceChange(source.id)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filters.source === source.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {source.name}
              </button>
            ))}
          </div>
        </div>



        {/* Items per page */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Articles per page
          </label>
          <div className="flex gap-2">
            {[10, 20, 50].map(limit => (
              <button
                key={limit}
                onClick={() => handleLimitChange(limit)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  filters.limit === limit
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {limit}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Active filters:</span>
            <div className="flex gap-1">
              {filters.source && (
                <Badge variant="secondary" className="text-xs">
                  Source: {sources.find(s => s.id === filters.source)?.name || filters.source}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
} 