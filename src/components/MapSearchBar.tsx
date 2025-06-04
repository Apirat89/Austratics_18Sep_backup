'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, MapPin, Trash2, MoreHorizontal } from 'lucide-react';
import { getSearchSuggestions, saveSearchToHistory, getUserSearchHistory, clearUserSearchHistory, type SearchSuggestion } from '../lib/searchHistory';
import { searchLocations, getLocationByName } from '../lib/mapSearchService';

interface MapSearchBarProps {
  userId: string;
  onSearch: (searchTerm: string, navigation?: { 
    center: [number, number], 
    bounds?: [number, number, number, number],
    searchResult?: LocationResult
  }) => void;
  className?: string;
}

interface LocationResult {
  name: string;
  type: 'lga' | 'sa2' | 'sa3' | 'sa4' | 'postcode' | 'locality' | 'facility';
  code?: string;
  state?: string;
  center?: [number, number];
  bounds?: [number, number, number, number];
  // Facility-specific properties
  address?: string;
  careType?: string;
  facilityType?: 'residential' | 'home' | 'retirement';
}

export default function MapSearchBar({ userId, onSearch, className = "" }: MapSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSearchTerm, setLastSearchTerm] = useState(''); // Track the last successful search
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<SearchSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load suggestions when search query changes
  useEffect(() => {
    const loadSuggestions = async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        try {
          // Search locations from geojson data first - limit results for performance
          const locationResults = await searchLocations(searchQuery, 6);
          console.log('Search results for:', searchQuery, locationResults); // Debug log
          
          setLocationResults(locationResults.map(result => ({
            name: result.name,
            type: result.type,
            code: result.code,
            state: result.state,
            center: result.center,
            bounds: result.bounds
          })));

          // Only get default suggestions if no location results found
          if (locationResults.length === 0) {
            const defaultSuggestions = await getSearchSuggestions(userId, searchQuery);
            setSuggestions(defaultSuggestions);
          } else {
            // Clear default suggestions when we have location results
            setSuggestions([]);
          }
        } catch (error) {
          console.error('Error loading search suggestions:', error);
          setLocationResults([]);
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setLocationResults([]);
        setSuggestions([]);
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(loadSuggestions, 300); // Increased debounce for better performance
    return () => clearTimeout(timeoutId);
  }, [searchQuery, userId]);

  // Load recent searches when component mounts or when dropdown opens
  useEffect(() => {
    const loadRecentSearches = async () => {
      if (showDropdown && recentSearches.length === 0) {
        setIsLoading(true);
        try {
          const recent = await getUserSearchHistory(userId, 5);
          setRecentSearches(recent.map(item => ({
            id: item.id?.toString() || Math.random().toString(),
            text: item.search_term,
            type: 'history' as const
          })));
        } catch (error) {
          console.warn('Could not load recent searches:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadRecentSearches();
  }, [showDropdown, userId, recentSearches.length]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    console.log('Performing search for:', searchTerm); // Debug log

    try {
      // First try to get from current location results if they exist and match
      const exactMatch = locationResults.find(location => {
        const fullName = location.code ? `${location.name} (${location.code})` : location.name;
        const fullNameLower = fullName.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        return fullNameLower === searchLower || 
               fullNameLower.includes(searchLower) ||
               (location.name.toLowerCase() === searchLower) ||
               (location.code && location.code.toLowerCase() === searchLower);
      });

      if (exactMatch && exactMatch.center) {
        console.log('Found exact match in current results:', exactMatch);
        onSearch(searchTerm, {
          center: exactMatch.center,
          bounds: exactMatch.bounds,
          searchResult: exactMatch
        });
      } else {
        // Fallback to service search
        console.log('No exact match found, trying service search...');
        const locationResult = await getLocationByName(searchTerm);
        
        if (locationResult && locationResult.center) {
          console.log('Found location via service:', locationResult);
          // Found a specific location - call onSearch with location data
          onSearch(searchTerm, {
            center: locationResult.center,
            bounds: locationResult.bounds,
            searchResult: locationResult
          });
        } else {
          console.log('No location found, performing general search');
          // Fallback to general search
          onSearch(searchTerm);
        }
      }

      // Save to search history
      if (userId) {
        await saveSearchToHistory(userId, searchTerm);
        // Clear recent searches cache to force reload
        setRecentSearches([]);
      }

      // Clear the search input and close dropdown
      setSearchQuery('');
      setLastSearchTerm(searchTerm);
      setShowDropdown(false);
      inputRef.current?.blur();
    } catch (error) {
      console.error('Error performing search:', error);
      // Still perform basic search even if location lookup fails
      onSearch(searchTerm);
      // Clear the search input even on error
      setSearchQuery('');
      setLastSearchTerm(searchTerm);
    }
  };

  const handleLocationSelect = async (location: LocationResult) => {
    const displayName = location.code ? `${location.name} (${location.code})` : location.name;
    
    if (location.center) {
      onSearch(displayName, {
        center: location.center,
        bounds: location.bounds,
        searchResult: location
      });
    } else {
      onSearch(displayName);
    }

    // Save to search history
    if (userId) {
      await saveSearchToHistory(userId, displayName);
      setRecentSearches([]);
    }

    // Clear the search input and close dropdown
    setSearchQuery('');
    setLastSearchTerm(displayName);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    handleSearch(suggestion.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchQuery);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  const clearHistory = async () => {
    if (userId) {
      const success = await clearUserSearchHistory(userId);
      if (success) {
        setRecentSearches([]);
      }
    }
  };

  const getLocationTypeIcon = (type: string) => {
    switch (type) {
      case 'lga': return '🏛️';
      case 'postcode': return '📮';
      case 'locality': return '🏘️';
      case 'sa2': return '📍';
      case 'sa3': return '📍';
      case 'sa4': return '📍';
      case 'facility': return '🏥';
      default: return '📍';
    }
  };

  const getLocationTypeLabel = (type: string) => {
    switch (type) {
      case 'lga': return 'Local Government';
      case 'postcode': return 'Postcode';
      case 'locality': return 'Locality';
      case 'sa2': return 'SA2 Area';
      case 'sa3': return 'SA3 Area'; 
      case 'sa4': return 'SA4 Area';
      case 'facility': return 'Healthcare Facility';
      default: return 'Location';
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="flex items-center p-2">
          <Search className="h-5 w-5 text-gray-400 ml-2" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={lastSearchTerm ? `Last search: ${lastSearchTerm}` : "Search map"}
            className="flex-1 py-3 pr-4 border-none outline-none text-gray-700 placeholder-gray-500 bg-transparent"
          />
          {isSearching && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          )}
        </div>
        
        {/* Last Search Indicator */}
        {lastSearchTerm && !showDropdown && (
          <div className="px-4 pb-2 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="h-3 w-3" />
                <span className="font-medium">Currently showing:</span>
                <span className="text-blue-600">{lastSearchTerm}</span>
              </div>
              <button
                onClick={() => {
                  setLastSearchTerm('');
                  setSearchQuery('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Location Results */}
          {locationResults.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                Locations
              </div>
              <div className="max-h-48 overflow-y-auto">
                {locationResults.map((location, index) => (
                  <button
                    key={index}
                    onClick={() => handleLocationSelect(location)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-lg">{getLocationTypeIcon(location.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {location.name}
                        {location.code && location.code !== location.name && (
                          <span className="text-gray-500 ml-2">({location.code})</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {location.type === 'facility' ? (
                          <>
                            {location.careType}
                            {location.address && ` • ${location.address}`}
                          </>
                        ) : (
                          <>
                            {getLocationTypeLabel(location.type)}
                            {location.state && ` • ${location.state}`}
                          </>
                        )}
                      </div>
                    </div>
                    <MapPin className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Default Suggestions */}
          {suggestions.length > 0 && locationResults.length === 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                Suggestions
              </div>
              <div className="max-h-48 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
                  >
                    <Search className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {searchQuery.length === 0 && recentSearches.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b flex items-center justify-between">
                <span>Recent Searches</span>
                <button
                  onClick={clearHistory}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear history"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {recentSearches.map((search) => (
                  <button
                    key={search.id}
                    onClick={() => handleSearch(search.text)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
                  >
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-700">{search.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="px-4 py-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          )}

          {/* No Results */}
          {searchQuery.length >= 2 && !isSearching && locationResults.length === 0 && suggestions.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No locations found</p>
              <p className="text-xs text-gray-400 mt-1">Try searching for a city, postcode, area name, or healthcare facility</p>
            </div>
          )}

          {/* Empty State */}
          {searchQuery.length === 0 && recentSearches.length === 0 && !isLoading && (
            <div className="px-4 py-8 text-center">
              <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Start typing to search</p>
              <p className="text-xs text-gray-400 mt-1">Search for cities, postcodes, administrative areas, or healthcare facilities</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 