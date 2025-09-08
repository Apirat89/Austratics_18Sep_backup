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
import FacilityDetailsModal from '../../components/FacilityDetailsModal';
import FacilityTable from '../../components/FacilityTable';
import FacilityLoadingSpinner from '../../components/FacilityLoadingSpinner';
import { RankedSA2Data } from '../../components/HeatmapDataService';
import { getLocationByName } from '../../lib/mapSearchService';
import { Map, Settings, User, Menu, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import MapLoadingCoordinator from '../../components/MapLoadingCoordinator';

interface UserData {
  email: string;
  name: string;
  id: string;
}

interface FacilityTypes {
  residential: boolean;
  multipurpose_others: boolean;
  home: boolean;
  retirement: boolean;
}

export interface FacilityData {
  OBJECTID: number;
  Service_Name: string;
  Physical_Address: string;
  Physical_Suburb: string;
  Physical_State: string;
  Physical_Post_Code: number;
  Care_Type: string;
  Residential_Places: number | null;
  Home_Care_Places: number | null;
  Home_Care_Max_Places: number | null;
  Restorative_Care_Places: number | null;
  Provider_Name: string;
  Organisation_Type: string;
  ABS_Remoteness: string;
  Phone?: string;
  Email?: string;
  Website?: string;
  Latitude: number;
  Longitude: number;
  F2019_Aged_Care_Planning_Region: string;
  F2016_SA2_Name: string;
  F2016_SA3_Name: string;
  F2016_LGA_Name: string;
  facilityType: 'residential' | 'multipurpose_others' | 'home' | 'retirement';
}

type GeoLayerType = 'sa2' | 'sa3' | 'sa4' | 'lga' | 'postcode' | 'locality' | 'acpr' | 'mmm';
type MapStyleType = 'basic' | 'topo' | 'satellite' | 'terrain' | 'streets';

export default function MapsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Facility types state (keeping for backwards compatibility)
  const [facilityTypes, setFacilityTypes] = useState<FacilityTypes>({
    residential: true,
    multipurpose_others: true,
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
  
  // ✅ NEW: Enhanced radius feature with multiple distance options
  type RadiusType = 'off' | 'urban' | 'suburban' | 'rural';
  const [radiusType, setRadiusType] = useState<RadiusType>('urban');

  // ✅ NEW: Facility loading spinner state
  const [facilitySpinnerVisible, setFacilitySpinnerVisible] = useState(false);
  
  // ✅ NEW: Track initial load completion to prevent spinner during page load
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Radius distance mapping
  const getRadiusDistance = (type: RadiusType): number => {
    const mapping = { off: 0, urban: 20, suburban: 30, rural: 60 };
    return mapping[type];
  };
  
  // Facility Table state
  const [tableVisible, setTableVisible] = useState(false);
  const [selectedFacilities, setSelectedFacilities] = useState<FacilityData[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  
  // Heatmap state with default selection (data preloaded but UI starts minimal)
  const [heatmapVisible, setHeatmapVisible] = useState(true); // Default to visible
  const [heatmapDataType, setHeatmapDataType] = useState<'healthcare' | 'demographics' | 'economics' | 'health-statistics'>('healthcare'); // Default to healthcare
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
  
  // Facility Details Modal state
  const [selectedFacility, setSelectedFacility] = useState<FacilityData | null>(null);
  const [facilityModalOpen, setFacilityModalOpen] = useState(false);
  
  // Close All Popups state
  const [openPopupsCount, setOpenPopupsCount] = useState(0);
  const [facilityBreakdown, setFacilityBreakdown] = useState<Record<string, number>>({});
  
  // Save All state - tracks if all open facilities are already saved
  const [allFacilitiesSaved, setAllFacilitiesSaved] = useState(false);
  
  // Save All loading state
  const [saveAllLoading, setSaveAllLoading] = useState(false);
  
  // Facility Counter state
  const [facilityCountsInViewport, setFacilityCountsInViewport] = useState<{
    residential: number;
    multipurpose_others: number;
    home: number;
    retirement: number;
    total: number;
    loading: boolean;
  }>({
    residential: 0,
    multipurpose_others: 0,
    home: 0,
    retirement: 0,
    total: 0,
    loading: true
  });
  
  // Facility Count collapsible state
  const [facilityCountExpanded, setFacilityCountExpanded] = useState(true);
  
  // Bulk Selection state
  const [bulkSelectionEnabled, setBulkSelectionEnabled] = useState(false);
  const [bulkSelectionTypes, setBulkSelectionTypes] = useState<FacilityTypes>({
    residential: true,
    multipurpose_others: true,
    home: true,
    retirement: true
  });

  // ✅ DEBUG: Log when bulkSelectionTypes changes (prop passed to AustralianMap as facilityTypes)
  useEffect(() => {
    console.log('🔄 PROP FLOW DEBUG: bulkSelectionTypes changed (will be passed as facilityTypes prop):', bulkSelectionTypes);
  }, [bulkSelectionTypes]);
  
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

  // Handle URL parameters for direct facility links
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const facilityId = urlParams.get('facility');
    
    if (facilityId && !facilityModalOpen) {
      // Load facility data and open modal
      loadFacilityById(facilityId);
    }
  }, [facilityModalOpen]);

  // Update popup count and facility breakdown for Close All button visibility
  useEffect(() => {
    const updatePopupCount = () => {
      if (mapRef.current) {
        const count = mapRef.current.getOpenPopupsCount();
        const breakdown = mapRef.current.getFacilityTypeBreakdown();
        setOpenPopupsCount(count);
        setFacilityBreakdown(breakdown);
      }
    };

    const interval = setInterval(updatePopupCount, 500);
    return () => clearInterval(interval);
  }, []);

  // Reset Save All state when popup count changes
  useEffect(() => {
    if (openPopupsCount === 0) {
      setAllFacilitiesSaved(false);
    }
  }, [openPopupsCount]);

  // Function to calculate selected facility count based on checked types
  const calculateSelectedFacilityCount = useCallback((counts: { residential: number; multipurpose_others: number; home: number; retirement: number }, types: FacilityTypes) => {
    let total = 0;
    if (types.residential) total += counts.residential || 0;
    if (types.multipurpose_others) total += counts.multipurpose_others || 0;
    if (types.home) total += counts.home || 0;
    if (types.retirement) total += counts.retirement || 0;
    return total;
  }, []);

  // Add facility counting functionality
  const updateFacilityCounts = useCallback(() => {
    if (!mapRef.current) {
      console.log('🔢 Cannot update facility counts - map not available');
      return;
    }

    console.log('🔢 Updating facility counts...');
    
    // Set loading state
    setFacilityCountsInViewport(prev => ({ ...prev, loading: true }));
    
    try {
      // Get current viewport bounds
      const bounds = mapRef.current.getBounds();
      if (!bounds) {
        console.log('🔢 Cannot get map bounds');
        setFacilityCountsInViewport(prev => ({ ...prev, loading: false }));
        return;
      }

      // Get all facilities
      const allFacilities = mapRef.current.getAllFacilities();
      console.log('🔢 Total facilities available:', allFacilities.length);

      // Filter facilities within viewport bounds
      const facilitiesInViewport = allFacilities.filter(facility => {
        const lat = facility.Latitude;
        const lng = facility.Longitude;
        
        // Validate coordinates
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
          return false;
        }
        
        // Check if facility is within viewport bounds
        return (
          lng >= bounds.west && 
          lng <= bounds.east && 
          lat >= bounds.south && 
          lat <= bounds.north
        );
      });

      console.log('🔢 Facilities in viewport:', facilitiesInViewport.length);

      // Count by facility type
      const counts = facilitiesInViewport.reduce((acc, facility) => {
        const type = facility.facilityType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate total
      const total = facilitiesInViewport.length;

      // Update state
      setFacilityCountsInViewport({
        residential: counts.residential || 0,
        multipurpose_others: counts.multipurpose_others || 0,
        home: counts.home || 0,
        retirement: counts.retirement || 0,
        total: total,
        loading: false
      });
      
      // Update bulk selection enabled state based on selected facility limit (not total)
      const selectedCount = calculateSelectedFacilityCount(
        { residential: counts.residential || 0, multipurpose_others: counts.multipurpose_others || 0, home: counts.home || 0, retirement: counts.retirement || 0 },
        bulkSelectionTypes
      );
      setBulkSelectionEnabled(selectedCount <= 100 && selectedCount > 0);

      console.log('🔢 Facility counts updated:', {
        residential: counts.residential || 0,
        multipurpose_others: counts.multipurpose_others || 0,
        home: counts.home || 0,
        retirement: counts.retirement || 0,
        total: total
      });

    } catch (error) {
      console.error('🔢 Error updating facility counts:', error);
      setFacilityCountsInViewport(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Register viewport change callback and initial count
  useEffect(() => {
    if (mapRef.current && loadingComplete) {
      console.log('🔢 Registering facility counting callback');
      
      // Register the callback with the map
      mapRef.current.onViewportChange(updateFacilityCounts);
      
      // Perform initial count after a short delay to ensure facilities are loaded
      setTimeout(() => {
        console.log('🔢 Performing initial facility count');
        updateFacilityCounts();
      }, 1000);
    }
  }, [loadingComplete, updateFacilityCounts]);

  // Update bulk selection enabled state when selection types change
  useEffect(() => {
    if (!facilityCountsInViewport.loading) {
      const selectedCount = calculateSelectedFacilityCount(
        { residential: facilityCountsInViewport.residential, multipurpose_others: facilityCountsInViewport.multipurpose_others, home: facilityCountsInViewport.home, retirement: facilityCountsInViewport.retirement },
        bulkSelectionTypes
      );
      setBulkSelectionEnabled(selectedCount <= 100 && selectedCount > 0);
    }
  }, [bulkSelectionTypes, facilityCountsInViewport, calculateSelectedFacilityCount]);

  // Function to load facility by ID and open modal
  const loadFacilityById = async (facilityId: string) => {
    try {
      const response = await fetch('/maps/healthcare.geojson');
      if (!response.ok) throw new Error('Failed to load facility data');
      
      const data = await response.json();
      const facility = data.features.find((f: any) => 
        f.properties.OBJECTID.toString() === facilityId
      );
      
      if (facility) {
        const facilityData: FacilityData = {
          ...facility.properties,
          facilityType: determineFacilityType(facility.properties.Care_Type)
        };
        
        setSelectedFacility(facilityData);
        setFacilityModalOpen(true);
      }
    } catch (error) {
      console.error('Error loading facility:', error);
    }
  };

  // Function to determine facility type from Care_Type
  const determineFacilityType = (careType: string): 'residential' | 'multipurpose_others' | 'home' | 'retirement' => {
    const careTypeMapping = {
      residential: ['Residential'],
      multipurpose_others: [
        'Multi-Purpose Service',
        'Transition Care',
        'Short-Term Restorative Care (STRC)',
        'National Aboriginal and Torres Strait Islander Aged Care Program', 
        'Innovative Pool'
      ],
      home: ['Home Care', 'Community Care'],
      retirement: ['Retirement', 'Retirement Living', 'Retirement Village']
    };

    if (careTypeMapping.multipurpose_others.some(ct => careType.includes(ct))) {
      return 'multipurpose_others';
    } else if (careTypeMapping.residential.some(ct => careType.includes(ct))) {
      return 'residential';
    } else if (careTypeMapping.home.some(ct => careType.includes(ct))) {
      return 'home';
    } else if (careTypeMapping.retirement.some(ct => careType.toLowerCase().includes(ct.toLowerCase()))) {
      return 'retirement';
    }
    
    return 'residential'; // default
  };

  // Function to get friendly facility type names
  const getFacilityTypeName = (facilityType: string): string => {
    switch (facilityType) {
      case 'residential': return 'Residential Care';
      case 'multipurpose_others': return 'Multi-Purpose and Others';
      case 'home': return 'Home Care';
      case 'retirement': return 'Retirement Living';
      default: return facilityType;
    }
  };

  // Function to open facility details modal
  const openFacilityDetails = useCallback((facility: FacilityData) => {
    setSelectedFacility(facility);
    setFacilityModalOpen(true);
    
    // Update URL for shareable link
    const url = new URL(window.location.href);
    url.searchParams.set('facility', facility.OBJECTID.toString());
    window.history.pushState({}, '', url.toString());
  }, []);

  // Function to navigate to facility details page with address filter
  const navigateToFacilityDetails = useCallback((facility: FacilityData) => {
    if (facility.facilityType === 'residential') {
      // Navigate to residential page with address filter
      router.push(`/residential?address=${encodeURIComponent(facility.Physical_Address)}`);
    } else if (facility.facilityType === 'home') {
      // Navigate to homecare page with address filter
      router.push(`/homecare?address=${encodeURIComponent(facility.Physical_Address)}`);
    }
  }, [router]);

  // Function to handle facility table selection (for demonstration)
  const handleFacilityTableSelection = useCallback((facilities: FacilityData[]) => {
    setSelectedFacilities(facilities);
    setTableVisible(facilities.length > 0);
  }, []);

  // Function to handle bulk facility selection
  const handleBulkSelection = useCallback(() => {
    if (!mapRef.current || !bulkSelectionEnabled) return;
    
    console.log('🔄 Bulk Selection: Starting bulk facility selection...');
    
    // Get all facilities from the map
    const allFacilities = mapRef.current.getAllFacilities();
    
    // Filter facilities by viewport (same logic as facility count)
    const facilitiesInViewport = allFacilities.filter(facility => {
      if (!facility.Latitude || !facility.Longitude) return false;
      
      const bounds = mapRef.current?.getBounds();
      if (!bounds) return false;
      
      const lat = facility.Latitude;
      const lng = facility.Longitude;
      
      return lat >= bounds.south && lat <= bounds.north &&
             lng >= bounds.west && lng <= bounds.east;
    });
    
    // Filter by selected facility types
    const selectedFacilities = facilitiesInViewport.filter(facility => {
      return bulkSelectionTypes[facility.facilityType];
    });
    
    console.log('🎯 Bulk Selection: Selected', selectedFacilities.length, 'facilities');
    
    // Use existing table selection handler
    handleFacilityTableSelection(selectedFacilities);
  }, [bulkSelectionEnabled, bulkSelectionTypes, handleFacilityTableSelection]);

  // Function to close facility details modal
  const closeFacilityModal = useCallback(() => {
    setFacilityModalOpen(false);
    setSelectedFacility(null);
    
    // Remove facility parameter from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('facility');
    window.history.pushState({}, '', url.toString());
  }, []);

  // Function to close all facility popups
  const handleCloseAllPopups = useCallback(() => {
    if (mapRef.current) {
      const closedCount = mapRef.current.closeAllPopups();
      console.log(`🚪 Closed ${closedCount} facility popups`);
      
      // Immediately update popup count and breakdown to hide button
      setOpenPopupsCount(0);
      setFacilityBreakdown({});
    }
  }, []);

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

  // toggleFacilityType removed - facility types are now fixed as always selected

  const handleSearch = (searchTerm: string, navigation?: { 
    center?: [number, number], 
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

  // Function to check if all open facilities are saved
  const checkAllFacilitiesSaved = useCallback(async () => {
    if (!mapRef.current || !user?.id) return false;
    
    try {
      // If no open facilities, return false
      if (openPopupsCount === 0) return false;
      
      // For now, we'll track this state manually after save/unsave operations
      // In a real implementation, we'd check each facility's saved status
      return allFacilitiesSaved;
    } catch (error) {
      console.error('Error checking facility save status:', error);
      return false;
    }
  }, [user?.id, openPopupsCount, allFacilitiesSaved]);

  // Function to save OR unsave all facility popups
  const handleSaveAllPopups = useCallback(async () => {
    if (!mapRef.current || !user?.id) {
      alert('Please sign in to save facilities');
      return;
    }

    if (saveAllLoading) return; // Prevent double-clicks
    
    setSaveAllLoading(true);

    try {
      if (allFacilitiesSaved) {
        // UNSAVE ALL functionality
        console.log('🗑️ Starting unsave all facilities...');
        
        // Get saved searches to find matching facilities
        const { getUserSavedSearches, deleteSavedSearch } = await import('../../lib/savedSearches');
        const savedSearches = await getUserSavedSearches(user.id);
        
        if (!savedSearches || !savedSearches.searches) {
          alert('❌ Failed to load saved searches');
          return;
        }
        
        // Delete all facility-type saved searches
        let deletedCount = 0;
        const errors: string[] = [];
        
        for (const search of savedSearches.searches) {
          if (search.search_type === 'facility') {
            try {
              const result = await deleteSavedSearch(user.id, search.id!);
              if (result.success) {
                deletedCount++;
              } else {
                errors.push(`${search.search_display_name}: ${result.error}`);
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              errors.push(`${search.search_display_name}: ${errorMsg}`);
            }
          }
        }
        
        // ✅ Update individual popup buttons to unsaved state
        const saveButtons = document.querySelectorAll('[id*="save-btn"]');
        saveButtons.forEach((button) => {
          const saveButton = button as HTMLButtonElement;
          saveButton.innerHTML = '📍 Save Location';
          saveButton.style.backgroundColor = '#3B82F6';
          saveButton.style.borderColor = '#3B82F6';
          saveButton.style.color = 'white';
          saveButton.style.pointerEvents = 'auto';
        });
        
        // ✅ Single notification message
        if (deletedCount > 0) {
          alert(`🗑️ Successfully removed ${deletedCount} facilities from your saved locations!`);
          handleSavedSearchAdded(); // Refresh saved searches
          setAllFacilitiesSaved(false); // Update button state
        } else if (errors.length > 0) {
          alert(`⚠️ Failed to remove some facilities:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}`);
        } else {
          alert('No facility searches found to remove.');
          setAllFacilitiesSaved(false); // Reset state anyway
        }
        
      } else {
        // SAVE ALL functionality (original)
        console.log('💾 Starting save all facilities...');
        const result = await mapRef.current.saveAllOpenFacilities();
        
        // ✅ Single notification message based on result
        if (result.success) {
          if (result.saved > 0) {
            alert(`✅ Successfully saved ${result.saved} out of ${result.total} facilities to your saved locations!`);
            setAllFacilitiesSaved(true); // Update button state
          } else {
            alert('All open facilities are already saved to your locations.');
            setAllFacilitiesSaved(true); // Update button state
          }
          handleSavedSearchAdded(); // Refresh saved searches
        } else {
          let message = 'Failed to save facilities.';
          if (result.errors.length > 0) {
            message = `Some facilities could not be saved:\n${result.errors.slice(0, 3).join('\n')}${result.errors.length > 3 ? '\n...' : ''}`;
          }
          if (result.saved > 0) {
            message += `\n\nHowever, ${result.saved} out of ${result.total} facilities were successfully saved.`;
            handleSavedSearchAdded();
            // Partial success - check if all are now saved
            if (result.saved === result.total) {
              setAllFacilitiesSaved(true);
            }
          }
          alert(`⚠️ ${message}`);
        }
      }
    } catch (error) {
      console.error('❌ Error saving/unsaving all facilities:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Error: ${errorMessage}`);
    } finally {
      setSaveAllLoading(false);
    }
  }, [user?.id, handleSavedSearchAdded, allFacilitiesSaved, saveAllLoading]);

  // Heatmap handlers
  const handleHeatmapToggle = useCallback((visible: boolean) => {
    console.log('🌡️ Maps Page: Heatmap visibility toggled:', visible);
    setHeatmapVisible(visible);
    // Don't clear min/max values when toggling visibility - let the component handle it
    // Only clear when there's no data or layer is removed
  }, []);

  const handleHeatmapDataSelect = useCallback((category: string, subcategory: string, dataType: 'healthcare' | 'demographics' | 'economics' | 'health-statistics') => {
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

  // ✅ NEW: Handle facility loading state changes for spinner
  const handleFacilityLoadingChange = useCallback((isLoading: boolean) => {
    console.log('🔄 SPINNER DEBUG: Loading state changed:', isLoading, 'initialLoadComplete:', initialLoadComplete);
    
    // Only show spinner if initial load is complete (prevent showing during page load)
    if (!initialLoadComplete) {
      console.log('🔄 SPINNER DEBUG: Skipping spinner - initial load not complete');
      return;
    }
    
    if (isLoading) {
      // Show spinner immediately
      console.log('🔄 SPINNER DEBUG: Showing spinner for user-initiated change');
      setFacilitySpinnerVisible(true);
    } else {
      // Keep spinner visible for minimum 2 seconds for testing
      setTimeout(() => {
        console.log('🔄 SPINNER DEBUG: Hiding spinner after 2s delay');
        setFacilitySpinnerVisible(false);
      }, 2000);
    }
  }, [initialLoadComplete]);

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
    console.log('🔍 DEBUG: Current rankedData:', rankedData);
    
    // Check if this is the top-ranked item
    const isTopRanked = rankedData?.topRegions[0]?.sa2Id === sa2Id;
    console.log('🏆 Is this the #1 top-ranked region?', isTopRanked);
    
    // Switch to SA2 boundary layer if not already selected
    if (selectedGeoLayer !== 'sa2') {
      console.log('📍 Auto-switching to SA2 layer for regional ranking navigation');
      setSelectedGeoLayer('sa2');
    }
    
    console.log('🔍 Looking up SA2 coordinates for:', sa2Name);
    
    try {
      // Try to find the location using the search service
      console.log('📡 Calling getLocationByName with:', sa2Name);
      const locationResult = await getLocationByName(sa2Name);
      console.log('📦 Location lookup result:', locationResult);
      
      if (locationResult && locationResult.center) {
        console.log('✅ Found location data:', locationResult);
        console.log('🗺️ Location center coordinates:', locationResult.center);
        console.log('📦 Location bounds:', locationResult.bounds);
        
        // Force the result type to be 'sa2' and ensure SA2 ID is in the code field
        const sa2SearchResult = {
          ...locationResult,
          type: 'sa2' as const, // Override type to ensure SA2 layer stays active
          code: sa2Id // Ensure the SA2 ID is available for precise matching
        };
        
        // Call handleSearch with proper navigation data
        handleSearch(sa2SearchResult.name, {
          center: sa2SearchResult.center!,
          bounds: sa2SearchResult.bounds,
          searchResult: sa2SearchResult
        });
      } else {
        console.log('⚠️ Could not find location data for SA2:', sa2Name);
        console.log('🔄 Fallback: Trying search with SA2 ID:', sa2Id);
        
        // Fallback: try searching by SA2 ID instead
        console.log('📡 Calling getLocationByName with SA2 ID:', sa2Id);
        const locationResultById = await getLocationByName(sa2Id);
        console.log('📦 SA2 ID lookup result:', locationResultById);
        
        if (locationResultById && locationResultById.center) {
          console.log('✅ Found SA2 location data by ID:', locationResultById);
          console.log('🗺️ ID lookup center coordinates:', locationResultById.center);
          console.log('📦 ID lookup bounds:', locationResultById.bounds);
          
          // Force the result type to be 'sa2' and ensure SA2 ID is in the code field
          const sa2SearchResultById = {
            ...locationResultById,
            type: 'sa2' as const,
            code: sa2Id // Ensure the SA2 ID is available for precise matching
          };
          
          handleSearch(sa2SearchResultById.name, {
            center: sa2SearchResultById.center!,
            bounds: sa2SearchResultById.bounds,
            searchResult: sa2SearchResultById
          });
        } else {
          console.log('❌ Could not find location data by name or ID, performing SA2 ID-only highlight');
          // Final fallback: create a minimal search result with just the SA2 ID for highlighting
          const sa2SearchResultMinimal = {
            name: sa2Name,
            type: 'sa2' as const,
            code: sa2Id // Use SA2 ID for precise matching even without coordinates
          };
          
          handleSearch(sa2Name, {
            searchResult: sa2SearchResultMinimal
          });
        }
      }
    } catch (error) {
      console.error('❌ Error looking up SA2 location:', error);
      // Fallback to basic search on error
      handleSearch(sa2Name);
    }
  }, [selectedGeoLayer, handleSearch, rankedData]);

  // Handle loading completion
  const handleLoadingComplete = useCallback(() => {
    console.log('🎉 Maps Page: Loading sequence completed, enabling interactive features');
    setLoadingComplete(true);
    
    // ✅ NEW: Mark initial load as complete - now spinner can show for user actions
    console.log('🔄 SPINNER DEBUG: Initial load complete - spinner now enabled for user actions');
    setInitialLoadComplete(true);
  }, []);

  // ✅ NEW: Handle heatmap loading completion - stores callback to be called by LayerManager
  const [heatmapCompletionCallback, setHeatmapCompletionCallback] = useState<(() => void) | null>(null);
  
  const handleHeatmapLoadingComplete = useCallback((callback: () => void) => {
    console.log('📡 Maps Page: Received heatmap completion callback from DataLayers');
    // ✅ FIXED: Store callback asynchronously to prevent setState during render
    setTimeout(() => {
      setHeatmapCompletionCallback(callback);
    }, 0);
  }, []);

  // ✅ NEW: Enhanced radius feature - dropdown selector with facility type integration
  const handleRadiusTypeChange = useCallback((newType: RadiusType) => {
    setRadiusType(newType);
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
                className="border-b border-gray-200"
                preloadingData={preloadingData}
                preloadProgress={preloadProgress}
                stylesPreloaded={stylesPreloaded}
                stylePreloadProgress={stylePreloadProgress}
              />

              {/* Data Layers - Removed from sidebar, now positioned on map */}

              {/* Empty row between Map Settings and Select All Facilities */}
              <div className="py-4 border-b border-gray-100"></div>

              {/* Facility Selection */}
              <div className="border-b border-gray-200">
                {/* Header */}
                <button
                  onClick={() => setFacilityCountExpanded(!facilityCountExpanded)}
                  className="flex items-center gap-3 p-4 w-full hover:bg-gray-50 transition-colors text-left"
                >
                  <BarChart3 className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">Facility Selection</span>
                  {facilityCountExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400 ml-auto" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />
                  )}
                </button>

                {/* Content */}
                {facilityCountExpanded && (
                  <div className="px-4 pb-3">
                    <div className="space-y-2">
                      {/* Facility Type Selection */}
                      <div className="space-y-1.5">
                        {/* Residential Care */}
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="select-residential"
                              checked={bulkSelectionTypes.residential}
                              onChange={(e) => {
                                console.log('🔄 CHECKBOX DEBUG: Residential checkbox changed to:', e.target.checked);
                                setBulkSelectionTypes(prev => {
                                  const updated = { ...prev, residential: e.target.checked };
                                  console.log('🔄 CHECKBOX DEBUG: Updated bulkSelectionTypes:', updated);
                                  return updated;
                                });
                              }}
                              className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                            />
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-sm text-gray-700">Residential Care</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {facilityCountsInViewport.loading ? '...' : facilityCountsInViewport.residential.toLocaleString()}
                          </span>
                        </div>

                        {/* Multi-Purpose Service */}
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="select-mps"
                              checked={bulkSelectionTypes.multipurpose_others}
                              onChange={(e) => {
                                console.log('🔄 CHECKBOX DEBUG: Multi-Purpose checkbox changed to:', e.target.checked);
                                setBulkSelectionTypes(prev => {
                                  const updated = { ...prev, multipurpose_others: e.target.checked };
                                  console.log('🔄 CHECKBOX DEBUG: Updated bulkSelectionTypes:', updated);
                                  return updated;
                                });
                              }}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-gray-700">Multi-Purpose Service</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {facilityCountsInViewport.loading ? '...' : facilityCountsInViewport.multipurpose_others.toLocaleString()}
                          </span>
                        </div>

                        {/* Home Care */}
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="select-home"
                              checked={bulkSelectionTypes.home}
                              onChange={(e) => {
                                console.log('🔄 CHECKBOX DEBUG: Home Care checkbox changed to:', e.target.checked);
                                setBulkSelectionTypes(prev => {
                                  const updated = { ...prev, home: e.target.checked };
                                  console.log('🔄 CHECKBOX DEBUG: Updated bulkSelectionTypes:', updated);
                                  return updated;
                                });
                              }}
                              className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                            />
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-gray-700">Home Care</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {facilityCountsInViewport.loading ? '...' : facilityCountsInViewport.home.toLocaleString()}
                          </span>
                        </div>

                        {/* Retirement Living */}
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-gray-50">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="select-retirement"
                              checked={bulkSelectionTypes.retirement}
                              onChange={(e) => {
                                console.log('🔄 CHECKBOX DEBUG: Retirement checkbox changed to:', e.target.checked);
                                setBulkSelectionTypes(prev => {
                                  const updated = { ...prev, retirement: e.target.checked };
                                  console.log('🔄 CHECKBOX DEBUG: Updated bulkSelectionTypes:', updated);
                                  return updated;
                                });
                              }}
                              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                            />
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span className="text-sm text-gray-700">Retirement Living</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {facilityCountsInViewport.loading ? '...' : facilityCountsInViewport.retirement.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Total Count and Selected Count */}
                      <div className="border-t border-gray-200 pt-2 space-y-1.5">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 border border-blue-200">
                          <div className="flex items-center gap-3">
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-800">Total in View</span>
                          </div>
                          <span className="text-lg font-bold text-blue-900">
                            {facilityCountsInViewport.loading ? '...' : facilityCountsInViewport.total.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-200">
                          <div className="flex items-center gap-3">
                            <span className="text-green-600">🎯</span>
                            <span className="text-sm font-medium text-green-800">Selected for Bulk</span>
                          </div>
                          <span className="text-lg font-bold text-green-900">
                            {facilityCountsInViewport.loading ? '...' : calculateSelectedFacilityCount(facilityCountsInViewport, bulkSelectionTypes).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-sm text-green-800">
                        🔄 Counts update automatically as you zoom and pan the map.
                        <br />
                        ✅ Check facility types above to select for bulk operations.
                      </div>
                    </div>

                    {/* Select All Button */}
                    <div className="mt-3">
                      <button
                        onClick={handleBulkSelection}
                        disabled={!bulkSelectionEnabled || facilityCountsInViewport.loading}
                        className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                          bulkSelectionEnabled && !facilityCountsInViewport.loading
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                        title={
                          !bulkSelectionEnabled 
                            ? `Too many selected (${calculateSelectedFacilityCount(facilityCountsInViewport, bulkSelectionTypes)}). Limit: 100.`
                            : 'Select all visible facilities based on checked types'
                        }
                      >
                        {facilityCountsInViewport.loading ? (
                          'Loading...'
                        ) : bulkSelectionEnabled ? (
                          `Select All (${calculateSelectedFacilityCount(facilityCountsInViewport, bulkSelectionTypes)})`
                        ) : (
                          `Too Many (${calculateSelectedFacilityCount(facilityCountsInViewport, bulkSelectionTypes)}/100)`
                        )}
                      </button>
                    </div>

                                         {/* ✅ NEW: Enhanced Radius Selector Dropdown */}
                     <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Radius Display
                      </label>
                      <select
                        value={radiusType}
                        onChange={(e) => handleRadiusTypeChange(e.target.value as RadiusType)}
                        className="w-full py-2.5 px-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors"
                        title="Select radius distance to display around facilities"
                      >
                        <option value="off">Off</option>
                        <option value="urban">Urban (20km)</option>
                        <option value="suburban">Suburban (30km)</option>
                        <option value="rural">Rural (60km)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Empty row between Facility Count and Active Layers */}
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

          {/* 
          DEMO_CODE_REMOVED: Facility Table Demo Button - Removed since table now connects to real marker clicks
          The table will display automatically when users click on facility markers:
          - Single marker click → single row in table
          - Numbered marker (cluster) click → multiple rows in table
          */}

          {/* 
          POPUP_CODE_PRESERVED: Close All Popups Button - Commented out for table-only system
          {openPopupsCount >= 2 && !tableVisible && (
            <div className="absolute top-4 right-4 z-50 space-y-2">
              <div className="bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                <button
                  onClick={handleCloseAllPopups}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 hover:text-gray-900 border-b border-gray-200"
                  title={`Close all ${openPopupsCount} facility popups`}
                >
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Close All ({openPopupsCount})
                </button>
                
                <div className="p-3 bg-gray-50 min-w-[200px]">
                  <div className="text-xs font-medium text-gray-600 mb-2">Open Facility Popups:</div>
                  <div className="space-y-1">
                    {Object.entries(facilityBreakdown).map(([facilityType, count]) => (
                      <div key={facilityType} className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">{getFacilityTypeName(facilityType)}</span>
                        <span className="font-medium text-gray-900 bg-white px-2 py-1 rounded text-xs">{count}</span>
                      </div>
                    ))}
                  </div>
                  {Object.keys(facilityBreakdown).length === 0 && (
                    <div className="text-sm text-gray-500 italic">Loading breakdown...</div>
                  )}
                </div>
              </div>
              
              {user?.id && (
                <div className="bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                  <button
                    onClick={handleSaveAllPopups}
                    disabled={saveAllLoading}
                    className={`w-full flex items-center gap-2 px-4 py-2 transition-colors text-sm font-medium ${
                      saveAllLoading
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : allFacilitiesSaved 
                          ? 'bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-900 border-red-200' 
                          : 'hover:bg-blue-50 text-blue-700 hover:text-blue-900'
                    }`}
                    title={saveAllLoading 
                      ? 'Processing...'
                      : allFacilitiesSaved 
                        ? `Remove all ${openPopupsCount} facilities from your saved locations`
                        : `Save all ${openPopupsCount} facility popups to your saved locations`
                    }
                  >
                    {saveAllLoading ? (
                      <svg 
                        className="w-4 h-4 animate-spin" 
                        fill="none" 
                        viewBox="0 0 24 24"
                      >
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    ) : allFacilitiesSaved ? (
                      <svg 
                        className="w-4 h-4" 
                        fill="currentColor" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    ) : (
                      <svg 
                        className="w-4 h-4" 
                        fill={allFacilitiesSaved ? "currentColor" : "none"} 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                        />
                      </svg>
                    )}
                    {allFacilitiesSaved 
                      ? `Unsave All (${openPopupsCount})`
                      : `Save All (${openPopupsCount})`
                    }
                  </button>
                </div>
              )}
            </div>
          )}
          END_POPUP_CODE_PRESERVED */}

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
              onHeatmapLoadingComplete={handleHeatmapLoadingComplete}
            />

            {/* Top/Bottom Rankings Panel - Next to Data Layers */}
            <TopBottomPanel
              rankedData={rankedData}
              isVisible={topBottomPanelVisible}
              onToggle={handleTopBottomPanelToggle}
              onRegionClick={handleRegionClick}
            />
          </div>

          {/* Facility Table - Modal */}
          <FacilityTable
            facilities={selectedFacilities}
            onFacilityDetails={navigateToFacilityDetails}
            onSaveFacility={async (facility) => {
              if (!user?.id) {
                alert('Please sign in to save facilities');
                return { success: false, error: 'User not signed in' };
              }

              try {
                // Import the required functions
                const { isSearchSaved, saveSearchToSavedSearches, deleteSavedSearch } = await import('../../lib/savedSearches');
                const { createBrowserSupabaseClient } = await import('../../lib/supabase');
                
                // Check if facility is already saved
                const isAlreadySaved = await isSearchSaved(user.id, facility.Service_Name);
                
                if (isAlreadySaved) {
                  // Unsave operation
                  try {
                    // Find the saved search ID by searching for it
                    const supabase = createBrowserSupabaseClient();
                    const { data: savedSearch, error: findError } = await supabase
                      .from('saved_searches')
                      .select('id')
                      .eq('user_id', user.id)
                      .or(`search_term.eq.${facility.Service_Name},search_display_name.eq.${facility.Service_Name}`)
                      .limit(1)
                      .single();

                    if (findError || !savedSearch) {
                      throw new Error('Could not find saved facility to remove');
                    }

                    // Delete the saved search
                    const result = await deleteSavedSearch(user.id, savedSearch.id);
                    
                    if (result.success) {
                      // Refresh saved searches
                      handleSavedSearchAdded();
                      
                      console.log(`✅ Removed from saved: ${facility.Service_Name}`);
                      return { success: true, isSaved: false };
                    } else {
                      throw new Error(result.error || 'Failed to remove facility');
                    }
                  } catch (error) {
                    console.error('Error removing facility:', error);
                    alert('An error occurred while removing the facility');
                    return { success: false, error: 'Failed to remove facility' };
                  }
                } else {
                  // Save operation
                  try {
                    // Create location data for the facility
                    const facilityLocationData = {
                      id: `facility-${facility.Service_Name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${facility.Longitude}-${facility.Latitude}`,
                      name: facility.Service_Name,
                      area: `${facility.Physical_State}${facility.Physical_Post_Code ? ' ' + facility.Physical_Post_Code : ''}`,
                      type: 'facility' as const,
                      state: facility.Physical_State,
                      center: [facility.Longitude, facility.Latitude] as [number, number],
                      bounds: undefined, // Facilities don't have bounds
                      address: facility.Physical_Address,
                      careType: facility.Care_Type,
                      facilityType: facility.facilityType
                    };

                    // Save the facility
                    const result = await saveSearchToSavedSearches(
                      user.id,
                      facility.Service_Name,
                      facilityLocationData,
                      'facility'
                    );

                    if (result.success) {
                      // Refresh saved searches
                      handleSavedSearchAdded();
                      
                      console.log(`✅ Saved: ${facility.Service_Name}`);
                      return { success: true, isSaved: true };
                    } else {
                      // Handle different error types
                      if (result.atLimit) {
                        alert('You have reached the maximum of 100 saved locations. Please delete some locations first.');
                        return { success: false, error: 'Save limit reached' };
                      } else if (result.error?.includes('already saved')) {
                        alert('This facility is already saved to your locations.');
                        return { success: false, error: 'Already saved' };
                      } else {
                        alert(result.error || 'Failed to save facility');
                        return { success: false, error: result.error || 'Failed to save facility' };
                      }
                    }
                  } catch (error) {
                    console.error('Error saving facility:', error);
                    alert('An error occurred while saving the facility');
                    return { success: false, error: 'Failed to save facility' };
                  }
                }
              } catch (error) {
                console.error('Error with save operation:', error);
                alert('An error occurred while processing the save operation');
                return { success: false, error: 'Save operation failed' };
              }
            }}
            onClose={() => {
              setTableVisible(false);
              setSelectedFacilities([]);
            }}
            isVisible={tableVisible}
            userId={user?.id}
            isLoading={tableLoading}
            markerGroup={selectedFacilities.length > 1 ? 'marker location' : undefined}
          />

          {/* Map Container - Full screen now */}
          <div className="absolute inset-0">
            <MapLoadingCoordinator 
              onLoadingComplete={handleLoadingComplete}
              mapRef={mapRef}
            >
              <AustralianMap
                ref={mapRef}
                className="w-full h-full"
                facilityTypes={bulkSelectionTypes}
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
                onFacilityDetailsClick={navigateToFacilityDetails}
                loadingComplete={loadingComplete}
                onFacilityTableSelection={handleFacilityTableSelection}
                radiusType={radiusType}
                bulkSelectionTypes={bulkSelectionTypes}
                onFacilityLoadingChange={handleFacilityLoadingChange}
                onHeatmapRenderComplete={() => {
                  console.log('🎉 Maps Page: Heatmap render complete, calling DataLayers callback');
                  // ✅ FIXED: Add safety check and async execution to prevent setState during render
                  if (heatmapCompletionCallback) {
                    setTimeout(() => {
                      heatmapCompletionCallback();
                      setHeatmapCompletionCallback(null);
                    }, 0);
                  }
                }}
              />
            </MapLoadingCoordinator>
            
            {/* ✅ NEW: Facility Loading Spinner */}
            <FacilityLoadingSpinner visible={facilitySpinnerVisible} />
            
                         {/* ✅ DEBUG: Manual Test Button */}
             <div className="absolute top-4 right-4 z-50 space-x-2">
               <button 
                 onClick={() => {
                   console.log('🧪 MANUAL TEST: Showing spinner for 3 seconds');
                   setFacilitySpinnerVisible(true);
                   setTimeout(() => {
                     console.log('🧪 MANUAL TEST: Hiding spinner');
                     setFacilitySpinnerVisible(false);
                   }, 3000);
                 }}
                 className="bg-red-500 text-white px-3 py-1 rounded text-xs"
               >
                 Test 3s
               </button>
               <button 
                 onClick={() => {
                   console.log('🧪 MANUAL TEST: Instant toggle');
                   setFacilitySpinnerVisible(!facilitySpinnerVisible);
                 }}
                 className="bg-blue-500 text-white px-3 py-1 rounded text-xs"
               >
                 Toggle
               </button>
             </div>
          </div>
        </main>
      </div>

      {/* Facility Details Modal */}
      <FacilityDetailsModal
        facility={selectedFacility}
        isOpen={facilityModalOpen}
        onClose={closeFacilityModal}
      />
    </div>
  );
} 