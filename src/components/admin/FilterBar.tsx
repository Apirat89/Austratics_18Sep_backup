'use client';

import React, { useState, useEffect } from 'react';
import { Search, Calendar, Filter, X, RotateCcw } from 'lucide-react';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange';
  options?: { value: string; label: string }[];
  placeholder?: string;
  value?: any;
}

export interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onReset?: () => void;
  loading?: boolean;
  showReset?: boolean;
  className?: string;
  searchPlaceholder?: string;
  compactMode?: boolean;
}

export default function FilterBar({
  filters,
  values,
  onFilterChange,
  onReset,
  loading = false,
  showReset = true,
  className = '',
  searchPlaceholder = 'Search...',
  compactMode = false
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Check if any filters have values (for showing reset button)
  const hasActiveFilters = Object.values(values).some(value => {
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) return value.length > 0;
    return value != null && value !== '';
  });

  // Separate search filter from others
  const searchFilter = filters.find(f => f.type === 'text' && f.key === 'search');
  const otherFilters = filters.filter(f => !(f.type === 'text' && f.key === 'search'));

  const renderFilter = (filter: FilterConfig) => {
    const value = values[filter.key] || '';

    switch (filter.type) {
      case 'text':
        return (
          <div key={filter.key} className="relative">
            {filter.key === 'search' && <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />}
            <input
              type="text"
              placeholder={filter.placeholder || searchPlaceholder}
              value={value}
              onChange={(e) => onFilterChange(filter.key, e.target.value)}
              className={`block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                filter.key === 'search' ? 'pl-10' : 'px-3'
              } py-2`}
              disabled={loading}
            />
          </div>
        );

      case 'select':
        return (
          <div key={filter.key} className="relative">
            <select
              value={value}
              onChange={(e) => onFilterChange(filter.key, e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2"
              disabled={loading}
            >
              <option value="">{filter.placeholder || `All ${filter.label}`}</option>
              {filter.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'date':
        return (
          <div key={filter.key} className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={value}
              onChange={(e) => onFilterChange(filter.key, e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pl-10 py-2"
              disabled={loading}
              placeholder={filter.placeholder}
            />
          </div>
        );

      case 'daterange':
        const [fromDate, toDate] = Array.isArray(value) ? value : ['', ''];
        return (
          <div key={filter.key} className="flex space-x-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => onFilterChange(filter.key, [e.target.value, toDate])}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pl-10 py-2"
                disabled={loading}
                placeholder="From date"
              />
            </div>
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => onFilterChange(filter.key, [fromDate, e.target.value])}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pl-10 py-2"
                disabled={loading}
                placeholder="To date"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (compactMode) {
    return (
      <div className={`bg-white border-b border-gray-200 px-4 py-3 ${className}`}>
        <div className="flex items-center space-x-4">
          {/* Search filter */}
          {searchFilter && (
            <div className="flex-1 max-w-sm">
              {renderFilter(searchFilter)}
            </div>
          )}

          {/* Quick select filters */}
          {otherFilters.filter(f => f.type === 'select').slice(0, 2).map((filter) => (
            <div key={filter.key} className="min-w-0 flex-shrink-0">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {filter.label}
              </label>
              {renderFilter(filter)}
            </div>
          ))}

          {/* Advanced toggle */}
          {otherFilters.length > 2 && (
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>
          )}

          {/* Reset button */}
          {showReset && hasActiveFilters && (
            <button
              onClick={onReset}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </button>
          )}
        </div>

        {/* Advanced filters */}
        {showAdvanced && otherFilters.length > 2 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherFilters.slice(2).map((filter) => (
                <div key={filter.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {filter.label}
                  </label>
                  {renderFilter(filter)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full mode
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        {showReset && hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={loading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filters.map((filter) => (
          <div key={filter.key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {filter.label}
            </label>
            {renderFilter(filter)}
          </div>
        ))}
      </div>

      {/* Active filters summary */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-gray-500">Active filters:</span>
            {Object.entries(values).map(([key, value]) => {
              if (!value || (typeof value === 'string' && value.trim() === '')) return null;
              
              const filter = filters.find(f => f.key === key);
              if (!filter) return null;

              let displayValue = value;
              if (filter.type === 'select' && filter.options) {
                const option = filter.options.find(o => o.value === value);
                displayValue = option?.label || value;
              } else if (filter.type === 'daterange' && Array.isArray(value)) {
                displayValue = `${value[0]} to ${value[1]}`;
              }

              return (
                <span
                  key={key}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {filter.label}: {displayValue}
                  <button
                    type="button"
                    onClick={() => onFilterChange(key, filter.type === 'daterange' ? ['', ''] : '')}
                    className="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
} 