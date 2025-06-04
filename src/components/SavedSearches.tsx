'use client';

import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Bookmark, ChevronDown, ChevronUp, MapPin, Trash2, MoreHorizontal, Building, Home, Mail } from 'lucide-react';
import { 
  getUserSavedSearches, 
  deleteSavedSearch, 
  clearUserSavedSearches,
  type SavedSearchItem,
  type LocationData 
} from '../lib/savedSearches';
import { DropdownPortal } from './DropdownPortal';

interface SavedSearchesProps {
  userId: string;
  onSearchSelect: (searchTerm: string, navigation?: { 
    center: [number, number], 
    bounds?: [number, number, number, number],
    searchResult?: LocationData
  }) => void;
  onSavedSearchesChanged?: () => void;
  className?: string;
}

export interface SavedSearchesRef {
  refreshSavedSearches: () => void;
}

const SavedSearches = forwardRef<SavedSearchesRef, SavedSearchesProps>(
  ({ userId, onSearchSelect, onSavedSearchesChanged, className = '' }, ref) => {
    const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showDropdown, setShowDropdown] = useState<number | null>(null);
    const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
    const [dropdownPos, setDropdownPos] = useState<{x: number; y: number}>({x: 0, y: 0});
    const [clearAllButtonPos, setClearAllButtonPos] = useState({ x: 0, y: 0 });

    const getLocationTypeIcon = (locationData?: LocationData) => {
      if (!locationData?.type) return MapPin;
      
      switch (locationData.type) {
        case 'facility':
          return locationData.facilityType === 'residential' ? Building : 
                 locationData.facilityType === 'home' ? Home : 
                 locationData.facilityType === 'retirement' ? Mail : Building;
        default:
          return MapPin;
      }
    };

    const getLocationTypeColor = (locationData?: LocationData) => {
      if (!locationData?.type) return 'text-blue-500';
      
      switch (locationData.type) {
        case 'facility':
          return locationData.facilityType === 'residential' ? 'text-green-500' :
                 locationData.facilityType === 'home' ? 'text-purple-500' :
                 locationData.facilityType === 'retirement' ? 'text-orange-500' : 'text-blue-500';
        default:
          return 'text-blue-500';
      }
    };

    const loadSavedSearches = async () => {
      try {
        setIsLoading(true);
        const response = await getUserSavedSearches(userId);
        setSavedSearches(response.searches);
      } catch (error) {
        console.error('Error loading saved searches:', error);
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      if (userId) {
        loadSavedSearches();
      }
    }, [userId]);

    useImperativeHandle(ref, () => ({
      refreshSavedSearches: loadSavedSearches
    }));

    const handleThreeDotsClick = (searchId: number, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      
      console.log('🎯 Three dots clicked for search ID:', searchId);
      
      // Calculate position for portal dropdown
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setDropdownPos({ x: rect.right, y: rect.bottom });
      
      if (showDropdown === searchId) {
        setShowDropdown(null);
        return;
      }

      setShowDropdown(searchId);
    };

    const handleDeleteSearch = async (searchId: number) => {
      console.log('🗑️ Deleting search with ID:', searchId);
      
      // Find the search that's being deleted to check if we need to clear the search bar
      const searchToDelete = savedSearches.find(search => search.id === searchId);
      
      try {
        const result = await deleteSavedSearch(userId, searchId);
        
        if (result.success) {
          // Remove from local state
          setSavedSearches(prev => prev.filter(search => search.id !== searchId));
          setShowDropdown(null);
          
          // Check if the deleted search matches what's currently showing in search bar
          // If so, pass the search term to the callback so it can be cleared
          const deletedSearchTerm = searchToDelete?.search_display_name || searchToDelete?.search_term;
          
          // Notify parent component of changes, including the deleted search term
          onSavedSearchesChanged?.();
          
          // If this deleted search is currently being shown, we should clear it
          // We'll handle this by passing additional info to the parent
          if (deletedSearchTerm) {
            // Call a special callback to handle clearing if the deleted item is currently shown
            setTimeout(() => {
              // Trigger a custom event that the parent can listen to
              window.dispatchEvent(new CustomEvent('savedSearchDeleted', { 
                detail: { deletedSearchTerm } 
              }));
            }, 0);
          }
          
          console.log('✅ Search deleted successfully');
        } else {
          console.error('❌ Failed to delete search:', result.error);
          alert('Failed to delete search: ' + result.error);
        }
      } catch (error) {
        console.error('❌ Error deleting search:', error);
        alert('An error occurred while deleting the search');
      }
    };

    const handleClearAll = async () => {
      console.log('🗑️ Clear all clicked');
      
      try {
        const result = await clearUserSavedSearches(userId);
        
        if (result.success) {
          setSavedSearches([]);
          setShowClearAllConfirm(false);
          
          // Notify parent component of changes
          onSavedSearchesChanged?.();
          
          // Also clear the search bar since all searches are deleted
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('allSavedSearchesCleared'));
          }, 0);
          
          console.log('✅ All searches cleared successfully');
        } else {
          console.error('❌ Failed to clear searches:', result.error);
          alert('Failed to clear searches: ' + result.error);
        }
      } catch (error) {
        console.error('❌ Error clearing searches:', error);
        alert('An error occurred while clearing searches');
      }
    };

    const handleClearAllClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('🎯 Clear all button clicked, showing confirmation');
      
      const buttonRect = e.currentTarget.getBoundingClientRect();
      setClearAllButtonPos({
        x: buttonRect.left,
        y: buttonRect.bottom + 4
      });
      setShowClearAllConfirm(true);
    };

    const handleSearchClick = async (search: SavedSearchItem) => {
      console.log('🔍 Search clicked:', {
        searchTerm: search.search_term,
        displayName: search.search_display_name,
        willPass: search.search_display_name || search.search_term,
        locationData: search.location_data,
        hasCenter: !!search.location_data?.center,
        center: search.location_data?.center,
        bounds: search.location_data?.bounds
      });
      
      let navigation = search.location_data?.center ? {
        center: search.location_data.center as [number, number],
        bounds: search.location_data.bounds as [number, number, number, number] | undefined,
        searchResult: search.location_data
      } : undefined;

      console.log('🧭 Navigation object created:', navigation);

      // If no location data, try to look it up dynamically
      if (!navigation) {
        console.log('🔍 No location data found, attempting dynamic lookup for:', search.search_term);
        try {
          // Dynamic import to avoid circular dependencies
          const { getLocationByName } = await import('../lib/mapSearchService');
          const locationResult = await getLocationByName(search.search_term);
          
          if (locationResult && locationResult.center) {
            console.log('✅ Found location data for:', search.search_term, locationResult);
            navigation = {
              center: locationResult.center,
              bounds: locationResult.bounds,
              searchResult: locationResult
            };
          } else {
            console.log('⚠️ Could not find location data for:', search.search_term);
          }
        } catch (error) {
          console.error('❌ Error looking up location:', error);
        }
      }

      // Pass the display name (what the user sees) rather than the internal search term
      // This ensures consistency between what's clicked and what's shown in the search bar
      const termToPass = search.search_display_name || search.search_term;
      console.log('🚀 Calling onSearchSelect with term:', termToPass, 'and navigation:', navigation);
      onSearchSelect(termToPass, navigation);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (showDropdown !== null) {
          setShowDropdown(null);
        }
        if (showClearAllConfirm) {
          setShowClearAllConfirm(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showDropdown, showClearAllConfirm]);

    if (!userId) {
      return null;
    }

    return (
      <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-medium text-gray-900">Saved Locations</h3>
              <span className="text-xs text-gray-500">({savedSearches.length})</span>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4" style={{ overflow: 'visible' }}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : savedSearches.length === 0 ? (
              <div className="text-center py-8">
                <Bookmark className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No saved locations yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Search for locations and save them for quick access
                </p>
              </div>
            ) : (
              <div className="pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {savedSearches.length} saved
                  </span>
                  {savedSearches.length > 0 && (
                    <button
                      onClick={handleClearAllClick}
                      className="text-xs text-gray-400 hover:text-red-600 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-1" style={{ overflowX: 'visible' }}>
                  {savedSearches.map((search) => {
                    const Icon = getLocationTypeIcon(search.location_data);
                    const iconColor = getLocationTypeColor(search.location_data);
                    
                    return (
                      <div key={search.id} className="relative" style={{ overflow: 'visible' }}>
                        <div className="flex items-center hover:bg-gray-50 rounded transition-colors group">
                          <div 
                            className="flex items-center gap-3 flex-1 py-2 px-3 cursor-pointer min-w-0 pr-8"
                            onClick={() => handleSearchClick(search)}
                          >
                            <Icon className={`h-4 w-4 ${iconColor} flex-shrink-0`} />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {search.search_display_name || search.search_term}
                              </div>
                              {search.search_display_name && search.search_term !== search.search_display_name && (
                                <div className="text-xs text-gray-500 truncate">
                                  {search.search_term}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="relative flex-shrink-0" style={{ overflow: 'visible' }}>
                            <button
                              onClick={(e) => {
                                console.log('🎯 Three dots clicked for search ID:', search.id);
                                handleThreeDotsClick(search.id ?? 0, e);
                              }}
                              className={`p-1 mr-2 hover:bg-gray-200 rounded transition-all ${
                                showDropdown === search.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              <MoreHorizontal className="h-3 w-3 text-gray-400" />
                            </button>

                            {showDropdown === search.id && (
                              <DropdownPortal>
                                <div
                                  style={{
                                    position: 'fixed',
                                    top: dropdownPos.y,
                                    left: dropdownPos.x,
                                    zIndex: 9999,
                                  }}
                                  className="bg-white border border-gray-200 rounded-lg shadow-lg min-w-32"
                                  onClick={(e) => {
                                    console.log('🎯 Portal dropdown clicked');
                                    e.stopPropagation();
                                  }}
                                >
                                  <button
                                    onClickCapture={(e) => {
                                      console.log('🔘 Delete button clicked, search ID:', search.id);
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (search.id !== undefined) {
                                        handleDeleteSearch(search.id);
                                      }
                                    }}
                                    onClick={(e) => {
                                      console.log('🔘 Delete button onClick, search ID:', search.id);
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    onMouseDown={(e) => {
                                      console.log('🔘 Delete button mouse down, search ID:', search.id);
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </button>
                                </div>
                              </DropdownPortal>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {showClearAllConfirm && (
          <DropdownPortal>
            <div
              style={{
                position: 'fixed',
                top: clearAllButtonPos.y,
                left: clearAllButtonPos.x,
                zIndex: 9999,
              }}
              className="bg-white border border-gray-200 rounded-lg shadow-lg min-w-48"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3">
                <p className="text-sm text-gray-900 mb-3">
                  Clear all {savedSearches.length} saved searches?
                </p>
                <div className="flex gap-2">
                  <button
                    onClickCapture={(e) => {
                      console.log('🎯 Clear all confirmation button clicked (capture)');
                      e.preventDefault();
                      e.stopPropagation();
                      handleClearAll();
                    }}
                    onClick={(e) => {
                      console.log('🎯 Clear all confirmation button clicked (click)');
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      console.log('🎯 Clear all confirmation button mouse down');
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="flex-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors rounded border border-red-200"
                  >
                    Clear all
                  </button>
                  <button
                    onClickCapture={(e) => {
                      console.log('🎯 Cancel button clicked (capture)');
                      e.preventDefault();
                      e.stopPropagation();
                      setShowClearAllConfirm(false);
                    }}
                    onClick={(e) => {
                      console.log('🎯 Cancel button clicked (click)');
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors rounded border border-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </DropdownPortal>
        )}
      </div>
    );
  }
);

SavedSearches.displayName = 'SavedSearches';

export default SavedSearches; 