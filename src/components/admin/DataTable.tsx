'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check, Download } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  accessor: (item: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  className?: string;
  width?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  sortable?: boolean;
  selectable?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (items: T[]) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onExport?: (format: 'csv' | 'json') => void;
  emptyMessage?: string;
  className?: string;
  getRowId?: (item: T, index: number) => string;
  onRowClick?: (item: T) => void;
}

export default function DataTable<T>({
  data,
  columns,
  loading = false,
  pagination,
  onPageChange,
  onPageSizeChange,
  sortable = true,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  onSort,
  onExport,
  emptyMessage = 'No data available',
  className = '',
  getRowId = (item: T, index: number) => index.toString(),
  onRowClick
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Handle sorting
  const handleSort = (column: Column<T>) => {
    if (!column.sortable && !sortable) return;
    
    const newDirection = sortColumn === column.key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column.key);
    setSortDirection(newDirection);
    
    if (onSort) {
      onSort(column.key, newDirection);
    }
  };

  // Handle row selection
  const handleRowSelect = (item: T, index: number) => {
    if (!selectable || !onSelectionChange) return;
    
    const itemId = getRowId(item, index);
    const isSelected = selectedItems.some((selected, selectedIndex) => getRowId(selected, selectedIndex) === itemId);
    
    if (isSelected) {
      onSelectionChange(selectedItems.filter((selected, selectedIndex) => getRowId(selected, selectedIndex) !== itemId));
    } else {
      onSelectionChange([...selectedItems, item]);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (!selectable || !onSelectionChange) return;
    
    const allSelected = data.length > 0 && selectedItems.length === data.length;
    onSelectionChange(allSelected ? [] : [...data]);
  };

  // Check if all items are selected
  const allSelected = data.length > 0 && selectedItems.length === data.length;
  const someSelected = selectedItems.length > 0 && selectedItems.length < data.length;

  // Generate page numbers for pagination
  const generatePageNumbers = () => {
    if (!pagination) return [];
    
    const { page, totalPages } = pagination;
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (page > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (page < totalPages - 2) {
        pages.push('...');
      }
      
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const pageNumbers = generatePageNumbers();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header with actions */}
      {(selectable || onExport) && (
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {selectable && selectedItems.length > 0 && (
              <span className="text-sm text-gray-700">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {onExport && (
              <div className="flex space-x-1">
                                 <button
                   onClick={() => onExport('csv')}
                   className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                 >
                   <Download className="h-4 w-4 mr-1" />
                   CSV
                 </button>
                 <button
                   onClick={() => onExport('json')}
                   className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                 >
                   <Download className="h-4 w-4 mr-1" />
                   JSON
                 </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="w-12 px-6 py-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </th>
              )}
              
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.className || ''
                  } ${(column.sortable !== false && sortable) ? 'cursor-pointer hover:text-gray-700' : ''}`}
                  style={{ width: column.width }}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                                         {(column.sortable !== false && sortable) && (
                       <div className="flex flex-col">
                         <ChevronUp
                           className={`h-3 w-3 ${
                             sortColumn === column.key && sortDirection === 'asc'
                               ? 'text-blue-600'
                               : 'text-gray-400'
                           }`}
                         />
                         <ChevronDown
                           className={`h-3 w-3 -mt-1 ${
                             sortColumn === column.key && sortDirection === 'desc'
                               ? 'text-blue-600'
                               : 'text-gray-400'
                           }`}
                         />
                       </div>
                     )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
                             data.map((item, index) => {
                 const itemId = getRowId(item, index);
                 const isSelected = selectedItems.some((selected, selectedIndex) => getRowId(selected, selectedIndex) === itemId);
                 
                 return (
                   <tr
                     key={itemId}
                     className={`hover:bg-gray-50 ${
                       isSelected ? 'bg-blue-50' : ''
                     } ${onRowClick ? 'cursor-pointer' : ''}`}
                     onClick={() => onRowClick && onRowClick(item)}
                   >
                     {selectable && (
                       <td className="w-12 px-6 py-4">
                         <div className="flex items-center">
                           <input
                             type="checkbox"
                             checked={isSelected}
                             onChange={() => handleRowSelect(item, index)}
                             onClick={(e) => e.stopPropagation()}
                             className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                           />
                         </div>
                       </td>
                     )}
                    
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${
                          column.className || ''
                        }`}
                      >
                        {column.accessor(item)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Showing {Math.min((pagination.page - 1) * pagination.pageSize + 1, pagination.total)} to{' '}
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} results
            </span>
            
            {onPageSizeChange && (
              <div className="flex items-center space-x-2 ml-4">
                <label className="text-sm text-gray-700">Show:</label>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
                  className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
                         <button
               onClick={() => onPageChange && onPageChange(pagination.page - 1)}
               disabled={pagination.page <= 1}
               className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <ChevronLeft className="h-4 w-4" />
             </button>
            
            {pageNumbers.map((page, index) => (
              <button
                key={index}
                onClick={() => typeof page === 'number' && onPageChange && onPageChange(page)}
                disabled={typeof page !== 'number'}
                className={`inline-flex items-center px-3 py-1 text-sm font-medium border rounded-md ${
                  page === pagination.page
                    ? 'text-blue-600 bg-blue-50 border-blue-300'
                    : typeof page === 'number'
                    ? 'text-gray-500 bg-white border-gray-300 hover:bg-gray-50'
                    : 'text-gray-400 bg-white border-gray-300 cursor-default'
                }`}
              >
                {page}
              </button>
            ))}
            
                         <button
               onClick={() => onPageChange && onPageChange(pagination.page + 1)}
               disabled={pagination.page >= pagination.totalPages}
               className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <ChevronRight className="h-4 w-4" />
             </button>
          </div>
        </div>
      )}
    </div>
  );
} 