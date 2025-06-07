'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import BackToMainButton from '../../components/BackToMainButton';
import AustralianMap, { AustralianMapRef } from '../../components/AustralianMap';
import MapSearchBar from '../../components/MapSearchBar';
import MapSettings from '../../components/MapSettings';
import DataLayers from '../../components/DataLayers';
import ActiveLayers from '../../components/ActiveLayers';
import SavedSearches, { SavedSearchesRef } from '../../components/SavedSearches';
import TopBottomPanel from '../../components/TopBottomPanel';
import { RankedSA2Data } from '../../components/HeatmapDataService';
import { getLocationByName } from '../../lib/mapSearchService';
import { Map, Settings, User, Menu } from 'lucide-react';
import MapLoadingCoordinator from '../../components/MapLoadingCoordinator';

interface UserData {
  email: string;
  name: string;
  id: string;
}

interface FacilityTypes {
  residential: boolean;
  home: boolean;
  retirement: boolean;
}

type GeoLayerType = 'sa2' | 'sa3' | 'sa4' | 'lga' | 'postcode' | 'locality';
type MapStyleType = 'basic' | 'topo' | 'satellite' | 'terrain' | 'streets';

export default function MapsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Facility types state (keeping for backwards compatibility)
  const [facilityTypes, setFacilityTypes] = useState<FacilityTypes>({
    residential: true,
    home: true,
    retirement: true
  });
  const [selectedGeoLayer, setSelectedGeoLayer] = useState<GeoLayerType>('sa2');
  const [selectedMapStyle, setSelectedMapStyle] = useState<MapStyleType>('basic');
  
  // Track highlighted features from the map
  const [highlightedFeature, setHighlightedFeature] = useState<string | null>(null);
  const [highlightedFeatureName, setHighlightedFeatureName] = useState<string | null>(null);
  
  // Map navigation state
  const [mapNavigation, setMapNavigation] = useState<{
    center?: [number, number];
    bounds?: [number, number, number, number];
    zoom?: number;
    searchResult?: any;
  } | null>(null);
  
  // Track the currently showing search
  const [currentlyShowing, setCurrentlyShowing] = useState<string>('');
  
  // Track preload state from map
  const [preloadingData, setPreloadingData] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState({ current: 0, total: 0 });
  const [stylesPreloaded, setStylesPreloaded] = useState(false);
  const [stylePreloadProgress, setStylePreloadProgress] = useState({ current: 0, total: 5 });
  
  // Heatmap state with default selection (data preloaded but UI starts minimal)
  const [heatmapVisible, setHeatmapVisible] = useState(true); // Default to visible
  const [heatmapDataType, setHeatmapDataType] = useState<'healthcare' | 'demographics'>('healthcare'); // Default to healthcare
  const [heatmapCategory, setHeatmapCategory] = useState<string>('Commonwealth Home Support Program');
  const [heatmapSubcategory, setHeatmapSubcategory] = useState<string>('Number of Participants');
  const [selectedVariableName, setSelectedVariableName] = useState<string>('Commonwealth Home Support Program - Number of Participants');
  const [heatmapMinValue, setHeatmapMinValue] = useState<number | undefined>(undefined);
  const [heatmapMaxValue, setHeatmapMaxValue] = useState<number | undefined>(undefined);
  
  // Top/Bottom Panel state
  const [rankedData, setRankedData] = useState<RankedSA2Data | null>(null);
  const [topBottomPanelVisible, setTopBottomPanelVisible] = useState(false);
  
  // Data Layers state
  const [dataLayersExpanded, setDataLayersExpanded] = useState(false);
  
  // Flag to control when map highlights should update the search bar
  const shouldUpdateSearchFromHighlight = useRef<boolean>(true);
  
  // Loading completion state
  const [loadingComplete, setLoadingComplete] = useState(false);
  
  // Map reference for calling map methods
  const mapRef = useRef<AustralianMapRef>(null);
  const savedSearchesRef = useRef<SavedSearchesRef>(null);
  
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!currentUser) {
          router.push('/auth/signin');
          return;
        }

        setUser({
          email: currentUser.email || '',
          name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
          id: currentUser.id
        });
      } catch (error) {
        console.error('Error loading user:', error);
        router.push('/auth/signin');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [router]);

  // Poll preload state from map
  useEffect(() => {
    const pollPreloadState = () => {
      if (mapRef.current) {
        const state = mapRef.current.getPreloadState();
        setPreloadingData(state.preloadingData);
        setPreloadProgress(state.preloadProgress);
        setStylesPreloaded(state.stylesPreloaded);
        setStylePreloadProgress(state.stylePreloadProgress);
      }
    };

    // Poll every 500ms while preloading
    const interval = setInterval(pollPreloadState, 500);
    
    return () => clearInterval(interval);
  }, []);

  const toggleFacilityType = useCallback((type: keyof FacilityTypes) => {
    setFacilityTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  }, []);

  const handleSearch = (searchTerm: string, navigation?: { 
    center: [number, number], 
    bounds?: [number, number, number, number],
    searchResult?: any
  }) => {
    console.log('🔍 Map search submitted:', searchTerm);
    console.log('🧭 Navigation data:', navigation);
    
    // Update the currently showing search term
    setCurrentlyShowing(searchTerm);
    
    if (navigation) {
      console.log('🎯 Setting map navigation to:', {
        center: navigation.center,
        bounds: navigation.bounds,
        hasSearchResult: !!navigation.searchResult
      });
      
      // Auto-switch geo layer based on search result type
      if (navigation.searchResult) {
        const { type } = navigation.searchResult;
        console.log('🗺️ Search result type:', type);
        
        // Handle facility searches
        if (type === 'facility') {
          const { facilityType } = navigation.searchResult;
          
          // Enable the appropriate facility type if it's not already enabled
          if (facilityType && facilityType in facilityTypes && !facilityTypes[facilityType as keyof FacilityTypes]) {
            console.log(`🏥 Auto-enabling ${facilityType} facility type for facility search`);
            setFacilityTypes(prev => ({
              ...prev,
              [facilityType]: true
            }));
          }
        }
        // Handle boundary searches
        else if (type === 'postcode' && selectedGeoLayer !== 'postcode') {
          console.log('📮 Auto-switching to postcode layer for postcode search');
          setSelectedGeoLayer('postcode');
        } else if (type === 'locality' && selectedGeoLayer !== 'locality') {
          console.log('🏘️ Auto-switching to locality layer for locality search');
          setSelectedGeoLayer('locality');
        } else if (type === 'lga' && selectedGeoLayer !== 'lga') {
          console.log('🏛️ Auto-switching to LGA layer for LGA search');
          setSelectedGeoLayer('lga');
        } else if (type === 'sa2' && selectedGeoLayer !== 'sa2') {
          console.log('📍 Auto-switching to SA2 layer for SA2 search');
          setSelectedGeoLayer('sa2');
        } else if (type === 'sa3' && selectedGeoLayer !== 'sa3') {
          console.log('📍 Auto-switching to SA3 layer for SA3 search');
          setSelectedGeoLayer('sa3');
        } else if (type === 'sa4' && selectedGeoLayer !== 'sa4') {
          console.log('📍 Auto-switching to SA4 layer for SA4 search');
          setSelectedGeoLayer('sa4');
        }
      }
      
      // Set navigation state to move map to the location
      setMapNavigation({
        center: navigation.center,
        bounds: navigation.bounds,
        zoom: navigation.searchResult?.type === 'facility' ? 15 : (navigation.bounds ? undefined : 10), // Higher zoom for facilities
        searchResult: navigation.searchResult
      });
      
      console.log('✅ Map navigation state updated');
    } else {
      console.log('⚠️ No navigation data provided, performing general search');
      // Reset navigation state for general searches
      setMapNavigation(null);
    }
  };

  const handleClearHighlight = useCallback(() => {
    // Clear state in main component
    setHighlightedFeature(null);
    setHighlightedFeatureName(null);
    
    // Clear highlight on the map
    if (mapRef.current) {
      mapRef.current.clearHighlight();
    }
  }, []);

  const handleSavedSearchAdded = useCallback(() => {
    // Refresh the saved searches component when a new search is saved
    if (savedSearchesRef.current) {
      savedSearchesRef.current.refreshSavedSearches();
    }
  }, []);

  // Heatmap handlers
  const handleHeatmapToggle = useCallback((visible: boolean) => {
    console.log('🌡️ Maps Page: Heatmap visibility toggled:', visible);
    setHeatmapVisible(visible);
    // Don't clear min/max values when toggling visibility - let the component handle it
    // Only clear when there's no data or layer is removed
  }, []);

  const handleHeatmapDataSelect = useCallback((category: string, subcategory: string, dataType: 'healthcare' | 'demographics') => {
    console.log('🌡️ Maps Page: Heatmap data selected:', { category, subcategory, dataType });
    setHeatmapDataType(dataType);
    setHeatmapCategory(category);
    setHeatmapSubcategory(subcategory);
    setSelectedVariableName(`${category} - ${subcategory}`);
    // Auto-enable heatmap when data is selected
    if (!heatmapVisible) {
      setHeatmapVisible(true);
    }
  }, [heatmapVisible]);

  const handleHeatmapMinMaxCalculated = useCallback((minValue: number | undefined, maxValue: number | undefined) => {
    console.log('🌡️ Maps Page: Heatmap min/max calculated:', { minValue, maxValue });
    setHeatmapMinValue(minValue);
    setHeatmapMaxValue(maxValue);
  }, []);

  const handleHeatmapClear = useCallback(() => {
    console.log('🌡️ Maps Page: Clearing heatmap selection');
    setSelectedVariableName('');
    setHeatmapDataType('healthcare'); // Reset to default
    setHeatmapCategory('');
    setHeatmapSubcategory('');
    setHeatmapVisible(false);
    setHeatmapMinValue(undefined);
    setHeatmapMaxValue(undefined);
    // Clear ranked data when heatmap is cleared
    setRankedData(null);
    setTopBottomPanelVisible(false);
  }, []);

  // Top/Bottom Panel handlers
  const handleRankedDataCalculated = useCallback((rankedData: RankedSA2Data | null) => {
    console.log('📊 Maps Page: Ranked data calculated:', rankedData);
    setRankedData(rankedData);
    
    // Don't auto-show panel - let user choose when to view rankings
    // Panel will only show when user manually toggles it or expands data layers
  }, []);

  const handleTopBottomPanelToggle = useCallback(() => {
    const newVisible = !topBottomPanelVisible;
    setTopBottomPanelVisible(newVisible);
    
    // Auto-expand DataLayers when TopBottomPanel becomes visible
    if (newVisible && !dataLayersExpanded) {
      setDataLayersExpanded(true);
    }
  }, [topBottomPanelVisible, dataLayersExpanded]);

  const handleSavedSearchRemoved = useCallback(() => {
    // Refresh the saved searches component when a search is removed from the search bar
    if (savedSearchesRef.current) {
      savedSearchesRef.current.refreshSavedSearches();
    }
    
    // Also clear the current search since it was just removed from saved searches
    // But we don't need to clear the map or anything else - just update the saved status
  }, []);

  const handleSavedSearchesChanged = useCallback(() => {
    // This callback is only called when searches are deleted/cleared from SavedSearches
    // We should NOT restore currentlyShowing here - let the custom event handlers manage that
    
    // The search bar will automatically re-check its saved status when currentlyShowing changes
    // due to the useEffect that monitors currentlyShowing changes
    
    // No action needed here - the custom events (savedSearchDeleted, allSavedSearchesCleared) 
    // handle clearing currentlyShowing appropriately
    console.log('🔄 SavedSearches changed - letting custom events handle currentlyShowing updates');
  }, []);

  // Listen for saved search deletion events
  useEffect(() => {
    const handleSavedSearchDeleted = (event: CustomEvent) => {
      const { deletedSearchTerm } = event.detail;
      
      console.log('🧹 Handling saved search deleted event:', deletedSearchTerm, 'currently showing:', currentlyShowing);
      
      // Simple exact match check - if the deleted search term exactly matches what's currently showing, clear it
      if (currentlyShowing === deletedSearchTerm) {
        console.log('🧹 Clearing search bar because deleted search exactly matches currently showing');
        
        // Prevent highlights from updating the search bar temporarily
        shouldUpdateSearchFromHighlight.current = false;
        
        setCurrentlyShowing('');
        
        // Clear map highlights and navigation
        if (mapRef.current) {
          mapRef.current.clearHighlight();
        }
        
        // Re-enable highlight updates after a short delay
        setTimeout(() => {
          shouldUpdateSearchFromHighlight.current = true;
          console.log('🧹 Re-enabled highlight updates');
        }, 500);
      }
    };

    const handleAllSavedSearchesCleared = () => {
      console.log('🧹 All saved searches cleared - clearing search bar');
      
      // Prevent highlights from updating the search bar temporarily
      shouldUpdateSearchFromHighlight.current = false;
      
      setCurrentlyShowing('');
      
      // Clear map highlights and navigation
      if (mapRef.current) {
        mapRef.current.clearHighlight();
      }
      
      // Re-enable highlight updates after a short delay
      setTimeout(() => {
        shouldUpdateSearchFromHighlight.current = true;
        console.log('🧹 Re-enabled highlight updates after clear all');
      }, 500);
    };

    // Add event listeners
    window.addEventListener('savedSearchDeleted', handleSavedSearchDeleted as EventListener);
    window.addEventListener('allSavedSearchesCleared', handleAllSavedSearchesCleared as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('savedSearchDeleted', handleSavedSearchDeleted as EventListener);
      window.removeEventListener('allSavedSearchesCleared', handleAllSavedSearchesCleared as EventListener);
    };
  }, [currentlyShowing]);

  const handleHighlightFeature = useCallback((feature: string | null, featureName: string | null) => {
    setHighlightedFeature(feature);
    setHighlightedFeatureName(featureName);
    
    // Always update the search bar when a map feature is clicked/highlighted
    // The shouldUpdateSearchFromHighlight flag should only prevent automatic updates during deletion
    if (featureName) {
      console.log('🗺️ Updating search bar from map highlight:', featureName);
      setCurrentlyShowing(featureName);
      // Ensure highlight updates are re-enabled after a map interaction
      shouldUpdateSearchFromHighlight.current = true;
    } else {
      console.log('🗺️ Clearing search bar from map highlight');
      // Only clear if highlights are allowed (not during deletion)
      if (shouldUpdateSearchFromHighlight.current) {
        setCurrentlyShowing('');
      }
    }
  }, []);

  const handleClearSearchResult = useCallback(() => {
    console.log('🗺️ Clearing search result due to manual map interaction');
    shouldUpdateSearchFromHighlight.current = true; // Re-enable highlight updates
    setMapNavigation(null);
    setCurrentlyShowing('');
  }, []);

  const handleClearCurrentlyShowing = useCallback(() => {
    shouldUpdateSearchFromHighlight.current = false; // Temporarily disable highlight updates
    setCurrentlyShowing('');
    
    // Clear the last search result since user is explicitly clearing the search
    if (mapRef.current) {
      mapRef.current.clearLastSearchResult();
    }
    
    // Re-enable after a brief delay
    setTimeout(() => {
      shouldUpdateSearchFromHighlight.current = true;
    }, 100);
  }, []);

  // Handle region click from TopBottomPanel
  const handleRegionClick = useCallback(async (sa2Id: string, sa2Name: string) => {
    console.log('🎯 Maps Page: Region clicked from rankings:', { sa2Id, sa2Name });
    
    // Switch to SA2 boundary layer if not already selected
    if (selectedGeoLayer !== 'sa2') {
      console.log('📍 Auto-switching to SA2 layer for regional ranking navigation');
      setSelectedGeoLayer('sa2');
    }
    
    console.log('🔍 Looking up SA2 coordinates for:', sa2Name);
    
    try {
      // Try to find the location using the search service
      const locationResult = await getLocationByName(sa2Name);
      
      if (locationResult && locationResult.center) {
        console.log('✅ Found SA2 location data:', locationResult);
        
        // Call handleSearch with proper navigation data
        handleSearch(locationResult.name, {
          center: locationResult.center,
          bounds: locationResult.bounds,
          searchResult: locationResult
        });
      } else {
        console.log('⚠️ Could not find location data for SA2:', sa2Name);
        console.log('🔄 Fallback: Trying search with SA2 ID:', sa2Id);
        
        // Fallback: try searching by SA2 ID instead
        const locationResultById = await getLocationByName(sa2Id);
        
        if (locationResultById && locationResultById.center) {
          console.log('✅ Found SA2 location data by ID:', locationResultById);
          
          handleSearch(locationResultById.name, {
            center: locationResultById.center,
            bounds: locationResultById.bounds,
            searchResult: locationResultById
          });
        } else {
          console.log('❌ Could not find location data by name or ID, performing basic search');
          // Final fallback: basic search without navigation
          handleSearch(sa2Name);
        }
      }
    } catch (error) {
      console.error('❌ Error looking up SA2 location:', error);
      // Fallback to basic search on error
      handleSearch(sa2Name);
    }
  }, [selectedGeoLayer, handleSearch]);

  // Handle loading completion
  const handleLoadingComplete = useCallback(() => {
    console.log('🎉 Maps Page: Loading sequence completed, enabling interactive features');
    setLoadingComplete(true);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-80'
      } flex flex-col`}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100">
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          {!sidebarCollapsed && (
            <>
              <Map className="h-6 w-6 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900">Maps</h1>
            </>
          )}
        </div>

        {/* Back Button */}
        <div className="p-4 border-b border-gray-100">
          <BackToMainButton sidebarCollapsed={sidebarCollapsed} />
        </div>

        {/* Content - Only show when sidebar is not collapsed */}
        {!sidebarCollapsed && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              {/* Saved Searches - First */}
              <SavedSearches
                ref={savedSearchesRef}
                userId={user.id}
                onSearchSelect={handleSearch}
                onSavedSearchesChanged={handleSavedSearchesChanged}
                className="border-b border-gray-200"
              />

              {/* Empty row between Saved Searches and Map Settings */}
              <div className="py-4 border-b border-gray-100"></div>

              {/* Map Settings - Second */}
              <MapSettings
                selectedMapStyle={selectedMapStyle}
                onMapStyleChange={setSelectedMapStyle}
                selectedGeoLayer={selectedGeoLayer}
                onGeoLayerChange={setSelectedGeoLayer}
                facilityTypes={facilityTypes}
                onToggleFacilityType={toggleFacilityType}
                className="border-b border-gray-200"
                preloadingData={preloadingData}
                preloadProgress={preloadProgress}
                stylesPreloaded={stylesPreloaded}
                stylePreloadProgress={stylePreloadProgress}
              />

              {/* Data Layers - Removed from sidebar, now positioned on map */}

              {/* Empty row between Map Settings and Active Layers */}
              <div className="py-4 border-b border-gray-100"></div>

              {/* Active Layers - Bottom section */}
              <ActiveLayers
                facilityTypes={facilityTypes}
                selectedGeoLayer={selectedGeoLayer}
                selectedMapStyle={selectedMapStyle}
                highlightedFeature={highlightedFeature}
                highlightedFeatureName={highlightedFeatureName}
                onClearHighlight={handleClearHighlight}
              />
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className={`p-4 border-t border-gray-100 ${sidebarCollapsed ? 'space-y-2' : 'space-y-1'}`}>
          {sidebarCollapsed ? (
            <>
              <button className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <User className="h-5 w-5 text-gray-600 mx-auto" />
              </button>
              <button className="w-full p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="h-5 w-5 text-gray-600 mx-auto" />
              </button>
            </>
          ) : (
            <>
              <button className="w-full flex items-center gap-3 p-2 text-left hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">Settings & help</span>
              </button>
              <div className="flex items-center gap-3 p-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">A</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.name || 'User'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Main Map Area */}
        <main className="flex-1 relative overflow-hidden">
          {/* Search Bar - Top Left */}
          <MapSearchBar
            userId={user.id}
            onSearch={handleSearch}
            onSavedSearchAdded={handleSavedSearchAdded}
            onSavedSearchRemoved={handleSavedSearchRemoved}
            currentlyShowing={currentlyShowing}
            onClearCurrentlyShowing={handleClearCurrentlyShowing}
            className="absolute top-4 left-4 z-50 w-80"
          />

          {/* Data Layers and Rankings Container - Bottom Left */}
          <div className="absolute bottom-4 left-4 z-40 flex gap-4">
            {/* Data Layers Panel */}
            <DataLayers 
              className="w-64"
              onHeatmapToggle={handleHeatmapToggle}
              onHeatmapDataSelect={handleHeatmapDataSelect}
              onHeatmapClear={handleHeatmapClear}
              heatmapVisible={heatmapVisible}
              selectedVariableName={selectedVariableName}
              heatmapMinValue={heatmapMinValue}
              heatmapMaxValue={heatmapMaxValue}
              isExpanded={dataLayersExpanded}
              onExpandedChange={setDataLayersExpanded}
              heatmapDataType={heatmapDataType}
            />

            {/* Top/Bottom Rankings Panel - Next to Data Layers */}
            <TopBottomPanel
              rankedData={rankedData}
              isVisible={topBottomPanelVisible}
              onToggle={handleTopBottomPanelToggle}
              onRegionClick={handleRegionClick}
            />
          </div>

          {/* Map Container - Full screen now */}
          <div className="absolute inset-0">
            <MapLoadingCoordinator 
              onLoadingComplete={handleLoadingComplete}
            >
              <AustralianMap
                ref={mapRef}
                className="w-full h-full"
                facilityTypes={facilityTypes}
                selectedGeoLayer={selectedGeoLayer}
                selectedMapStyle={selectedMapStyle}
                mapNavigation={mapNavigation}
                onHighlightFeature={handleHighlightFeature}
                onClearSearchResult={handleClearSearchResult}
                userId={user?.id}
                onSavedSearchAdded={handleSavedSearchAdded}
                heatmapVisible={heatmapVisible}
                heatmapDataType={heatmapDataType}
                heatmapCategory={heatmapCategory}
                heatmapSubcategory={heatmapSubcategory}
                onHeatmapMinMaxCalculated={handleHeatmapMinMaxCalculated}
                onRankedDataCalculated={handleRankedDataCalculated}
              />
            </MapLoadingCoordinator>
          </div>
        </main>
      </div>
    </div>
  );
} 