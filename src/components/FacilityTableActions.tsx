import React, { useEffect, useState } from 'react';
import { FacilityData } from '../app/maps/page';

interface FacilityTableActionsProps {
  facility: FacilityData;
  userId?: string;
  isLoading?: boolean;
  onSaveFacility: (facility: FacilityData) => Promise<{ success: boolean; error?: string; isSaved?: boolean }>;
  onFacilityDetails: (facility: FacilityData) => void;
}

export const FacilityTableActions: React.FC<FacilityTableActionsProps> = React.memo(({ 
  facility, 
  userId, 
  isLoading, 
  onSaveFacility, 
  onFacilityDetails 
}) => {
  const [isSaved, setIsSaved] = useState<boolean | null>(null); // null = loading/unknown
  const [isOperating, setIsOperating] = useState(false);

  // Single initialization effect - only check saved state on mount
  useEffect(() => {
    const checkInitialSavedState = async () => {
      if (!userId) {
        setIsSaved(false);
        return;
      }
      
      try {
        const { isSearchSaved } = await import('../lib/savedSearches');
        const saved = await isSearchSaved(userId, facility.Service_Name);
        setIsSaved(saved);
      } catch (error) {
        console.error('Error checking saved state:', error);
        setIsSaved(false);
      }
    };

    checkInitialSavedState();
  }, [userId, facility.Service_Name]);

  // Optimistic save handler with immediate UI feedback
  const handleSave = async () => {
    if (isOperating || !userId) return;
    
    setIsOperating(true);
    
    // Optimistic update - update UI immediately
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);
    
    try {
      // Perform save operation
      const result = await onSaveFacility(facility);
      
      // If operation failed, revert optimistic update
      if (!result?.success) {
        setIsSaved(!newSavedState);
      }
      // If successful, keep optimistic state
    } catch (error) {
      console.error('Error saving facility:', error);
      // Revert optimistic update on error
      setIsSaved(!newSavedState);
    } finally {
      setIsOperating(false);
    }
  };

  const getSaveButtonText = () => {
    if (isOperating) return '⏳ Saving...';
    if (isSaved === null) return '⏳ Checking...';
    return isSaved ? '🗑️ Remove' : '📍 Save';
  };

  const getSaveButtonColor = () => {
    if (isOperating || isSaved === null) return 'bg-gray-400';
    return isSaved ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600';
  };

  return (
    <div className="flex gap-1 sm:gap-2">
      <button
        onClick={() => onFacilityDetails(facility)}
        disabled={isLoading}
        className="bg-blue-600 text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Details
      </button>
      {userId && (
        <button
          onClick={handleSave}
          disabled={isOperating || isLoading || isSaved === null}
          className={`${getSaveButtonColor()} text-white px-2 sm:px-3 py-1 rounded text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1`}
          title={isSaved ? 'Remove from saved locations' : 'Save to your locations'}
        >
          {(isOperating || isSaved === null) ? (
            <>
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="hidden sm:inline">
                {isOperating ? 'Saving...' : 'Checking...'}
              </span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">
                {getSaveButtonText()}
              </span>
              <span className="sm:hidden">
                {isSaved ? '🗑️' : '📍'}
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
});

FacilityTableActions.displayName = 'FacilityTableActions'; 