import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface NewsPaginationProps {
  current: number;
  limit: number;
  total: number;
  onPageChange: (offset: number) => void;
}

export function NewsPagination({ current, limit, total, onPageChange }: NewsPaginationProps) {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(current / limit) + 1;
  
  const goToPage = (page: number) => {
    const newOffset = (page - 1) * limit;
    onPageChange(newOffset);
  };
  
  const goToPrevious = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };
  
  const goToNext = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };
  
  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 4) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 3) {
        pages.push('...');
      }
      
      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }
    
    return pages;
  };
  
  if (totalPages <= 1) {
    return null;
  }
  
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-gray-500">
        Showing {current + 1} to {Math.min(current + limit, total)} of {total} articles
      </div>
      
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <button
          onClick={goToPrevious}
          disabled={currentPage === 1}
          className={`
            flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${currentPage === 1
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
            }
          `}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        
        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <span className="px-3 py-2 text-gray-400">...</span>
              ) : (
                <button
                  onClick={() => goToPage(page as number)}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Next button */}
        <button
          onClick={goToNext}
          disabled={currentPage === totalPages}
          className={`
            flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${currentPage === totalPages
              ? 'text-gray-400 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
            }
          `}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
} 