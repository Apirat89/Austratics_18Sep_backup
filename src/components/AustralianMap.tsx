'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

// Add import for the save functionality
import { saveSearchToSavedSearches, isSearchSaved, type LocationData } from '../lib/savedSearches';

// Add imports for heatmap functionality  
import LayerManager from './LayerManager';
import HeatmapDataService, { SA2HeatmapData, RankedSA2Data } from './HeatmapDataService';
import { globalLoadingCoordinator } from './MapLoadingCoordinator';

// Import the tracking utility
import { trackApiCall } from '@/lib/usageTracking';

// Removed magic wand imports - replaced with bulk selection system

// MapTiler API key - you'll need to add this to your environment variables
const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || 'YOUR_MAPTILER_API_KEY';

// ✅ PHASE 3: Debounce hook utility for stability
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

interface FacilityTypes {
  residential: boolean;
  multipurpose_others: boolean;
  home: boolean;
  retirement: boolean;
}

type GeoLayerType = 'sa2' | 'sa3' | 'sa4' | 'lga' | 'postcode' | 'locality' | 'acpr' | 'mmm';
type MapStyleType = 'basic' | 'topo' | 'satellite' | 'terrain' | 'streets';

interface FacilityData {
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

interface AustralianMapProps {
  className?: string;
  facilityTypes: FacilityTypes;
  selectedGeoLayer: GeoLayerType;
  selectedMapStyle: MapStyleType;
  mapNavigation?: {
    center?: [number, number];
    bounds?: [number, number, number, number];
    zoom?: number;
    searchResult?: any;
  } | null;
  onHighlightFeature?: (feature: string | null, featureName: string | null) => void;
  onClearSearchResult?: () => void;
  // Add new props for saving functionality
  userId?: string;
  onSavedSearchAdded?: () => void;
  // Add heatmap props
  heatmapVisible?: boolean;
  heatmapDataType?: 'healthcare' | 'demographics' | 'economics' | 'health-statistics';
  heatmapCategory?: string;
  heatmapSubcategory?: string;
  // Add callback for heatmap min/max values
  onHeatmapMinMaxCalculated?: (minValue: number | undefined, maxValue: number | undefined) => void;
  // Add callback for ranked data calculation
  onRankedDataCalculated?: (rankedData: RankedSA2Data | null) => void;
  // Add facility details modal callback
  onFacilityDetailsClick?: (facility: FacilityData) => void;
  // Add loading completion state for flickering fix
  loadingComplete?: boolean;
  // ✅ NEW: Heatmap completion callback for real-time loading indicator
  onHeatmapRenderComplete?: () => void;
  // ✅ NEW: Facility table selection callback to replace popup system
  onFacilityTableSelection?: (facilities: FacilityData[]) => void;
  // ✅ NEW: Enhanced radius feature with dropdown selector and facility type integration
  radiusType?: 'off' | 'urban' | 'suburban' | 'rural';
  bulkSelectionTypes?: FacilityTypes;
}

// Expose methods to parent component
export interface AustralianMapRef {
  clearHighlight: () => void;
  clearLastSearchResult: () => void;
  getPreloadState: () => { 
    preloadingData: boolean; 
    preloadProgress: { current: number; total: number };
    stylesPreloaded: boolean;
    stylePreloadProgress: { current: number; total: number };
  };
  closeAllPopups: () => number;
  getOpenPopupsCount: () => number;
  getFacilityTypeBreakdown: () => Record<string, number>;
  saveAllOpenFacilities: () => Promise<{success: boolean; saved: number; total: number; errors: string[]}>;
  // Add viewport change callback method
  onViewportChange: (callback: () => void) => void;
  // Add method to get current map bounds
  getBounds: () => { north: number; south: number; east: number; west: number } | null;
  // Add method to get all facilities
  getAllFacilities: () => FacilityData[];
}

// Helper function for point-in-polygon testing using ray casting algorithm
const isPointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
  if (!polygon || polygon.length < 3) return false; // Need at least 3 points for a polygon
  
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pointI = polygon[i];
    const pointJ = polygon[j];
    
    // Validate coordinate points
    if (!pointI || !pointJ || pointI.length < 2 || pointJ.length < 2) continue;
    
    const [xi, yi] = pointI;
    const [xj, yj] = pointJ;
    
    // Skip if coordinates are invalid
    if (typeof xi !== 'number' || typeof yi !== 'number' || 
        typeof xj !== 'number' || typeof yj !== 'number') continue;
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

// Helper function to calculate approximate area from geometry bounding box
const calculateBoundingBoxArea = (geometry: any): number => {
  try {
    const coordinates = geometry.type === 'MultiPolygon' 
      ? geometry.coordinates.flat(2) // Flatten all polygon rings
      : geometry.coordinates.flat(1); // Flatten polygon rings
    
    if (!coordinates || coordinates.length === 0) return Infinity;
    
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    coordinates.forEach((coord: [number, number]) => {
      if (coord && coord.length >= 2) {
        const [lng, lat] = coord;
        if (typeof lng === 'number' && typeof lat === 'number') {
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
        }
      }
    });
    
    if (minLng === Infinity) return Infinity;
    
    // Calculate approximate area (width × height in degrees)
    const area = (maxLng - minLng) * (maxLat - minLat);
    return area;
  } catch (error) {
    console.warn('Error calculating bounding box area:', error);
    return Infinity;
  }
};

// Enhanced helper to handle both Polygon and MultiPolygon geometries
const isPointInGeometry = (point: [number, number], geometry: any): boolean => {
  try {
    if (geometry.type === 'Polygon') {
      // For Polygon: coordinates[0] is the outer ring
      return isPointInPolygon(point, geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
      // For MultiPolygon: coordinates is array of polygons
      return geometry.coordinates.some((polygon: number[][][]) => {
        // Each polygon's first array is the outer ring
        return isPointInPolygon(point, polygon[0]);
      });
    }
    return false;
  } catch (error) {
    console.warn('Error in point-in-geometry test:', error);
    return false;
  }
};

// Enhanced helper with tolerance for postcode boundaries
const isPointInGeometryWithTolerance = (point: [number, number], geometry: any, tolerance: number = 0): boolean => {
  // First try exact match
  if (isPointInGeometry(point, geometry)) {
    return true;
  }
  
  // If tolerance is provided, try points around the original point
  if (tolerance > 0) {
    const [lng, lat] = point;
    const testPoints = [
      [lng + tolerance, lat],
      [lng - tolerance, lat],
      [lng, lat + tolerance],
      [lng, lat - tolerance],
      [lng + tolerance, lat + tolerance],
      [lng - tolerance, lat - tolerance],
      [lng + tolerance, lat - tolerance],
      [lng - tolerance, lat + tolerance]
    ];
    
    return testPoints.some(testPoint => isPointInGeometry(testPoint as [number, number], geometry));
  }
  
  return false;
};



// ✅ NEW: 20km radius feature - facility type colors (matching existing marker colors)
const getFacilityTypeColor = (facilityType: string): string => {
  const typeColors = {
    residential: '#E53E3E', // Red
    multipurpose_others: '#3182CE', // Blue
    home: '#38A169', // Green
    retirement: '#9B59B6' // Purple
  };
  return typeColors[facilityType as keyof typeof typeColors] || '#666666';
};

// ✅ NEW: 20km radius feature - calculate 20km radius in pixels
// ✅ NEW: Enhanced circle radius calculation for dynamic distances (20km/30km/60km)
const calculateRadiusInPixels = (map: maptilersdk.Map | null, centerLat: number, radiusKm: number): number => {
  if (!map) return 0;
  
  const zoom = map.getZoom();
  const earthCircumferenceMeters = 40075000; // Earth's circumference in meters
  const pixelsPerMeter = (256 * Math.pow(2, zoom)) / earthCircumferenceMeters;
  
  // Adjust for latitude (Mercator projection stretches near poles)
  const latRadians = (centerLat * Math.PI) / 180;
  const latitudeAdjustment = Math.cos(latRadians);
  
  const radiusMeters = radiusKm * 1000; // Convert km to meters
  return radiusMeters * pixelsPerMeter * latitudeAdjustment;
};

const AustralianMap = forwardRef<AustralianMapRef, AustralianMapProps>(({
  className = "",
  facilityTypes,
  selectedGeoLayer,
  selectedMapStyle,
  mapNavigation,
  onHighlightFeature,
  onClearSearchResult,
  userId,
  onSavedSearchAdded,
  heatmapVisible = false,
  heatmapDataType = 'healthcare',
  heatmapCategory,
  heatmapSubcategory,
  onHeatmapMinMaxCalculated,
  onRankedDataCalculated,
  onFacilityDetailsClick,
  loadingComplete = false,
  onHeatmapRenderComplete,
  onFacilityTableSelection,
  radiusType = 'off',
  bulkSelectionTypes
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  
  // Style cache to avoid destructive setStyle calls
  const styleCache = useRef<Record<MapStyleType, any>>({
    basic: null,
    topo: null,
    satellite: null,
    terrain: null,
    streets: null
  });
  const [stylesPreloaded, setStylesPreloaded] = useState(false);
  const [stylePreloadProgress, setStylePreloadProgress] = useState({ current: 0, total: 5 });
  const selectedGeoLayerRef = useRef<GeoLayerType>(selectedGeoLayer);
  const isInitialLoadRef = useRef<boolean>(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);
  const [highlightedFeature, setHighlightedFeature] = useState<string | null>(null);
  const [highlightedFeatureName, setHighlightedFeatureName] = useState<string | null>(null);
  
  // Add refs to prevent overlapping operations
  const isChangingStyleRef = useRef<boolean>(false);
  const boundaryLoadingRef = useRef<boolean>(false);
  const currentBoundaryLoadRef = useRef<AbortController | null>(null);
  
  // Cache for boundary data to avoid re-downloading
  const boundaryDataCache = useRef<Map<GeoLayerType, any>>(new Map());
  const [preloadingData, setPreloadingData] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState({ current: 0, total: 0 });
  const preloadCompleteRef = useRef<boolean>(false);
  
  // Track markers with proper cleanup
  const markersRef = useRef<maptilersdk.Marker[]>([]);
  
  // Track open facility popups for bulk close functionality
  const openPopupsRef = useRef<Set<maptilersdk.Popup>>(new Set());
  
  // Track facility types for each open popup
  const openPopupFacilityTypesRef = useRef<Map<maptilersdk.Popup, string>>(new Map());
  
  // Track facility data for each open popup (for Save All functionality)
  const openPopupFacilitiesRef = useRef<Map<maptilersdk.Popup, FacilityData>>(new Map());
  
  // ✅ NEW: 20km radius feature - circle rendering state (always enabled)
  const circlesRef = useRef<HTMLDivElement | null>(null);

  // ✅ NEW: Track cluster popup states for toggle behavior (Task 3.4)
  const clusterPopupStatesRef = useRef<Map<string, { isOpen: boolean, popups: maptilersdk.Popup[] }>>(new Map());

  // Add viewport change callback ref
  const viewportChangeCallbackRef = useRef<(() => void) | null>(null);
  
  // Track all facilities for counting
  const allFacilitiesRef = useRef<FacilityData[]>([]);

  // Function to get friendly facility type names for display
  const getFacilityTypeDisplayName = (facilityType: string): string => {
    switch (facilityType) {
      case 'residential': return 'RESIDENTIAL CARE';
      case 'multipurpose_others': return 'MULTI-PURPOSE SERVICE';
      case 'home': return 'HOME CARE';
      case 'retirement': return 'RETIREMENT LIVING';
      default: return facilityType.toUpperCase();
    }
  };
  
  // Track processed navigation to prevent repeated map movements
  const lastProcessedNavigationRef = useRef<string | null>(null);

  // Store last search result to maintain highlighting across interactions
  const [lastSearchResult, setLastSearchResult] = useState<any>(null);

  // Track data loading states
  const [heatmapData, setHeatmapData] = useState<SA2HeatmapData | null>(null);
  const [selectedHeatmapOption, setSelectedHeatmapOption] = useState<string>('');
  const [heatmapDataReady, setHeatmapDataReady] = useState<boolean>(false);
  
  // ✅ PHASE 2: Add facility loading coordination state
  const [facilityLoading, setFacilityLoading] = useState<boolean>(false);
  
  // ✅ PHASE 3: Add error recovery monitoring
  const [facilityError, setFacilityError] = useState<string | null>(null);
  const facilityRetryCountRef = useRef<number>(0);
  
  // Removed magic wand state - replaced with bulk selection system
  
  // ✅ PHASE 7: Add style change notification for heatmap
  // Style change notification system removed - LayerManager handles this directly

  // Handle heatmap data processing with coordination
  const handleHeatmapDataProcessed = useCallback((data: SA2HeatmapData | null, selectedOption: string) => {
    console.log('🗺️ AustralianMap: Heatmap data processed:', {
      hasData: !!data,
      dataLength: data ? Object.keys(data).length : 0,
      selectedOption,
      mapLoaded: isLoaded
    });
    
    setHeatmapData(data);
    setSelectedHeatmapOption(selectedOption);
    setHeatmapDataReady(!!data && Object.keys(data || {}).length > 0);
    
    // Log data readiness for debugging
    if (data && Object.keys(data).length > 0) {
      console.log('✅ AustralianMap: Heatmap data is ready for rendering');
      console.log('🎯 Sample data:', Object.entries(data).slice(0, 3));
    } else {
      console.log('❌ AustralianMap: No heatmap data available');
    }
  }, [isLoaded]);

  // Removed magic wand event handlers - replaced with bulk selection system

  // Stabilize facilityTypes to prevent unnecessary re-renders
  const stableFacilityTypes = useMemo(() => {
    console.log('🔄 SPINNER DEBUG: stableFacilityTypes updated:', facilityTypes);
    return facilityTypes;
  }, [
    facilityTypes.residential,
    facilityTypes.multipurpose_others,        // ✅ FIXED: Added missing MPS dependency
    facilityTypes.home,
    facilityTypes.retirement
  ]);
  
  // ✅ PHASE 3: Add debouncing for rapid facility changes (300ms delay)
  const debouncedFacilityTypes = useDebounce(stableFacilityTypes, 300);
  
  // Debug: Log when debounced types change
  useEffect(() => {
    console.log('🔄 SPINNER DEBUG: debouncedFacilityTypes changed:', debouncedFacilityTypes);
  }, [debouncedFacilityTypes]);

  // Map style mapping
  const getMapStyle = (style: MapStyleType) => {
    switch (style) {
      case 'basic':
        return maptilersdk.MapStyle.BASIC;
      case 'satellite':
        return maptilersdk.MapStyle.SATELLITE;
      case 'terrain':
        return maptilersdk.MapStyle.OUTDOOR;
      case 'streets':
        return maptilersdk.MapStyle.STREETS;
      case 'topo':
      default:
        return maptilersdk.MapStyle.TOPO;
    }
  };

  // Initialize map (only once)
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    maptilersdk.config.apiKey = MAPTILER_API_KEY;

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: getMapStyle(selectedMapStyle),
      center: [133.7751, -25.2744], // Center of Australia
      zoom: 4,
      maxZoom: 18,
      minZoom: 3,
      // 🔧 DISABLE automatic controls to prevent UI clutter and duplicates
      attributionControl: false,    // Disable automatic attribution control
      navigationControl: false      // Disable automatic navigation control (zoom buttons)
    });

    // 🔧 Add controls manually - ensures single set only (disabled automatic defaults above)
    map.current.addControl(new maptilersdk.NavigationControl(), 'top-right');
    map.current.addControl(new maptilersdk.ScaleControl(), 'bottom-right');

    map.current.on('load', () => {
      setIsLoaded(true);
      
      // Track map load event if user ID is available
      if (userId) {
        trackApiCall({
          userId,
          page: '/maps',
          service: 'maptiler',
          action: 'map_load',
          endpoint: 'MapTiler SDK',
          method: 'SDK'
        });
      }

      // Add click handler
      if (map.current) {
        map.current.on('click', handleMapClick);
        
        // Add viewport change event listeners
        map.current.on('moveend', () => {
          if (viewportChangeCallbackRef.current) {
            viewportChangeCallbackRef.current();
          }
        });
        
        map.current.on('zoomend', () => {
          if (viewportChangeCallbackRef.current) {
            viewportChangeCallbackRef.current();
          }
          

          
          // Removed magic wand zoom level detection - replaced with bulk selection system
        });
      }
      
      // Start preloading all boundary data and styles in background
      console.log('🗺️ Map loaded, starting data and style preloads...');
      preloadAllBoundaryData();
      preloadAllMapStyles();
      
      // Map loaded - let MapLoadingCoordinator handle the timing
      console.log('✅ Map loaded, MapLoadingCoordinator will handle rendering timing');
    });

    return () => {
      // Cleanup any pending operations
      if (currentBoundaryLoadRef.current) {
        currentBoundaryLoadRef.current.abort();
      }
      isChangingStyleRef.current = false;
      boundaryLoadingRef.current = false;
      
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Remove selectedMapStyle from dependencies

  // Preload all map styles to avoid destructive setStyle calls
  const preloadAllMapStyles = useCallback(async () => {
    if (stylesPreloaded) return;
    
    console.log('🎨 Starting preload of ALL map styles...');
    
    const styleTypes: MapStyleType[] = ['basic', 'topo', 'satellite', 'terrain', 'streets'];
    
    for (let i = 0; i < styleTypes.length; i++) {
      const styleType = styleTypes[i];
      
      try {
        console.log(`🎨 Preloading style ${i + 1}/${styleTypes.length}: ${styleType}`);
        setStylePreloadProgress({ current: i + 1, total: styleTypes.length });
        
        // Get the style spec - MapTiler styles are URLs, not objects
        const styleSpec = getMapStyle(styleType);
        console.log(`🔍 Style spec for ${styleType}:`, typeof styleSpec, styleSpec);
        
        let styleData;
        
        // MapTiler styles are URL strings, fetch the style JSON
        if (typeof styleSpec === 'string' && (styleSpec as string).startsWith('http')) {
          const styleSpecStr = styleSpec as string;
          const styleUrl = styleSpecStr.includes('?') ? `${styleSpecStr}&key=${MAPTILER_API_KEY}` : `${styleSpecStr}?key=${MAPTILER_API_KEY}`;
          console.log(`📥 Fetching style from: ${styleUrl}`);
          
          const response = await fetch(styleUrl);
          if (response.ok) {
            styleData = await response.json();
            console.log(`✅ Successfully fetched ${styleType} style JSON`);
          } else {
            console.warn(`⚠️ Failed to fetch ${styleType} style (${response.status}):`, response.statusText);
            styleData = styleSpec; // fallback to the URL
          }
        } else {
          // Use the spec as-is (could be an object or different format)
          styleData = styleSpec;
          console.log(`📝 Using ${styleType} style spec as-is`);
        }
        
        // Cache the style data
        styleCache.current[styleType] = styleData;
        console.log(`💾 Cached ${styleType} style successfully`);
        
        // Small delay between loads
        if (i < styleTypes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`❌ Failed to preload ${styleType} style:`, error);
        // Store the original style spec as fallback
        styleCache.current[styleType] = getMapStyle(styleType);
      }
    }
    
    setStylesPreloaded(true);
    setStylePreloadProgress({ current: styleTypes.length, total: styleTypes.length });
    console.log('🎉 ALL map styles preloaded successfully!');
    console.log(`🎨 Style cache contains: ${Object.keys(styleCache.current).filter(k => styleCache.current[k as MapStyleType]).join(', ')}`);
    
  }, [stylesPreloaded]);

  // Helper function to clear all existing markers
  const clearAllMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => {
      try {
        marker.remove();
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    markersRef.current = [];
    // Also clear tracked popups when markers are cleared
    openPopupsRef.current.clear();
    openPopupFacilityTypesRef.current.clear();
    openPopupFacilitiesRef.current.clear();
  }, []);

  // Helper function to close all open facility popups
  const closeAllPopups = useCallback(() => {
    console.log('🚪 Closing all facility popups:', openPopupsRef.current.size);
    
    // Close all tracked popups
    openPopupsRef.current.forEach((popup) => {
      try {
        popup.remove();
      } catch (error) {
        console.warn('Error closing popup:', error);
      }
    });
    
    // Clear the tracking sets and maps
    openPopupsRef.current.clear();
    openPopupFacilityTypesRef.current.clear();
    openPopupFacilitiesRef.current.clear();
    
    return openPopupsRef.current.size; // Should be 0 after clearing
  }, []);

  // Helper function to get facility type breakdown of open popups
  const getFacilityTypeBreakdown = useCallback(() => {
    const breakdown: Record<string, number> = {};
    
    // Count facility types from the tracking map
    openPopupFacilityTypesRef.current.forEach((facilityType) => {
      breakdown[facilityType] = (breakdown[facilityType] || 0) + 1;
    });
    
    return breakdown;
  }, []);

  // ✅ NEW: Helper function for instant UI feedback (prevents double-clicks)
  const updateAllPopupButtonStatesInstant = useCallback(() => {
    console.log('🚨 DIAGNOSTIC: updateAllPopupButtonStatesInstant FUNCTION ENTRY');
    console.log('⚡ Updating popup buttons instantly for UX...');
    
    // Get all currently open facilities
    const facilities = Array.from(openPopupFacilitiesRef.current.values());
    
    // Find all save buttons and update them instantly to "saved" state
    const allButtons = document.querySelectorAll('button');
    console.log('🚨 DIAGNOSTIC: Total buttons on page:', allButtons.length);
    console.log('🚨 DIAGNOSTIC: Button IDs:', Array.from(allButtons).map(b => b.id));
    
    const saveButtons = document.querySelectorAll('[id*="save-btn"]');
    console.log('🚨 DIAGNOSTIC: Save buttons found with [id*="save-btn"]:', saveButtons.length);
    let updated = 0;
    
    saveButtons.forEach((button) => {
      const saveButton = button as HTMLButtonElement;
      
      // ✅ INSTANT: Show as saved immediately for UX (update ALL save buttons)
      saveButton.innerHTML = '🗑️ Remove from Saved';
      saveButton.style.backgroundColor = '#EF4444';
      saveButton.style.borderColor = '#EF4444';
      saveButton.style.color = 'white';
      saveButton.style.pointerEvents = 'auto';
      updated++;
    });
    
    console.log(`⚡ Instantly updated ${updated} buttons to prevent double-clicks`);
  }, []);

  // ✅ NEW: Helper function to directly update all popup button states
  const updateAllPopupButtonStates = useCallback(async () => {
    console.log('🚨 DIAGNOSTIC: updateAllPopupButtonStates FUNCTION ENTRY');
    
    if (!userId) {
      console.log('🚨 DIAGNOSTIC: No userId, returning early');
      return;
    }

    console.log('🔄 Updating all popup button states directly...');
    
    try {
      // Import the function to check backend state
      const { isSearchSaved } = await import('../lib/savedSearches');
      
      // Get all currently open facilities
      const facilities = Array.from(openPopupFacilitiesRef.current.values());
      let updated = 0;
      
      for (const facility of facilities) {
        console.log(`🔍 Processing facility: ${facility.Service_Name}`);
        
        // Check actual backend state for this facility
        const isActuallySaved = await isSearchSaved(userId, facility.Service_Name);
        console.log(`🗄️ Backend state for ${facility.Service_Name}: ${isActuallySaved}`);
        
        // Find the save button for this facility using the service name
        const allButtons = document.querySelectorAll('button');
        console.log('🚨 DIAGNOSTIC: Total buttons on page:', allButtons.length);
        console.log('🚨 DIAGNOSTIC: Button IDs:', Array.from(allButtons).map(b => b.id));
        
        const saveButtons = document.querySelectorAll('[id*="save-btn"]');
        console.log(`🔍 Found ${saveButtons.length} save buttons on page`);
        
        // ✅ For "Save All", just update ALL buttons to saved state since we saved all facilities
        saveButtons.forEach((button, index) => {
          const buttonId = button.id;
          console.log(`🔍 Updating button ${index + 1}/${saveButtons.length} (ID: ${buttonId}) to saved state`);
          
          const saveButton = button as HTMLButtonElement;
          
          // ✅ Set all buttons to saved state for Save All operation
          saveButton.innerHTML = '🗑️ Remove from Saved';
          saveButton.style.backgroundColor = '#EF4444';
          saveButton.style.borderColor = '#EF4444';
          saveButton.style.color = 'white';
          saveButton.style.pointerEvents = 'auto';
          updated++;
          
          console.log(`✅ Updated button ${buttonId} to saved state`);
        });
        
        // Since this is Save All, break after first facility (all buttons updated)
        break;
      }
      
      console.log(`🎯 Updated ${updated} popup buttons with backend state`);
    } catch (error) {
      console.error('❌ Error updating popup button states:', error);
    }
  }, [userId]);

  // Helper function to save all open facility popups
  const saveAllOpenFacilities = useCallback(async () => {
    console.log('🚨 TRACE: saveAllOpenFacilities function STARTED');
    
    if (!userId) {
      throw new Error('Please sign in to save facilities');
    }

    const facilities = Array.from(openPopupFacilitiesRef.current.values());
    console.log('💾 Saving all open facilities:', facilities.length);

    if (facilities.length === 0) {
      return { success: true, saved: 0, total: 0, errors: [] };
    }

    // ✅ INSTANT UX: Update buttons immediately when Save All is clicked
    console.log('🚨 TRACE: About to call updateAllPopupButtonStatesInstant');
    try {
      updateAllPopupButtonStatesInstant();
      console.log('🚨 TRACE: updateAllPopupButtonStatesInstant completed');
    } catch (error) {
      console.error('🚨 ERROR: updateAllPopupButtonStatesInstant failed:', error);
    }

    const results = [];
    let savedCount = 0;
    const errors: string[] = [];

    // Import required functions
    const { saveSearchToSavedSearches, isSearchSaved } = await import('../lib/savedSearches');

    for (const facility of facilities) {
      try {
        // Check if already saved
        const alreadySaved = await isSearchSaved(userId, facility.Service_Name);
        if (alreadySaved) {
          console.log(`⏭️ Skipping ${facility.Service_Name} - already saved`);
          savedCount++; // ✅ Count as saved for UI purposes
          continue;
        }

        // Create location data for the facility
        const facilityLocationData: LocationData = {
          id: `facility-${facility.Service_Name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${facility.Longitude}-${facility.Latitude}`,
          name: facility.Service_Name,
          area: `${facility.Physical_State}${facility.Physical_Post_Code ? ' ' + facility.Physical_Post_Code : ''}`,
          type: 'facility',
          state: facility.Physical_State,
          center: [facility.Longitude, facility.Latitude],
          bounds: undefined,
          address: facility.Physical_Address,
          careType: facility.Care_Type,
          facilityType: facility.facilityType
        };

        // Save the facility
        const result = await saveSearchToSavedSearches(
          userId,
          facility.Service_Name,
          facilityLocationData,
          'facility'
        );

        if (result.success) {
          savedCount++;
          console.log(`✅ Saved: ${facility.Service_Name}`);
        } else {
          const errorMsg = result.error || 'Unknown error';
          
          // ✅ Handle duplicate key error gracefully (facility already saved)
          if (errorMsg.includes('duplicate key') || errorMsg.includes('already saved')) {
            console.log(`⏭️ ${facility.Service_Name} - already saved (caught duplicate)`);
            savedCount++; // Count as saved for UI purposes
          } else {
            errors.push(`${facility.Service_Name}: ${errorMsg}`);
            console.warn(`❌ Failed to save ${facility.Service_Name}: ${errorMsg}`);
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${facility.Service_Name}: ${errorMsg}`);
        console.error(`❌ Error saving ${facility.Service_Name}:`, error);
      }
    }

    // Notify parent component
    if (savedCount > 0) {
      onSavedSearchAdded?.();
    }

    // ✅ DELAYED VERIFICATION: Check actual backend state after database writes complete
    console.log('🚨 TRACE: About to set up delayed updateAllPopupButtonStates');
    Promise.resolve().then(async () => {
      console.log('🚨 TRACE: Delayed function starting, waiting 500ms...');
      // Wait 500ms for database writes to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('🚨 TRACE: About to call updateAllPopupButtonStates');
      await updateAllPopupButtonStates();
      console.log('🚨 TRACE: updateAllPopupButtonStates completed');
    }).catch(error => {
      console.error('🚨 ERROR: Error in delayed button state update:', error);
    });

    console.log('🚨 TRACE: saveAllOpenFacilities function ENDING');
    return {
      success: errors.length === 0,
      saved: savedCount,
      total: facilities.length,
      errors
    };
  }, [userId, onSavedSearchAdded]);

  // Helper function to handle facility hover
  const handleFacilityHover = useCallback((facility: any, markerElement: HTMLElement, isEntering: boolean) => {
    if (isEntering) {
      markerElement.style.transform = 'scale(1.2)';
      markerElement.style.zIndex = '25'; // Below heatmap menus (z-30) but above normal markers
    } else {
      markerElement.style.transform = 'scale(1)';
      markerElement.style.zIndex = '10'; // Base level for normal markers
    }
  }, []);

  // ✅ NEW: Helper function to calculate smart popup positions around a marker
  const calculatePopupPositions = useCallback((centerPos: [number, number], count: number): [number, number][] => {
    const [centerLng, centerLat] = centerPos;
    const baseOffset = 0.003; // ~330m spacing between popups (Task 3.5: increased for better separation)
    
    if (count === 1) {
      return [centerPos]; // Single popup at marker position (current behavior)
    } else if (count === 2) {
      return [
        [centerLng - baseOffset, centerLat], // Left
        [centerLng + baseOffset, centerLat]  // Right
      ];
    } else if (count === 3) {
      return [
        [centerLng, centerLat + baseOffset],                // Top
        [centerLng - baseOffset, centerLat - baseOffset/2], // Bottom Left
        [centerLng + baseOffset, centerLat - baseOffset/2]  // Bottom Right
      ];
    } else {
      // Circular arrangement for 4+ facilities
      return Array.from({ length: count }, (_, i) => {
        const angle = (2 * Math.PI * i) / count;
        return [
          centerLng + baseOffset * Math.cos(angle),
          centerLat + baseOffset * Math.sin(angle)
        ];
      });
    }
  }, []);

  // ✅ NEW: Helper function to create individual facility popup (extracted for reusability)
  const createIndividualFacilityPopup = useCallback((
    facility: any, 
    popupPosition: [number, number], 
    typeKey: string, 
    typeColors: Record<string, string>
  ) => {
    // Extract facility details
    const serviceName = facility.Service_Name || 'Unknown Service';
    const address = facility.Physical_Address || 'Address not available';
    const careType = facility.Care_Type || 'Unknown';
    const state = facility.Physical_State || '';
    const postcode = facility.Physical_Post_Code || '';
    const phone = facility.Phone || '';
    const email = facility.Email || '';
    const website = facility.Website || '';
    const residentialPlaces = facility.Residential_Places || 0;
    const homeCareMaxPlaces = facility.Home_Care_Max_Places || 0;
    const [lng, lat] = popupPosition;

    // Create unique popup ID for this facility
    const popupId = `facility-popup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Determine if this facility should show "See Details" button
    const showSeeDetailsButton = typeKey === 'residential' || typeKey === 'home';

    // Create beautiful popup with save button  
    const popup = new maptilersdk.Popup({ 
      offset: [0, -120], // Position popup above marker
      closeButton: true,
      closeOnClick: false,
      className: 'custom-popup draggable-popup',
      anchor: 'bottom'
    })
    .setLngLat(popupPosition) // ✅ NEW: Set popup at calculated position
    .setHTML(`
      <div class="aged-care-popup" id="${popupId}">
        <div class="popup-header" style="background: linear-gradient(135deg, ${typeColors[typeKey]}20, ${typeColors[typeKey]}10); border-left: 4px solid ${typeColors[typeKey]}; cursor: move;">
          <h3 class="popup-title">${serviceName}</h3>
          <span class="popup-type" style="background-color: ${typeColors[typeKey]}20; color: ${typeColors[typeKey]};">${getFacilityTypeDisplayName(typeKey)}</span>
        </div>
        
        <div class="popup-content">
          <div class="popup-section">
            <div class="popup-icon">📍</div>
            <div class="popup-text">
              <strong>${address}</strong><br>
              <span class="text-gray-500">${state}${postcode ? ' ' + postcode : ''}</span>
            </div>
          </div>
          
          ${residentialPlaces > 0 ? `
          <div class="popup-section">
            <div class="popup-icon">🏠</div>
            <div class="popup-text">
              <strong>${residentialPlaces}</strong> residential places
            </div>
          </div>
          ` : ''}
          
          ${homeCareMaxPlaces > 0 ? `
          <div class="popup-section">
            <div class="popup-icon">🏥</div>
            <div class="popup-text">
              <strong>${homeCareMaxPlaces}</strong> home care places
            </div>
          </div>
          ` : ''}
          
          ${phone ? `
          <div class="popup-section">
            <div class="popup-icon">📞</div>
            <div class="popup-text">
              <a href="tel:${phone}" class="popup-link">${phone}</a>
            </div>
          </div>
          ` : ''}
          
          ${email ? `
          <div class="popup-section">
            <div class="popup-icon">✉️</div>
            <div class="popup-text">
              <a href="mailto:${email}" class="popup-link">${email}</a>
            </div>
          </div>
          ` : ''}
          
          ${website ? `
          <div class="popup-section">
            <div class="popup-icon">🌐</div>
            <div class="popup-text">
              <a href="${website}" target="_blank" class="popup-link">Visit Website</a>
            </div>
          </div>
          ` : ''}
          
          ${showSeeDetailsButton || userId ? `
          <div class="popup-actions">
            ${showSeeDetailsButton ? `
            <button 
              id="details-btn-${popupId}"
              class="see-details-btn"
              onclick="window.seeDetails_${popupId.replace(/-/g, '_')}?.()"
              title="See details"
            >
              🚪 See Details
            </button>
            ` : ''}
            ${userId ? `
            <button 
              id="save-btn-${popupId}"
              class="save-facility-btn"
              onclick="window.saveFacility_${popupId.replace(/-/g, '_')}?.()"
            >
              ⏳ Checking...
            </button>
            ` : ''}
          </div>
          ` : ''}
          
          <div class="popup-footer">
            <small class="coordinates">📍 ${lng.toFixed(4)}, ${lat.toFixed(4)}</small>
          </div>
        </div>

                 <style>
          .aged-care-popup {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            max-width: 280px;
            margin: 0;
          }
          
          .popup-header {
            padding: 12px 16px;
            margin: -10px -10px 12px -10px;
            border-radius: 8px 8px 0 0;
          }
          
          .popup-title {
            font-size: 14px;
            font-weight: 600;
            color: #1a202c;
            margin: 0 0 4px 0;
            line-height: 1.3;
          }
          
          .popup-type {
            display: inline-block;
            padding: 2px 8px;
            font-size: 11px;
            font-weight: 500;
            border-radius: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .popup-content {
            padding: 0;
          }
          
          .popup-section {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            margin-bottom: 10px;
            padding: 2px 0;
          }
          
          .popup-icon {
            font-size: 12px;
            width: 16px;
            flex-shrink: 0;
            margin-top: 1px;
          }
          
          .popup-text {
            font-size: 12px;
            line-height: 1.4;
            color: #2d3748;
            flex: 1;
          }
          
          .popup-link {
            color: #3182ce;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-color 0.2s;
          }
          
          .popup-link:hover {
            border-bottom-color: #3182ce;
          }
          
          .popup-actions {
            margin: 16px 0 8px 0;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          
          .see-details-btn {
            width: 100%;
            padding: 8px 16px;
            background-color: #10B981;
            color: white;
            border: 1px solid #10B981;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
          }
          
          .see-details-btn:hover {
            background-color: #059669;
            border-color: #059669;
          }
          
          .see-details-btn:active {
            transform: translateY(1px);
          }
          
          .save-facility-btn {
            width: 100%;
            padding: 8px 16px;
            background-color: #3B82F6;
            color: white;
            border: 1px solid #3B82F6;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
          }
          
          .save-facility-btn:hover {
            background-color: #2563EB;
            border-color: #2563EB;
          }
          
          .save-facility-btn:active {
            transform: translateY(1px);
          }
          
          .popup-footer {
            margin-top: 12px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
          }
          
          .coordinates {
            font-size: 10px;
            color: #718096;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
          }
          
          .text-gray-500 {
            color: #718096;
          }
        </style>
      </div>
    `);

    return { popup, popupId, facility, serviceName, typeKey };
  }, [userId, onFacilityDetailsClick, getFacilityTypeDisplayName]);

  // ✅ NEW: Helper function to create multiple popups for clustered facilities
  const createClusterPopups = useCallback((
    clusterFacilities: any[], 
    basePosition: [number, number], 
    typeKey: string, 
    typeColors: Record<string, string>
  ) => {
    const positions = calculatePopupPositions(basePosition, clusterFacilities.length);
    const createdPopups: Array<{popup: any, popupId: string, facility: any, serviceName: string, typeKey: string}> = [];
    
    clusterFacilities.forEach((facility, index) => {
      const position = positions[index];
      const popupData = createIndividualFacilityPopup(facility, position, typeKey, typeColors);
      createdPopups.push(popupData);
    });
    
    console.log(`🎯 Created ${createdPopups.length} cluster popups at positions:`, positions);
    return createdPopups;
  }, [calculatePopupPositions, createIndividualFacilityPopup]);

  // Load healthcare facilities with proper coordinate handling
  const addHealthcareFacilities = useCallback(async (types: FacilityTypes) => {
    if (!map.current) return;

    try {
      console.log('🏥 Loading hybrid facility data...');
      
      // ✅ PHASE 4: Performance optimization - future SA2 data sharing
      // TODO: Implement SA2 data sharing between facility and heatmap systems
      // This would eliminate the 170MB data duplication (340MB → 170MB)
      
      // Import and use the hybrid facility service
      const { hybridFacilityService } = await import('../lib/HybridFacilityService');
      const enhancedFacilities = await hybridFacilityService.loadAllFacilities();
      
      // Store all facilities for counting
      allFacilitiesRef.current = enhancedFacilities;
      
      console.log('🏥 Enhanced facility data loaded:', { 
        totalFacilities: enhancedFacilities.length
      });
      
      if (!enhancedFacilities || enhancedFacilities.length === 0) {
        console.warn('❌ No facilities found in enhanced data');
        return;
      }

      // Define care type mapping
      const careTypeMapping = {
        residential: ['Residential'],
        multipurpose_others: ['Multi-Purpose Service'],
        home: ['Home Care', 'Community Care'],
        retirement: ['Retirement', 'Retirement Living', 'Retirement Village']
      };

      // Define colors for each type
      const typeColors = {
        residential: '#E53E3E', // Red
        multipurpose_others: '#3182CE',        // Blue
        home: '#38A169',       // Green
        retirement: '#9B59B6'   // Purple
      };

      // Process each enabled facility type
      Object.entries(types).forEach(([type, enabled]) => {
        if (!enabled) return;

        const typeKey = type as keyof typeof careTypeMapping;
        
        // Filter facilities based on facility type (already determined by hybrid service)
        const filteredFacilities = enhancedFacilities.filter((facility) => {
          return facility.facilityType === typeKey;
        });

        let validFacilities = 0;
        let invalidCoordinates = 0;
        let outsideBounds = 0;

        // Add markers for filtered facilities
        filteredFacilities.forEach((facility, index: number) => {
          // Use facility data directly (no properties wrapper needed)
          const lat = facility.Latitude;
          const lng = facility.Longitude;
          
          // Validate coordinates exist and are numbers
          if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            invalidCoordinates++;
            return;
          }
          
          // Basic coordinate validation
          if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
            invalidCoordinates++;
            return;
          }
          
          // Australian bounds validation (lng: 112-154, lat: -44 to -9)
          if (lng < 112 || lng > 154 || lat < -44 || lat > -9) {
            outsideBounds++;
            return;
          }

          validFacilities++;
          
          // Create marker element
          const markerElement = document.createElement('div');
          markerElement.className = 'aged-care-marker';
          markerElement.style.width = '12px';
          markerElement.style.height = '12px';
          markerElement.style.backgroundColor = typeColors[typeKey];
          markerElement.style.border = '2px solid white';
          markerElement.style.borderRadius = '50%';
          markerElement.style.cursor = 'pointer';
          markerElement.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
          markerElement.style.zIndex = '10'; // Base level for normal markers, below heatmap menus (z-30)
          
          // ✅ ADD: Facility type metadata for instant visibility control
          markerElement.setAttribute('data-facility-type', typeKey); // Base level for normal markers, below heatmap menus (z-30)

          // Extract facility details
          const serviceName = facility.Service_Name || 'Unknown Service';
          const address = facility.Physical_Address || 'Address not available';
          const careType = facility.Care_Type || 'Unknown';
          const state = facility.Physical_State || '';
          const postcode = facility.Physical_Post_Code || '';
          const phone = facility.Phone || '';
          const email = facility.Email || '';
          const website = facility.Website || '';
          const residentialPlaces = facility.Residential_Places || 0;
          const homeCareMaxPlaces = facility.Home_Care_Max_Places || 0;

          // Create unique popup ID for this facility
          const popupId = `facility-popup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // ✅ ENHANCED: Check for overlapping facilities (clustering logic with multi-popup support)
          const overlapTolerance = 0.001; // ~100m
          const overlappingFacilities = filteredFacilities.filter(otherFacility => {
            if (otherFacility === facility) return false;
            const otherLat = otherFacility.Latitude;
            const otherLng = otherFacility.Longitude;
            if (!otherLat || !otherLng) return false;
            
            const latDiff = Math.abs(otherLat - lat);
            const lngDiff = Math.abs(otherLng - lng);
            return latDiff <= overlapTolerance && lngDiff <= overlapTolerance;
          });

          // ✅ NEW: Store all cluster facility data for multi-popup creation
          const allClusterFacilities = overlappingFacilities.length > 0 
            ? [facility, ...overlappingFacilities] 
            : [facility];
          const isClusterMarker = overlappingFacilities.length > 0;

          // If there are overlapping facilities, create cluster marker
          if (isClusterMarker) {
            const clusterSize = allClusterFacilities.length;
            
            // Modify marker to show cluster count
            markerElement.style.width = '25px';
            markerElement.style.height = '25px';
            markerElement.style.backgroundColor = '#ffffff';
            markerElement.style.border = `3px solid ${typeColors[typeKey]}`;
            markerElement.style.display = 'flex';
            markerElement.style.alignItems = 'center';
            markerElement.style.justifyContent = 'center';
            markerElement.style.fontSize = '11px';
            markerElement.style.fontWeight = 'bold';
            markerElement.style.color = typeColors[typeKey];
            markerElement.style.zIndex = '20'; // Below heatmap menus (z-30) but above normal markers
            markerElement.textContent = clusterSize.toString();
            
            console.log(`🎯 Cluster marker created: ${clusterSize} facilities at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }

          // Helper function to handle facility saving
          const handleSaveFacility = async () => {
            if (!userId) {
              alert('Please sign in to save facilities');
              return;
            }

            const saveButton = document.getElementById(`save-btn-${popupId}`);
            if (!saveButton) return;

            // ✅ CRITICAL FIX: Check actual backend state instead of button text
            saveButton.innerHTML = '⏳ Checking...';
            saveButton.style.pointerEvents = 'none';

            try {
              // Import the functions to check backend state and save facilities
              const { isSearchSaved, saveSearchToSavedSearches } = await import('../lib/savedSearches');
              
              // ✅ Check actual backend state (not button state)
              const isActuallySaved = await isSearchSaved(userId, serviceName);
              
              if (isActuallySaved) {
              // Unsave operation
              saveButton.innerHTML = '⏳ Removing...';
              saveButton.style.pointerEvents = 'none';

              try {
                // Find the saved search ID by searching for it
                const { createBrowserSupabaseClient } = await import('../lib/supabase');
                const supabase = createBrowserSupabaseClient();
                const { data: savedSearch, error: findError } = await supabase
                  .from('saved_searches')
                  .select('id')
                  .eq('user_id', userId)
                  .or(`search_term.eq.${serviceName},search_display_name.eq.${serviceName}`)
                  .limit(1)
                  .single();

                if (findError || !savedSearch) {
                  throw new Error('Could not find saved facility to remove');
                }

                // Delete the saved search
                const { deleteSavedSearch } = await import('../lib/savedSearches');
                const result = await deleteSavedSearch(userId, savedSearch.id);
                
                if (result.success) {
                  // Show success state
                  saveButton.innerHTML = '📍 Save Location';
                  saveButton.style.backgroundColor = '#3B82F6';
                  saveButton.style.borderColor = '#3B82F6';
                  saveButton.style.pointerEvents = 'auto';
                  
                  // Notify parent component
                  onSavedSearchAdded?.();
                  
                  // Trigger event for other popups to update
                  window.dispatchEvent(new CustomEvent('facilityUnsaved', { 
                    detail: { facilityName: serviceName } 
                  }));
                } else {
                  throw new Error(result.error || 'Failed to remove facility');
                }
              } catch (error) {
                console.error('Error removing facility:', error);
                saveButton.innerHTML = '❌ Error';
                saveButton.style.backgroundColor = '#EF4444';
                saveButton.style.borderColor = '#EF4444';
                alert('An error occurred while removing the facility');
                
                // Reset button after 3 seconds
                setTimeout(() => {
                  saveButton.innerHTML = '🗑️ Remove from Saved';
                  saveButton.style.backgroundColor = '#EF4444';
                  saveButton.style.borderColor = '#EF4444';
                  saveButton.style.pointerEvents = 'auto';
                }, 3000);
              }
            } else {
              // Save operation (existing code)
              saveButton.innerHTML = '⏳ Saving...';
              saveButton.style.pointerEvents = 'none';

              try {
                // Create location data for the facility
                const facilityLocationData: LocationData = {
                  id: `facility-${serviceName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${lng}-${lat}`,
                  name: serviceName,
                  area: `${state}${postcode ? ' ' + postcode : ''}`,
                  type: 'facility',
                  state: state,
                  center: [lng, lat],
                  bounds: undefined, // Facilities don't have bounds
                  address: address,
                  careType: careType,
                  facilityType: typeKey as 'residential' | 'multipurpose_others' | 'home' | 'retirement'
                };

                // Save the facility
                const result = await saveSearchToSavedSearches(
                  userId,
                  serviceName,
                  facilityLocationData,
                  'facility'
                );

                if (result.success) {
                  // Show success state
                  saveButton.innerHTML = '🗑️ Remove from Saved';
                  saveButton.style.backgroundColor = '#EF4444';
                  saveButton.style.borderColor = '#EF4444';
                  saveButton.style.pointerEvents = 'auto';
                  
                  // Notify parent component
                  onSavedSearchAdded?.();
                  
                  // Trigger event for other popups to update
                  window.dispatchEvent(new CustomEvent('facilitySaved', { 
                    detail: { facilityName: serviceName } 
                  }));
                } else {
                  // Show error state
                  saveButton.innerHTML = '❌ Error';
                  saveButton.style.backgroundColor = '#EF4444';
                  saveButton.style.borderColor = '#EF4444';
                  
                  // Show error message
                  if (result.atLimit) {
                    alert('You have reached the maximum of 100 saved locations. Please delete some locations first.');
                  } else if (result.error?.includes('already saved')) {
                    alert('This facility is already saved to your locations.');
                    // Update button to show it's saved
                    setTimeout(() => {
                      saveButton.innerHTML = '🗑️ Remove from Saved';
                      saveButton.style.backgroundColor = '#EF4444';
                      saveButton.style.borderColor = '#EF4444';
                      saveButton.style.pointerEvents = 'auto';
                    }, 1000);
                  } else {
                    alert(result.error || 'Failed to save facility');
                    // Reset button after 3 seconds
                    setTimeout(() => {
                      saveButton.innerHTML = '📍 Save Location';
                      saveButton.style.backgroundColor = '#3B82F6';
                      saveButton.style.borderColor = '#3B82F6';
                      saveButton.style.pointerEvents = 'auto';
                    }, 3000);
                  }
                }
              } catch (error) {
                console.error('Error saving facility:', error);
                saveButton.innerHTML = '❌ Error';
                saveButton.style.backgroundColor = '#EF4444';
                saveButton.style.borderColor = '#EF4444';
                alert('An error occurred while saving the facility');
                
                // Reset button after 3 seconds
                setTimeout(() => {
                  saveButton.innerHTML = '📍 Save Location';
                  saveButton.style.backgroundColor = '#3B82F6';
                  saveButton.style.borderColor = '#3B82F6';
                  saveButton.style.pointerEvents = 'auto';
                }, 3000);
              }
            }
            } catch (error) {
              // ✅ Handle any errors in backend state checking
              console.error('Error checking facility saved state:', error);
              saveButton.innerHTML = '❌ Error';
              saveButton.style.backgroundColor = '#EF4444';
              saveButton.style.borderColor = '#EF4444';
              alert('An error occurred while checking facility status');
              
              // Reset button after 3 seconds
              setTimeout(() => {
                saveButton.innerHTML = '📍 Save Location';
                saveButton.style.backgroundColor = '#3B82F6';
                saveButton.style.borderColor = '#3B82F6';
                saveButton.style.pointerEvents = 'auto';
              }, 3000);
            }
          };

          // Helper function to check if facility is saved and update button
          const updateSaveButtonState = async () => {
            if (!userId) return;

            const saveButton = document.getElementById(`save-btn-${popupId}`);
            if (!saveButton) return;

            try {
              const isSaved = await isSearchSaved(userId, serviceName);
              if (isSaved) {
                saveButton.innerHTML = '🗑️ Remove from Saved';
                saveButton.style.backgroundColor = '#EF4444';
                saveButton.style.borderColor = '#EF4444';
              } else {
                saveButton.innerHTML = '📍 Save Location';
                saveButton.style.backgroundColor = '#3B82F6';
                saveButton.style.borderColor = '#3B82F6';
              }
              saveButton.style.pointerEvents = 'auto';
            } catch (error) {
              console.error('Error checking saved status:', error);
              // Default to save state on error
              saveButton.innerHTML = '📍 Save Location';
              saveButton.style.backgroundColor = '#3B82F6';
              saveButton.style.borderColor = '#3B82F6';
              saveButton.style.pointerEvents = 'auto';
            }
          };

          // Helper function to handle facility details modal
          const handleSeeDetails = () => {
            if (onFacilityDetailsClick) {
              onFacilityDetailsClick(facilityData);
            }
          };

          // Determine if this facility should show "See Details" button (only homecare and residential)
          const showSeeDetailsButton = typeKey === 'residential' || typeKey === 'home' || typeKey === 'multipurpose_others' || typeKey === 'retirement';

          // Create beautiful popup with save button  
          const popup = new maptilersdk.Popup({ 
            offset: [0, -120], // Position popup above marker: [horizontal, vertical] offset (increased to -120)
            closeButton: true,
            closeOnClick: false,
            className: 'custom-popup draggable-popup',
            anchor: 'bottom' // Force popup to appear above marker
          })
          .setHTML(`
            <div class="aged-care-popup" id="${popupId}">
              <div class="popup-header" style="background: linear-gradient(135deg, ${typeColors[typeKey]}20, ${typeColors[typeKey]}10); border-left: 4px solid ${typeColors[typeKey]}; cursor: move;">
                <h3 class="popup-title">${serviceName}</h3>
                <span class="popup-type" style="background-color: ${typeColors[typeKey]}20; color: ${typeColors[typeKey]};">${getFacilityTypeDisplayName(typeKey)}</span>
              </div>
              
              <div class="popup-content">
                <div class="popup-section">
                  <div class="popup-icon">📍</div>
                  <div class="popup-text">
                    <strong>${address}</strong><br>
                    <span class="text-gray-500">${state}${postcode ? ' ' + postcode : ''}</span>
                  </div>
                </div>
                
                ${residentialPlaces > 0 ? `
                <div class="popup-section">
                  <div class="popup-icon">🏠</div>
                  <div class="popup-text">
                    <strong>${residentialPlaces}</strong> residential places
                  </div>
                </div>
                ` : ''}
                
                ${homeCareMaxPlaces > 0 ? `
                <div class="popup-section">
                  <div class="popup-icon">🏥</div>
                  <div class="popup-text">
                    <strong>${homeCareMaxPlaces}</strong> home care places
                  </div>
                </div>
                ` : ''}
                
                ${phone ? `
                <div class="popup-section">
                  <div class="popup-icon">📞</div>
                  <div class="popup-text">
                    <a href="tel:${phone}" class="popup-link">${phone}</a>
                  </div>
                </div>
                ` : ''}
                
                ${email ? `
                <div class="popup-section">
                  <div class="popup-icon">✉️</div>
                  <div class="popup-text">
                    <a href="mailto:${email}" class="popup-link">${email}</a>
                  </div>
                </div>
                ` : ''}
                
                ${website ? `
                <div class="popup-section">
                  <div class="popup-icon">🌐</div>
                  <div class="popup-text">
                    <a href="${website}" target="_blank" class="popup-link">Visit Website</a>
                  </div>
                </div>
                ` : ''}
                
                ${showSeeDetailsButton || userId ? `
                <div class="popup-actions">
                  ${showSeeDetailsButton ? `
                  <button 
                    id="details-btn-${popupId}"
                    class="see-details-btn"
                    onclick="window.seeDetails_${popupId.replace(/-/g, '_')}?.()"
                    title="See details"
                  >
                    🚪 See Details
                  </button>
                  ` : ''}
                  ${userId ? `
                  <button 
                    id="save-btn-${popupId}"
                    class="save-facility-btn"
                    onclick="window.saveFacility_${popupId.replace(/-/g, '_')}?.()"
                  >
                    ⏳ Checking...
                  </button>
                  ` : ''}
                </div>
                ` : ''}
                
                <div class="popup-footer">
                  <small class="coordinates">📍 ${lng.toFixed(4)}, ${lat.toFixed(4)}</small>
                </div>
              </div>

              <style>
                .aged-care-popup {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                  max-width: 280px;
                  margin: 0;
                }
                
                .popup-header {
                  padding: 12px 16px;
                  margin: -10px -10px 12px -10px;
                  border-radius: 8px 8px 0 0;
                }
                
                .popup-title {
                  font-size: 14px;
                  font-weight: 600;
                  color: #1a202c;
                  margin: 0 0 4px 0;
                  line-height: 1.3;
                }
                
                .popup-type {
                  display: inline-block;
                  padding: 2px 8px;
                  font-size: 11px;
                  font-weight: 500;
                  border-radius: 12px;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                }
                
                .popup-content {
                  padding: 0;
                }
                
                .popup-section {
                  display: flex;
                  align-items: flex-start;
                  gap: 8px;
                  margin-bottom: 10px;
                  padding: 2px 0;
                }
                
                .popup-icon {
                  font-size: 12px;
                  width: 16px;
                  flex-shrink: 0;
                  margin-top: 1px;
                }
                
                .popup-text {
                  font-size: 12px;
                  line-height: 1.4;
                  color: #2d3748;
                  flex: 1;
                }
                
                .popup-link {
                  color: #3182ce;
                  text-decoration: none;
                  border-bottom: 1px solid transparent;
                  transition: border-color 0.2s;
                }
                
                .popup-link:hover {
                  border-bottom-color: #3182ce;
                }
                
                .popup-actions {
                  margin: 16px 0 8px 0;
                  padding-top: 12px;
                  border-top: 1px solid #e2e8f0;
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
                }
                
                .see-details-btn {
                  width: 100%;
                  padding: 8px 16px;
                  background-color: #10B981;
                  color: white;
                  border: 1px solid #10B981;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 4px;
                }
                
                .see-details-btn:hover {
                  background-color: #059669;
                  border-color: #059669;
                }
                
                .see-details-btn:active {
                  transform: translateY(1px);
                }
                
                .save-facility-btn {
                  width: 100%;
                  padding: 8px 16px;
                  background-color: #3B82F6;
                  color: white;
                  border: 1px solid #3B82F6;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 4px;
                }
                
                .save-facility-btn:hover {
                  background-color: #2563EB;
                  border-color: #2563EB;
                }
                
                .save-facility-btn:active {
                  transform: translateY(1px);
                }
                
                .popup-footer {
                  margin-top: 12px;
                  padding-top: 8px;
                  border-top: 1px solid #e2e8f0;
                }
                
                .coordinates {
                  font-size: 10px;
                  color: #718096;
                  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
                }
                
                .text-gray-500 {
                  color: #718096;
                }
              </style>
            </div>
          `);

          // Add functions to the global window object for this specific popup
          const functionName = `saveFacility_${popupId.replace(/-/g, '_')}`;
          const updateFunctionName = `updateSaveButton_${popupId.replace(/-/g, '_')}`;
          const detailsFunctionName = `seeDetails_${popupId.replace(/-/g, '_')}`;
          
          // Add functions to window object
          if (userId) {
            (window as any)[functionName] = handleSaveFacility;
            (window as any)[updateFunctionName] = updateSaveButtonState;
          }
          
          if (showSeeDetailsButton) {
            (window as any)[detailsFunctionName] = handleSeeDetails;
          }
          
          // Listen for save/unsave events from other sources (only if userId exists)
          if (userId) {
            const handleFacilitySaved = (event: CustomEvent) => {
              if (event.detail.facilityName === serviceName) {
                updateSaveButtonState();
              }
            };
            
            const handleFacilityUnsaved = (event: CustomEvent) => {
              if (event.detail.facilityName === serviceName) {
                updateSaveButtonState();
              }
            };
            
            const handleSavedSearchDeleted = (event: CustomEvent) => {
              if (event.detail.deletedSearchTerm === serviceName) {
                updateSaveButtonState();
              }
            };
            
            window.addEventListener('facilitySaved', handleFacilitySaved as EventListener);
            window.addEventListener('facilityUnsaved', handleFacilityUnsaved as EventListener);
            window.addEventListener('savedSearchDeleted', handleSavedSearchDeleted as EventListener);
            
            // Clean up when popup is closed
            popup.on('close', () => {
              // Remove this popup from open tracking
              openPopupsRef.current.delete(popup);
              openPopupFacilityTypesRef.current.delete(popup);
              openPopupFacilitiesRef.current.delete(popup);
              delete (window as any)[functionName];
              delete (window as any)[updateFunctionName];
              if (showSeeDetailsButton) {
                delete (window as any)[detailsFunctionName];
              }
              window.removeEventListener('facilitySaved', handleFacilitySaved as EventListener);
              window.removeEventListener('facilityUnsaved', handleFacilityUnsaved as EventListener);
              window.removeEventListener('savedSearchDeleted', handleSavedSearchDeleted as EventListener);
            });
            
            // Check initial save status when popup opens
            popup.on('open', () => {
              setTimeout(updateSaveButtonState, 100); // Small delay to ensure DOM is ready
            });
          } else if (showSeeDetailsButton) {
            // If only "See Details" button exists (no userId), still need cleanup
            popup.on('close', () => {
              // Remove this popup from open tracking
              openPopupsRef.current.delete(popup);
              openPopupFacilityTypesRef.current.delete(popup);
              openPopupFacilitiesRef.current.delete(popup);
              delete (window as any)[detailsFunctionName];
            });
          }

          // Create facility data object for tracking
          const facilityData: FacilityData = {
            OBJECTID: facility.OBJECTID || 0,
            Service_Name: serviceName,
            Physical_Address: address,
            Physical_Suburb: facility.Physical_Suburb || '',
            Physical_State: state,
            Physical_Post_Code: postcode || 0,
            Care_Type: careType,
            Residential_Places: residentialPlaces || null,
            Home_Care_Places: facility.Home_Care_Places || null,
            Home_Care_Max_Places: homeCareMaxPlaces || null,
            Restorative_Care_Places: facility.Restorative_Care_Places || null,
            Provider_Name: facility.Provider_Name || '',
            Organisation_Type: facility.Organisation_Type || '',
            ABS_Remoteness: facility.ABS_Remoteness || '',
            Phone: phone || undefined,
            Email: email || undefined,
            Website: website || undefined,
            Latitude: lat,
            Longitude: lng,
            F2019_Aged_Care_Planning_Region: facility.F2019_Aged_Care_Planning_Region || '',
            F2016_SA2_Name: facility.F2016_SA2_Name || '',
            F2016_SA3_Name: facility.F2016_SA3_Name || '',
            F2016_LGA_Name: facility.F2016_LGA_Name || '',
            facilityType: typeKey as 'residential' | 'multipurpose_others' | 'home' | 'retirement'
          };

          // Track popup open/close events for all popups
          popup.on('open', () => {
            // Track this popup as open with its facility type and data
            openPopupsRef.current.add(popup);
            openPopupFacilityTypesRef.current.set(popup, typeKey);
            openPopupFacilitiesRef.current.set(popup, facilityData);
            
            // Add draggable functionality with smooth movement - entire popup draggable
            const popupElement = document.getElementById(popupId);
            if (popupElement) {
              let isDragging = false;
              let initialPopupCoords: any = null;
              let initialMouseX = 0, initialMouseY = 0;

              // Set cursor style for entire popup
              popupElement.style.cursor = 'move';

              const handleMouseDown = (e: MouseEvent) => {
                // Prevent dragging if user clicks on buttons or interactive elements
                const target = e.target as HTMLElement;
                if (target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'A' || target.closest('a')) {
                  return;
                }

                isDragging = true;
                // ✅ FIXED: Store popup's starting position and mouse starting position
                initialPopupCoords = popup.getLngLat();
                initialMouseX = e.clientX;
                initialMouseY = e.clientY;
                popupElement.style.cursor = 'grabbing';
                e.preventDefault();
                console.log('🎯 Popup drag started at:', initialPopupCoords);
              };

              const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging || !initialPopupCoords) return;
                
                // ✅ FIXED: Calculate movement delta from initial click position
                const deltaX = e.clientX - initialMouseX;
                const deltaY = e.clientY - initialMouseY;
                
                // ✅ FIXED: Apply delta to initial popup position, not cursor position
                if (map.current) {
                  const initialScreenCoords = map.current.project(initialPopupCoords);
                  const newScreenCoords: [number, number] = [
                    initialScreenCoords.x + deltaX,
                    initialScreenCoords.y + deltaY
                  ];
                  const newMapCoords = map.current.unproject(newScreenCoords);
                  popup.setLngLat(newMapCoords);
                }
              };

              const handleMouseUp = () => {
                if (isDragging) {
                  isDragging = false;
                  popupElement.style.cursor = 'move';
                  console.log('🎯 Popup drag completed at:', popup.getLngLat());
                }
              };

              popupElement.addEventListener('mousedown', handleMouseDown);
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
              
              // Store cleanup function for later removal
              (popupElement as any).dragCleanup = () => {
                popupElement.removeEventListener('mousedown', handleMouseDown);
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
            }
          });

          // Add general close event listener for popups without save/details buttons
          if (!userId && !showSeeDetailsButton) {
            popup.on('close', () => {
              // Remove this popup from open tracking
              openPopupsRef.current.delete(popup);
              openPopupFacilityTypesRef.current.delete(popup);
              openPopupFacilitiesRef.current.delete(popup);
              
              // Clean up drag listeners
              const popupElement = document.getElementById(popupId);
              if (popupElement && (popupElement as any).dragCleanup) {
                (popupElement as any).dragCleanup();
              }
            });
          }

          // 🔍 Z-INDEX DIAGNOSTIC: Add debugging when popup opens
          popup.on('open', () => {
            setTimeout(() => {
              console.log('🔍 Z-INDEX DIAGNOSTIC - Popup opened, checking layers...');
              
              // Find the popup element in DOM
              const popupElements = document.querySelectorAll('.maplibregl-popup');
              const markerElements = document.querySelectorAll('.maplibregl-marker');
              
              console.log('📊 POPUP ELEMENTS:', popupElements.length);
              popupElements.forEach((popup, index) => {
                const computedStyle = window.getComputedStyle(popup);
                console.log(`  Popup ${index + 1}: z-index = ${computedStyle.zIndex}, position = ${computedStyle.position}`);
              });
              
              console.log('📍 MARKER ELEMENTS:', markerElements.length);
              markerElements.forEach((marker, index) => {
                const computedStyle = window.getComputedStyle(marker);
                console.log(`  Marker ${index + 1}: z-index = ${computedStyle.zIndex}, position = ${computedStyle.position}`);
              });
              
              // Find our specific marker element
              console.log(`🎯 OUR MARKER: z-index = ${markerElement.style.zIndex || 'not set'}`);
              console.log(`🎯 MARKER COMPUTED:`, window.getComputedStyle(markerElement));
              
            }, 100); // Small delay to ensure DOM is updated
          });

          // Create and add marker (with safety check)
          if (!map.current) {
            console.warn('🛑 Map instance is null when trying to add marker, aborting marker creation');
            return;
          }
          
          const marker = new maptilersdk.Marker({ 
            element: markerElement,
            anchor: 'center'
          })
          .setLngLat([lng, lat]);

          // ✅ NEW: Enhanced click behavior for cluster vs single markers
          if (isClusterMarker) {
            // For cluster markers, use table selection with all facilities instead of multiple popups
            markerElement.addEventListener('click', (e) => {
              e.stopPropagation(); // Prevent map click
              
              console.log(`🎯 Cluster marker clicked: ${allClusterFacilities.length} facilities`);
              
              if (onFacilityTableSelection) {
                // Use table selection callback with all cluster facilities
                const clusterFacilityData = allClusterFacilities.map(facility => ({
                  OBJECTID: facility.OBJECTID || 0,
                  Service_Name: facility.Service_Name || 'Unknown Service',
                  Physical_Address: facility.Physical_Address || 'Address not available',
                  Physical_Suburb: facility.Physical_Suburb || '',
                  Physical_State: facility.Physical_State || '',
                  Physical_Post_Code: facility.Physical_Post_Code || 0,
                  Care_Type: facility.Care_Type || 'Unknown',
                  Residential_Places: facility.Residential_Places || null,
                  Home_Care_Places: facility.Home_Care_Places || null,
                  Home_Care_Max_Places: facility.Home_Care_Max_Places || null,
                  Restorative_Care_Places: facility.Restorative_Care_Places || null,
                  Provider_Name: facility.Provider_Name || '',
                  Organisation_Type: facility.Organisation_Type || '',
                  ABS_Remoteness: facility.ABS_Remoteness || '',
                  Phone: facility.Phone || undefined,
                  Email: facility.Email || undefined,
                  Website: facility.Website || undefined,
                  Latitude: facility.Latitude,
                  Longitude: facility.Longitude,
                  F2019_Aged_Care_Planning_Region: facility.F2019_Aged_Care_Planning_Region || '',
                  F2016_SA2_Name: facility.F2016_SA2_Name || '',
                  F2016_SA3_Name: facility.F2016_SA3_Name || '',
                  F2016_LGA_Name: facility.F2016_LGA_Name || '',
                  facilityType: typeKey as 'residential' | 'multipurpose_others' | 'home' | 'retirement'
                }));
                
                onFacilityTableSelection(clusterFacilityData);
              } else {
                // Fallback to popup system if no table callback provided
                // Create unique ID for this cluster marker
                const markerId = `cluster-${lng.toFixed(6)}-${lat.toFixed(6)}`;
                const currentState = clusterPopupStatesRef.current.get(markerId);
                
                if (currentState?.isOpen) {
                  // ✅ CLOSE: Remove all cluster popups (toggle off - like single marker second click)
                  console.log(`🚪 Cluster marker toggle OFF: Closing ${currentState.popups.length} popups`);
                  
                  currentState.popups.forEach((popup) => {
                    popup.remove();
                    // Remove from tracking
                    openPopupsRef.current.delete(popup);
                    openPopupFacilityTypesRef.current.delete(popup);
                    openPopupFacilitiesRef.current.delete(popup);
                  });
                  
                  // Update state to closed
                  clusterPopupStatesRef.current.set(markerId, { isOpen: false, popups: [] });
                  console.log(`✅ Cluster toggle OFF complete: ${currentState.popups.length} popups closed`);
                  
                } else {
                  // ✅ OPEN: Create and show cluster popups (toggle on - like single marker first click)
                  console.log(`🎯 Cluster marker toggle ON: Creating ${allClusterFacilities.length} popups`);
                  
                  // Create multiple popups positioned around the marker
                  const clusterPopups = createClusterPopups(allClusterFacilities, [lng, lat], typeKey, typeColors);
                  const createdPopups: maptilersdk.Popup[] = [];
                  
                  // Add all popups to the map
                  clusterPopups.forEach((popupData, index) => {
                    console.log(`🎯 Adding cluster popup ${index + 1}/${clusterPopups.length}: ${popupData.serviceName}`);
                    popupData.popup.addTo(map.current);
                    createdPopups.push(popupData.popup);
                    
                    // Track all cluster popups as open
                    openPopupsRef.current.add(popupData.popup);
                    openPopupFacilityTypesRef.current.set(popupData.popup, popupData.typeKey);
                    openPopupFacilitiesRef.current.set(popupData.popup, popupData.facility);
                  });
                  
                  // Update state to open with all created popups
                  clusterPopupStatesRef.current.set(markerId, { isOpen: true, popups: createdPopups });
                  console.log(`✅ Cluster toggle ON complete: ${clusterPopups.length} popups opened`);
                }
              }
            });
          } else {
            // For single markers, use table selection instead of popup (existing functionality replaced)
            if (onFacilityTableSelection) {
              // Use table selection callback with single facility
              markerElement.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent map click
                console.log(`🎯 Single marker clicked: ${serviceName}`);
                onFacilityTableSelection([facilityData]);
              });
            } else {
              // Fallback to popup if no table callback provided
              marker.setPopup(popup);
            }
          }

          marker.addTo(map.current);
          markersRef.current.push(marker);
        });

        console.log(`📊 ${typeKey} facilities:`, {
          found: filteredFacilities.length,
          valid: validFacilities,
          ...(invalidCoordinates > 0 && { invalidCoordinates }),
          ...(outsideBounds > 0 && { outsideBounds })
        });
      });

    } catch (error) {
      console.error('❌ Error loading healthcare facilities:', error);
    }
  }, []);

  // ✅ PHASE 2: Effect to handle facility type changes with heatmap coordination
  useEffect(() => {
    if (!map.current || !isLoaded || facilityLoading) return;
    

    
    // Removed problematic coordination that created deadlock
    // The LayerManager now handles heatmap coordination properly
    
    const updateFacilities = async () => {
      console.log('🏥 AustralianMap: Starting coordinated facility update');
      setFacilityLoading(true);
      
      try {
        // Clear existing markers
        clearAllMarkers();
        
        // Add healthcare facilities if any are enabled
        if (Object.values(debouncedFacilityTypes).some(Boolean)) {
          await addHealthcareFacilities(debouncedFacilityTypes);
          console.log('✅ AustralianMap: Facility update completed successfully');
          
          // ✅ PHASE 3: Reset error state on success
          setFacilityError(null);
          facilityRetryCountRef.current = 0;
        } else {
          console.log('✅ AustralianMap: All facilities cleared');
        }
      } catch (error) {
        console.error('❌ AustralianMap: Error during facility update:', error);
        
        // ✅ PHASE 3: Implement retry logic for facility failures
        facilityRetryCountRef.current++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown facility error';
        setFacilityError(`Facility loading failed (attempt ${facilityRetryCountRef.current}): ${errorMessage}`);
        
        // Auto-retry up to 3 times with exponential backoff
        if (facilityRetryCountRef.current < 3) {
          const retryDelay = Math.pow(2, facilityRetryCountRef.current) * 1000; // 2s, 4s, 8s
          console.log(`⏰ AustralianMap: Retrying facility load in ${retryDelay}ms (attempt ${facilityRetryCountRef.current + 1}/3)`);
          
          setTimeout(() => {
            console.log('🔄 AustralianMap: Retrying facility update after error');
            updateFacilities();
          }, retryDelay);
        } else {
          console.error('💥 AustralianMap: Max facility retry attempts reached. Manual intervention required.');
        }
      } finally {
        setFacilityLoading(false);
      }
    };
    
    updateFacilities();
  }, [isLoaded, debouncedFacilityTypes, clearAllMarkers, addHealthcareFacilities, facilityLoading, heatmapDataReady, heatmapVisible]);

  // ✅ INSTANT VISIBILITY SYSTEM: Toggle marker visibility without rebuilding (like count/radius systems)
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    
    // Get all existing marker elements from DOM
    const markerElements = document.querySelectorAll('.aged-care-marker[data-facility-type]');
    
    // Show/hide markers based on current facility type selection
    markerElements.forEach((markerElement) => {
      const facilityType = markerElement.getAttribute('data-facility-type');
      if (facilityType) {
        const isEnabled = facilityTypes[facilityType as keyof FacilityTypes];
        (markerElement as HTMLElement).style.display = isEnabled ? 'block' : 'none';
      }
    });
    
  }, [facilityTypes, isLoaded]); // Uses non-debounced facilityTypes for instant response

  // Helper function to get the right property field for each layer type
  const getPropertyField = (layerType: GeoLayerType): string => {
    switch (layerType) {
      case 'postcode': return 'poa_code_2021';
      case 'lga': return 'lga_code_2021';
      case 'sa2': return 'sa2_code_2021';
      case 'sa3': return 'sa3_code_2021';
      case 'sa4': return 'sa4_code_2021';
      case 'locality': return 'SAL_CODE21';
      case 'acpr': return 'ACPR_Code';
      case 'mmm': return 'MMM_CODE23';
      default: return 'id';
    }
  };

  // Helper function to get feature name based on boundary type
  const getFeatureName = (layerType: GeoLayerType, properties: any): string => {
    switch (layerType) {
      case 'postcode': return properties?.poa_name_2021 || `Postcode ${properties?.poa_code_2021}`;
      case 'lga': return properties?.lga_name_2021 || `LGA ${properties?.lga_code_2021}`;
      case 'sa2': return properties?.sa2_name_2021 || `SA2 ${properties?.sa2_code_2021}`;
      case 'sa3': return properties?.sa3_name_2021 || `SA3 ${properties?.sa3_code_2021}`;
      case 'sa4': return properties?.sa4_name_2021 || `SA4 ${properties?.sa4_code_2021}`;
      case 'locality': return properties?.SAL_NAME21 || `Locality ${properties?.SAL_CODE21}`;
      case 'acpr': return properties?.ACPR_Name || `ACPR ${properties?.ACPR_Code}`;
      case 'mmm': return properties?.MMM_NAME23 || `MMM ${properties?.MMM_CODE23}`;
      default: return `${(layerType as string).toUpperCase()}: ${properties?.[getPropertyField(layerType)]}`;
    }
  };

  const clearHighlight = useCallback(() => {
    if (!map.current) return;

    const layerTypes: GeoLayerType[] = ['sa2', 'sa3', 'sa4', 'lga', 'postcode', 'locality', 'acpr', 'mmm'];
    
    layerTypes.forEach(type => {
      const highlightLayerId = `${type}-highlight`;
      try {
        if (map.current!.getLayer(highlightLayerId)) {
          map.current!.setFilter(highlightLayerId, ['==', ['get', getPropertyField(type)], '__HIDDEN__']);
        }
      } catch (error) {
        console.warn(`Failed to clear highlight for ${type}:`, error);
      }
    });
    
    setHighlightedFeature(null);
    setHighlightedFeatureName(null);
    // Keep lastSearchResult so we can recognise the feature again
    // (we'll clear it only when the user explicitly cancels the search)
    onHighlightFeature?.(null, null);
  }, [setHighlightedFeature, setHighlightedFeatureName, onHighlightFeature]);

  const handleMapClick = useCallback((e: any) => {
    if (!map.current) return;

    const currentGeoLayer = selectedGeoLayerRef.current;
    
    console.log(`🎯 Click detected at:`, {
      x: e.point.x,
      y: e.point.y,
      lngLat: e.lngLat,
      currentLayer: currentGeoLayer
    });
    
    // Debug: Check what layers exist for this boundary type
    const style = map.current.getStyle();
    const relevantLayers = style.layers?.filter(l => l.id.includes(currentGeoLayer)) || [];
    console.log(`📋 Available ${currentGeoLayer} layers:`, relevantLayers.map(l => l.id));
    
    // Debug: Check source status
    const sourceId = `${currentGeoLayer}-source`;
    const source = map.current.getSource(sourceId);
    console.log(`📊 Source ${sourceId}:`, {
      exists: !!source,
      type: source?.type,
      hasData: source && (source as any)._data?.features?.length || 0
    });
    
    // Query features at the click point - use querySourceFeatures for large polygons
    // queryRenderedFeatures only returns visible/rendered portions, which fails for large polygons
    let features: any[] = [];
    
    try {
      // First try querySourceFeatures which gets full geometries from source
      const allSourceFeatures = map.current.querySourceFeatures(sourceId);
      console.log(`📍 Source features count:`, allSourceFeatures.length);
      
      if (allSourceFeatures.length > 0) {
        // Manual point-in-polygon test for the click coordinates
        const clickLngLat = e.lngLat;
        const clickPoint: [number, number] = [clickLngLat.lng, clickLngLat.lat];
        
        console.log(`🎯 Testing click point:`, clickPoint);
        console.log(`📋 Sample geometries:`, allSourceFeatures.slice(0, 3).map(f => ({
          type: f.geometry.type,
          id: f.properties?.[getPropertyField(currentGeoLayer)],
          coordinatesLength: (f.geometry as any).coordinates?.length
        })));
        
        features = allSourceFeatures.filter((feature: any, index: number) => {
          // Use appropriate tolerance based on layer type - smaller boundaries need higher tolerance
          const tolerance = {
            'postcode': 0.003,  // ~300m tolerance for postcodes (most precise boundaries)
            'locality': 0.002,  // ~200m tolerance for localities  
            'sa2': 0.001,       // ~100m tolerance for SA2
            'sa3': 0,           // No tolerance for SA3 (larger boundaries)
            'sa4': 0,           // No tolerance for SA4 (larger boundaries)
            'lga': 0,           // No tolerance for LGA (larger boundaries)
            'acpr': 0,          // No tolerance for ACPR (large care provider regions)
            'mmm': 0            // No tolerance for MMM (modified monash model areas)
          }[currentGeoLayer] || 0;
          
          const result = isPointInGeometryWithTolerance(clickPoint, feature.geometry, tolerance);
          return result;
        });
        
        console.log(`📍 Point-in-polygon matches:`, features.length);
      }
    } catch (error) {
      console.warn('Error with querySourceFeatures, falling back to queryRenderedFeatures:', error);
      // Fallback to original method
      features = map.current.queryRenderedFeatures(e.point, {
        layers: [`${currentGeoLayer}-fill`]
      });
    }
    
    console.log(`📍 Final query result:`, {
      count: features.length,
      featureIds: features.map(f => f.properties?.[getPropertyField(currentGeoLayer)]),
      geometryTypes: features.map(f => f.geometry.type)
    });

    if (features.length > 0) {
      // If multiple features, pick the smallest one (most specific)
      const feature = features.length > 1 
        ? features.reduce((smallest, current) => {
            // Get primary area data first
            const smallestShapeArea = smallest.properties?.st_area_shape || smallest.properties?.SHAPE_Area;
            const currentShapeArea = current.properties?.st_area_shape || current.properties?.SHAPE_Area;
            
            // Calculate fallback areas using bounding box when shape area is missing
            const smallestArea = smallestShapeArea || calculateBoundingBoxArea(smallest.geometry);
            const currentArea = currentShapeArea || calculateBoundingBoxArea(current.geometry);
            
            // Log only when multiple features are found (useful for debugging overlaps)
            if (features.length > 1) {
              console.log(`🔍 Selecting from ${features.length} overlapping features:`, {
                codes: features.map(f => f.properties?.[getPropertyField(currentGeoLayer)]),
                winner: currentArea < smallestArea ? 
                  current.properties?.[getPropertyField(currentGeoLayer)] : 
                  smallest.properties?.[getPropertyField(currentGeoLayer)]
              });
            }
            
            // If both areas are still Infinity (both missing), prefer simple Polygon over MultiPolygon
            if (smallestArea === Infinity && currentArea === Infinity) {
              // Prefer simple Polygon over MultiPolygon for better precision
              if (smallest.geometry.type === 'MultiPolygon' && current.geometry.type === 'Polygon') {
                return current;
              }
              if (smallest.geometry.type === 'Polygon' && current.geometry.type === 'MultiPolygon') {
                return smallest;
              }
              // If both same type, prefer the one that comes later (more specific)
              return current;
            }
            
            return currentArea < smallestArea ? current : smallest;
          })
        : features[0];

      const properties = feature.properties;
      const propertyField = getPropertyField(currentGeoLayer);
      const featureId = properties?.[propertyField];
      const featureName = getFeatureName(currentGeoLayer, properties);
      
      console.log(`🎯 Clicked feature found:`, {
        layer: currentGeoLayer,
        featureId,
        featureName,
        selectedFrom: features.length,
        properties: {
          [propertyField]: featureId,
          area: properties?.st_area_shape || properties?.SHAPE_Area,
        }
      });
      
      if (featureId) {
        // Check if this matches the last search result
        const isLastSearchResult = lastSearchResult && (
          // Try exact code match first
          (lastSearchResult.code && lastSearchResult.code.toString() === featureId.toString()) ||
          // Try name-based matching (case insensitive, partial match)
          (lastSearchResult.name && featureName && (
            lastSearchResult.name.toLowerCase() === featureName.toLowerCase() ||
            lastSearchResult.name.toLowerCase().includes(featureName.toLowerCase()) ||
            featureName.toLowerCase().includes(lastSearchResult.name.toLowerCase())
          )) ||
          // For LGA, also try matching without "(Regional Council)" suffix variations
          (currentGeoLayer === 'lga' && lastSearchResult.name && featureName && (
            lastSearchResult.name.toLowerCase().replace(/\s*\([^)]*\)$/g, '').trim() === featureName.toLowerCase().replace(/\s*\([^)]*\)$/g, '').trim()
          ))
        );

        if (!isLastSearchResult) {
          // Clear any active search result since user is manually selecting a different area
          onClearSearchResult?.();
        } else {
          // This is the same feature as the last search result, maintain search context
          console.log('🔄 Clicked on same feature as last search result, maintaining search context');
        }
        
        // Highlight the clicked feature
        map.current.setFilter(`${currentGeoLayer}-highlight`, [
          '==',
          ['get', propertyField],
          featureId
        ]);
        
        setHighlightedFeature(featureId as string);
        setHighlightedFeatureName(featureName || `${currentGeoLayer.toUpperCase()}: ${featureId}`);
        onHighlightFeature?.(featureId as string, featureName || `${currentGeoLayer.toUpperCase()}: ${featureId}`);
      } else {
        console.log(`⚠️ Feature found but no ${propertyField} property:`, properties);
        clearHighlight();
      }
    } else {
      console.log(`❌ No features found at click point for layer: ${currentGeoLayer}`);
      clearHighlight();
    }
  }, [clearHighlight, getPropertyField, getFeatureName, setHighlightedFeature, setHighlightedFeatureName, onHighlightFeature, onClearSearchResult, lastSearchResult]);

  // Helper function to determine appropriate zoom level for each layer type
  const getAppropriateZoom = (layerType: GeoLayerType, currentZoom: number): number | null => {
    const minZoomForLayer: Record<GeoLayerType, number> = {
      'sa4': 5,
      'sa3': 6,
      'lga': 7,
      'sa2': 8,
      'postcode': 9,
      'locality': 11,
      'acpr': 6,        // ACPR regions are large, similar zoom to SA3
      'mmm': 7          // MMM areas are medium size, similar to LGA
    };

    const targetZoom = minZoomForLayer[layerType];
    
    // Only suggest zoom if current zoom is significantly lower
    if (currentZoom < targetZoom) {
      return targetZoom;
    }
    
    return null; // No zoom change needed
  };

  // Simple boundary layer handler - shows only outlines by default
  const handleBoundaryLayer = useCallback(async (layerType: GeoLayerType) => {
    if (!map.current) return;
    
    // Prevent overlapping boundary loads
    if (boundaryLoadingRef.current) {
      console.log(`⚠️ Boundary loading already in progress, skipping: ${layerType}`);
      return;
    }

    // Cancel any existing boundary load
    if (currentBoundaryLoadRef.current) {
      currentBoundaryLoadRef.current.abort();
    }

    // Create new abort controller for this load
    const abortController = new AbortController();
    currentBoundaryLoadRef.current = abortController;

    console.log(`Loading boundary layer: ${layerType}`);
    boundaryLoadingRef.current = true;
    setBoundaryLoading(true);
    setBoundaryError(null);

    try {
      // Remove all existing boundary layers first
      const boundaryTypes: GeoLayerType[] = ['sa2', 'sa3', 'sa4', 'lga', 'postcode', 'locality', 'acpr', 'mmm'];
      
      boundaryTypes.forEach(type => {
        const sourceId = `${type}-source`;
        const layerId = `${type}-layer`;
        const fillLayerId = `${type}-fill`;
        const highlightLayerId = `${type}-highlight`;
        
        // Remove layers in reverse order of creation
        [highlightLayerId, fillLayerId, layerId].forEach(id => {
          try {
            if (map.current!.getLayer(id)) {
              console.log(`Removing layer: ${id}`);
              map.current!.removeLayer(id);
            }
          } catch (error) {
            console.warn(`Error removing layer ${id}:`, error);
          }
        });
        
        try {
          if (map.current!.getSource(sourceId)) {
            console.log(`Removing source: ${sourceId}`);
            map.current!.removeSource(sourceId);
          }
        } catch (error) {
          console.warn(`Error removing source ${sourceId}:`, error);
        }
      });

      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check cache first
      let geojsonData = boundaryDataCache.current.get(layerType);
      
      if (geojsonData) {
        console.log(`📦 Using cached boundary data for: ${layerType}`);
      } else {
        console.log(`📥 Loading boundary data for: ${layerType}`);
        
        // Load the new boundary data
        const fileMap: Record<GeoLayerType, string> = {
          'postcode': 'POA.geojson',
          'lga': 'LGA.geojson',
          'sa2': 'SA2.geojson',
          'sa3': 'SA3.geojson',
          'sa4': 'SA4.geojson',
          'locality': 'SAL.geojson',
          'acpr': 'DOH_simplified.geojson',
          'mmm': 'MMM_simplified.geojson'
        };

        const fileName = fileMap[layerType];
        console.log(`Fetching boundary file: /maps/${fileName}`);
        
        // Special handling for large files
        if (layerType === 'sa2') {
          console.log('⚠️  Loading SA2 boundaries - this is a large file (170MB) and may take time...');
        }
        
        const startTime = Date.now();
        const response = await fetch(`/maps/${fileName}`, {
          signal: abortController.signal
        });
        const fetchTime = Date.now() - startTime;
        
        console.log(`Fetch completed in ${fetchTime}ms for ${fileName}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log(`Successfully fetched ${fileName} (${response.headers.get('content-length') ? Math.round(parseInt(response.headers.get('content-length')!) / 1024 / 1024) + 'MB' : 'unknown size'}), parsing JSON...`);
        const parseStartTime = Date.now();
        geojsonData = await response.json();
        
        const parseTime = Date.now() - parseStartTime;
        console.log(`Parsed ${fileName} in ${parseTime}ms, features count:`, geojsonData.features?.length || 0);
        
        // Cache the data for future use
        boundaryDataCache.current.set(layerType, geojsonData);
        console.log(`💾 Cached boundary data for: ${layerType}`);
      }
      
      // Additional data quality checks
      const sampleFeature = geojsonData.features?.[0];
      if (sampleFeature) {
        console.log(`📋 Sample ${layerType} feature structure:`, {
          hasGeometry: !!sampleFeature.geometry,
          geometryType: sampleFeature.geometry?.type,
          hasProperties: !!sampleFeature.properties,
          propertyKeys: Object.keys(sampleFeature.properties || {}),
          sampleProperties: {
            [getPropertyField(layerType)]: sampleFeature.properties?.[getPropertyField(layerType)],
            objectid: sampleFeature.properties?.objectid
          }
        });
      }
      
      // Add the new source and layers
      const sourceId = `${layerType}-source`;
      
      // Ensure source doesn't exist before adding
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }
      
      console.log(`Adding source: ${sourceId}`);
      map.current!.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData,
        generateId: true, // Let MapLibre generate unique IDs to avoid ID conflicts
        promoteId: getPropertyField(layerType) // Use the boundary property field as feature ID
      });

      // Add outline layer
      console.log(`Adding outline layer: ${layerType}-layer`);
      map.current!.addLayer({
        id: `${layerType}-layer`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#1E3A8A',
          'line-width': 1.5,
          'line-opacity': 0.8
        }
      });

      // Add invisible fill layer for click detection
      console.log(`Adding fill layer: ${layerType}-fill`);
      map.current!.addLayer({
        id: `${layerType}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': 'rgba(30, 58, 138, 0.0)', // Transparent for clean appearance
          'fill-opacity': 0.0 // Invisible but still detects clicks
        }
      });

      // Add highlight layer (initially hidden) - this should be on top
      console.log(`Adding highlight layer: ${layerType}-highlight`);
      map.current!.addLayer({
        id: `${layerType}-highlight`,
        type: 'fill',
        source: sourceId,
        filter: ['==', ['get', getPropertyField(layerType)], '__HIDDEN__'], // Initially hide all
        paint: {
          'fill-color': '#1E3A8A',
          'fill-opacity': 0.15 // Slightly more visible for highlights
        }
      });

      console.log(`Successfully loaded ${layerType} boundary layer`);
      boundaryLoadingRef.current = false;
      setBoundaryLoading(false);
      currentBoundaryLoadRef.current = null;
      
    } catch (error) {
      // Don't show error if it was aborted (user changed style rapidly)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`🔄 Boundary load aborted for: ${layerType}`);
        return;
      }
      
      console.error(`Error loading ${layerType} boundary data:`, error);
      setBoundaryError(`Failed to load ${layerType} boundaries: ${error instanceof Error ? error.message : 'Unknown error'}`);
      boundaryLoadingRef.current = false;
      setBoundaryLoading(false);
      currentBoundaryLoadRef.current = null;
    }
  }, [setBoundaryLoading, setBoundaryError]);



  // Preload all boundary data to prevent loading during style changes
  const preloadAllBoundaryData = useCallback(async () => {
    if (preloadCompleteRef.current) return;
    
    console.log('🚀 Starting preload of ALL boundary data...');
    setPreloadingData(true);
    
    const allBoundaryTypes: GeoLayerType[] = ['postcode', 'lga', 'sa2', 'sa3', 'sa4', 'locality', 'acpr', 'mmm'];
    const fileMap: Record<GeoLayerType, string> = {
      'postcode': 'POA.geojson',
      'lga': 'LGA.geojson', 
      'sa2': 'SA2.geojson',
      'sa3': 'SA3.geojson',
      'sa4': 'SA4.geojson',
      'locality': 'SAL.geojson',
      'acpr': 'DOH_simplified.geojson',
      'mmm': 'MMM_simplified.geojson'
    };
    
    setPreloadProgress({ current: 0, total: allBoundaryTypes.length });
    
    // Load files in optimal order (smallest to largest)
    const orderedTypes: GeoLayerType[] = ['postcode', 'lga', 'locality', 'mmm', 'acpr', 'sa4', 'sa3', 'sa2'];
    
    for (let i = 0; i < orderedTypes.length; i++) {
      const layerType = orderedTypes[i];
      const fileName = fileMap[layerType];
      
      try {
        if (boundaryDataCache.current.has(layerType)) {
          console.log(`✅ ${layerType} already cached, skipping`);
          continue;
        }
        
        console.log(`📥 Preloading ${layerType} (${i + 1}/${orderedTypes.length}): ${fileName}`);
        setPreloadProgress({ current: i + 1, total: orderedTypes.length });
        
        const startTime = Date.now();
        const response = await fetch(`/maps/${fileName}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const geojsonData = await response.json();
        const loadTime = Date.now() - startTime;
        const sizeInfo = response.headers.get('content-length') 
          ? `${Math.round(parseInt(response.headers.get('content-length')!) / 1024 / 1024)}MB` 
          : 'unknown size';
        
        // Cache the data
        boundaryDataCache.current.set(layerType, geojsonData);
        
        console.log(`✅ Preloaded ${layerType} in ${loadTime}ms (${sizeInfo}, ${geojsonData.features?.length || 0} features)`);
        
        // Small delay between loads to prevent browser freeze
        if (i < orderedTypes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`❌ Failed to preload ${layerType}:`, error);
        // Continue with other files even if one fails
      }
    }
    
    preloadCompleteRef.current = true;
    setPreloadingData(false);
    setPreloadProgress({ current: orderedTypes.length, total: orderedTypes.length });
    console.log('🎉 ALL boundary data preloaded successfully!');
    console.log(`📊 Cache contains: ${Array.from(boundaryDataCache.current.keys()).join(', ')}`);
    console.log(`💾 Total cache size: ${boundaryDataCache.current.size} files`);
    
  }, []);

  // Function to highlight matching boundary based on search result
  const highlightMatchingBoundary = useCallback((navigation: any): boolean => {
    if (!map.current || !navigation.searchResult) return false;
    
    const { searchResult } = navigation;
    const layerType = selectedGeoLayerRef.current; // Use ref for current layer

    // Check if the search result type matches the current layer
    const shouldHighlight = (
      (layerType === 'postcode' && (searchResult.type === 'postcode' || searchResult.type === 'locality')) ||
      (layerType === 'lga' && searchResult.type === 'lga') ||
      (layerType === 'sa2' && searchResult.type === 'sa2') ||
      (layerType === 'sa3' && searchResult.type === 'sa3') ||
      (layerType === 'sa4' && searchResult.type === 'sa4') ||
      (layerType === 'locality' && searchResult.type === 'locality')
    );

    if (!shouldHighlight) return false;

    // Get the source data
    const sourceId = `${layerType}-source`;
    const source = map.current.getSource(sourceId);
    
    if (!source || source.type !== 'geojson') return false;
    
    const geojsonData = (source as any)._data;
    if (!geojsonData || !geojsonData.features) return false;

    // Find matching feature
    let matchingFeature: any = null;
    let featureId: string | number | undefined = undefined;
    const propertyField = getPropertyField(layerType);

    // First try to match by code
    if (searchResult.code && (layerType === 'postcode' || layerType === 'locality' || layerType === 'sa2' || layerType === 'sa3' || layerType === 'sa4')) {
      const searchCode = searchResult.code.toString();
      matchingFeature = geojsonData.features.find((feature: any) => {
        const featureCode = feature.properties?.[propertyField]?.toString();
        return featureCode === searchCode;
      });
    }

    // If no code match, try name matching
    if (!matchingFeature && searchResult.name) {
      const searchName = searchResult.name.toLowerCase();
      matchingFeature = geojsonData.features.find((feature: any) => {
        const nameProperty = layerType === 'postcode' ? 'poa_name_2021' :
                             layerType === 'lga' ? 'lga_name_2021' :
                             layerType === 'sa2' ? 'sa2_name_2021' :
                             layerType === 'sa3' ? 'sa3_name_2021' :
                             layerType === 'sa4' ? 'sa4_name_2021' :
                             layerType === 'locality' ? 'SAL_NAME21' : '';
        
        const featureName = feature.properties?.[nameProperty]?.toLowerCase();
        return featureName && featureName.includes(searchName);
      });
    }
    
    featureId = matchingFeature?.properties?.[propertyField];

    if (matchingFeature && featureId) {
      // Highlight the matching feature
      map.current.setFilter(`${layerType}-highlight`, [
        '==',
        ['get', propertyField],
        featureId
      ]);
      
      setHighlightedFeature(featureId as string);
      setHighlightedFeatureName(searchResult.name || `${layerType.toUpperCase()}: ${featureId}`);
      onHighlightFeature?.(featureId as string, searchResult.name || `${layerType.toUpperCase()}: ${featureId}`);
      
      return true;
    }

    return false;
  }, [getPropertyField, setHighlightedFeature, setHighlightedFeatureName, onHighlightFeature]);

  // Effect to handle geo layer changes
  useEffect(() => {
    if (!map.current || !isLoaded || selectedGeoLayer === null) return;
    
    console.log(`Geo layer change detected: ${selectedGeoLayerRef.current} -> ${selectedGeoLayer}`);
    if (selectedGeoLayer !== selectedGeoLayerRef.current) {
      selectedGeoLayerRef.current = selectedGeoLayer;
      console.log(`Starting to load boundary layer: ${selectedGeoLayer}`);
      handleBoundaryLayer(selectedGeoLayer);
    }
  }, [isLoaded, selectedGeoLayer, handleBoundaryLayer]);

  // NON-DESTRUCTIVE style change handler using cached styles
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    
    // Block style changes during boundary loading
    if (boundaryLoadingRef.current) {
      console.log('🚫 Style change blocked - boundary loading in progress');
      return;
    }
    
    // Always store current state before any style change (cached or not)
    const currentGeoLayer = selectedGeoLayerRef.current;
    const hadBoundaryLayer = currentGeoLayer && map.current.getSource(`${currentGeoLayer}-source`);

    const currentMarkers = [...markersRef.current];
    
    // Use cached style if available, otherwise fallback to setStyle
    const cachedStyle = styleCache.current[selectedMapStyle];
    
    if (cachedStyle) {
      console.log('🎨 Using CACHED style for instant change:', selectedMapStyle);
      
      try {
        // Use cached style for instant change (still destroys layers!)
        map.current.setStyle(cachedStyle);
        console.log('✅ Cached style applied - now restoring layers...');
        
        // Even cached styles destroy layers, so we need to restore them
        const handleCachedStyleLoad = () => {
          setTimeout(() => {
            try {
              // Re-add boundary layers if they existed
              if (hadBoundaryLayer) {
                console.log('🔄 Restoring boundary layer after cached style:', currentGeoLayer);
                handleBoundaryLayer(currentGeoLayer);
              }
              
              // LayerManager handles style change notification automatically
              
              // Re-add facility markers if they existed
              if (currentMarkers.length > 0) {
                console.log('🔄 Restoring facility markers after cached style');
                addHealthcareFacilities(stableFacilityTypes);
              }
              
            } catch (error) {
              console.error('❌ Error restoring layers after cached style:', error);
            }
          }, 100); // Shorter delay for cached styles
        };
        
        map.current.once('styledata', handleCachedStyleLoad);
        
      } catch (error) {
        console.error('❌ Error applying cached style, falling back to standard method:', error);
        // Fallback to standard method
        map.current.setStyle(getMapStyle(selectedMapStyle));
      }
    } else {
      console.log('🎨 Cache miss, using standard style change:', selectedMapStyle);
      
      // Set flag to prevent rapid clicks
      if (isChangingStyleRef.current) {
        console.log('🚫 Style change blocked - already changing');
        return;
      }
      
      isChangingStyleRef.current = true;
      
      try {
        // Apply style change
        map.current.setStyle(getMapStyle(selectedMapStyle));
        
        // Handle style load completion
        const handleStyleLoad = () => {
          if (!map.current || !isChangingStyleRef.current) return;
          
          console.log('✅ Standard style loaded successfully');
          
          setTimeout(() => {
            if (!isChangingStyleRef.current) return;
            
            try {
              // Re-add boundary layers if they existed
              if (hadBoundaryLayer) {
                console.log('🔄 Restoring boundary layer:', currentGeoLayer);
                handleBoundaryLayer(currentGeoLayer);
              }
              
              // LayerManager handles style change notification automatically
              
              // Re-add facility markers if they existed
              if (currentMarkers.length > 0) {
                console.log('🔄 Restoring facility markers');
                addHealthcareFacilities(stableFacilityTypes);
              }
              
            } catch (error) {
              console.error('❌ Error restoring layers:', error);
            } finally {
              setTimeout(() => {
                isChangingStyleRef.current = false;
                console.log('🔓 Style change lock released');
              }, 1000);
            }
          }, 500);
        };
        
        map.current.once('styledata', handleStyleLoad);
        
        // Fallback timeout
        setTimeout(() => {
          if (isChangingStyleRef.current) {
            console.warn('⚠️ Style change timeout, forcing unlock');
            isChangingStyleRef.current = false;
          }
        }, 10000);
        
      } catch (error) {
        console.error('❌ Critical error in style change:', error);
        isChangingStyleRef.current = false;
      }
    }
    
  }, [selectedMapStyle, isLoaded, handleBoundaryLayer, addHealthcareFacilities, stableFacilityTypes]);



  // Effect to load default boundary layer on initial map load
  useEffect(() => {
    if (!map.current || !isLoaded || !isInitialLoadRef.current) return;
    
    console.log('Map loaded, loading default boundary layer:', selectedGeoLayer);
    // Load the initial boundary layer
    selectedGeoLayerRef.current = selectedGeoLayer;
    handleBoundaryLayer(selectedGeoLayer);
    isInitialLoadRef.current = false;
  }, [isLoaded, selectedGeoLayer, handleBoundaryLayer]);

  // Effect to handle map navigation (search results)
  useEffect(() => {
    if (!map.current || !isLoaded || !mapNavigation) return;

    const { center, bounds, zoom, searchResult } = mapNavigation;

    // Store the search result for later use
    if (searchResult) {
      setLastSearchResult(searchResult);
    }

    // Always handle search result highlighting (this should work every time)
    if (searchResult) {
      const highlighted = highlightMatchingBoundary(mapNavigation);
      
      if (!highlighted) {
        // If no boundary was highlighted, clear any existing highlights
        clearHighlight();
      }
    }

    // Create a unique identifier for this navigation request (only for map movements)
    const navigationId = JSON.stringify({ 
      center, 
      bounds, 
      zoom
    });

    // Only handle navigation (center, bounds, zoom) for NEW requests
    if ((center || bounds || zoom !== undefined) && lastProcessedNavigationRef.current !== navigationId) {
      console.log('🗺️ Processing new navigation request:', { center, bounds, zoom });
      
      if (bounds) {
        map.current.fitBounds([
          [bounds[0], bounds[1]], // Southwest corner
          [bounds[2], bounds[3]]  // Northeast corner
        ], {
          padding: 50,
          duration: 1000
        });
      } else if (center) {
        map.current.flyTo({
          center: center,
          zoom: zoom || map.current.getZoom(),
          duration: 1000
        });
      } else if (zoom !== undefined) {
        map.current.flyTo({
          zoom: zoom,
          duration: 1000
        });
      }

      // Mark this navigation as processed
      lastProcessedNavigationRef.current = navigationId;
    }
  }, [isLoaded, mapNavigation, highlightMatchingBoundary, clearHighlight]);

  // Set initial load flag after first render
  useEffect(() => {
    if (isLoaded && isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
    }
  }, [isLoaded]);

  // ✅ NEW: 20km radius feature - Circle rendering system
  const updateRadiusCircles = useCallback(() => {
    const circleContainer = circlesRef.current;
    const isRadiusActive = radiusType && radiusType !== 'off';
    
    if (!circleContainer || !map.current || !isRadiusActive) {
      // Clear existing circles when not showing
      if (circleContainer) {
        circleContainer.innerHTML = '';
      }
      return;
    }

    // Get current map bounds to only show circles for visible facilities
    const bounds = map.current.getBounds();
    
    // Get radius distance based on current selection
    const getRadiusDistance = (type: string): number => {
      const mapping = { off: 0, urban: 20, suburban: 30, rural: 60 };
      return mapping[type as keyof typeof mapping] || 0;
    };
    
    const radiusKm = getRadiusDistance(radiusType || 'off');
    if (radiusKm === 0) {
      // Clear circles for 'off' state
      circleContainer.innerHTML = '';
      return;
    }

    const facilitiesToShow = allFacilitiesRef.current?.filter(facility => {
      if (!facility.Latitude || !facility.Longitude) return false;
      
      // Check if facility is within current map bounds
      const inViewport = (
        facility.Longitude >= bounds.getWest() &&
        facility.Longitude <= bounds.getEast() &&
        facility.Latitude >= bounds.getSouth() &&
        facility.Latitude <= bounds.getNorth()
      );
      
      // ✅ NEW: Check if facility type is selected (integration with facility checkboxes)
      if (!inViewport) return false;
      
      const facilityTypeKey = facility.facilityType as keyof FacilityTypes;
      const isTypeSelected = bulkSelectionTypes?.[facilityTypeKey] === true;
      
      return isTypeSelected;
    }) || [];

    // Clear existing circles
    circleContainer.innerHTML = '';

    // Create SVG container
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'radius-circles-svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '1';

    // Render circle for each visible facility
    facilitiesToShow.forEach(facility => {
      const lat = facility.Latitude;
      const lng = facility.Longitude;
      
      // Convert lat/lng to pixel coordinates
      const pixelCoords = map.current?.project([lng, lat]);
      if (!pixelCoords) return;
      
      // ✅ UPDATED: Calculate dynamic radius in pixels for this latitude
      const radiusPixels = calculateRadiusInPixels(map.current, lat, radiusKm);
      
      // Create circle element
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pixelCoords.x.toString());
      circle.setAttribute('cy', pixelCoords.y.toString());
      circle.setAttribute('r', radiusPixels.toString());
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', getFacilityTypeColor(facility.facilityType || 'residential'));
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('stroke-dasharray', '8,4');
      circle.setAttribute('opacity', '0.7');
      
      svg.appendChild(circle);
    });

    circleContainer.appendChild(svg);
  }, [radiusType, bulkSelectionTypes]);

  // ✅ NEW: Update circles when relevant state changes
  useEffect(() => {
    updateRadiusCircles();
  }, [radiusType, updateRadiusCircles]);

  // ✅ NEW: Update circles when map moves or zooms
  useEffect(() => {
    if (!map.current) return;

    const handleMapUpdate = () => {
      const isRadiusActive = radiusType && radiusType !== 'off';
      if (isRadiusActive) {
        updateRadiusCircles();
      }
    };

    map.current.on('move', handleMapUpdate);
    map.current.on('zoom', handleMapUpdate);

    return () => {
      if (map.current) {
        map.current.off('move', handleMapUpdate);
        map.current.off('zoom', handleMapUpdate);
      }
    };
  }, [radiusType, updateRadiusCircles]);

  // Function to clear last search result (called when search is explicitly cancelled)
  const clearLastSearchResult = useCallback(() => {
    setLastSearchResult(null);
  }, []);

  // Helper function to get count of open popups
  const getOpenPopupsCount = useCallback(() => {
    return openPopupsRef.current.size;
  }, []);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    clearHighlight: () => {
      clearHighlight();
    },
    clearLastSearchResult: () => {
      clearLastSearchResult();
    },
    getPreloadState: () => ({
      preloadingData,
      preloadProgress,
      stylesPreloaded,
      stylePreloadProgress
    }),
    closeAllPopups: () => {
      return closeAllPopups();
    },
    getOpenPopupsCount: () => {
      return getOpenPopupsCount();
    },
    getFacilityTypeBreakdown: () => {
      return getFacilityTypeBreakdown();
    },
    saveAllOpenFacilities: () => {
      return saveAllOpenFacilities();
    },
    onViewportChange: (callback: () => void) => {
      viewportChangeCallbackRef.current = callback;
    },
    getBounds: () => {
      if (!map.current) return null;
      const bounds = map.current.getBounds();
      return {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      };
    },
    getAllFacilities: () => {
      return allFacilitiesRef.current;
    }
  }));

  return (
    <div className={`relative ${className}`}>
      {/* Custom CSS for attribution */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .maplibregl-ctrl-attrib {
            opacity: 0 !important;
            pointer-events: none !important;
            transition: opacity 0.5s ease !important;
            font-size: 6px !important;
            background-color: rgba(255, 255, 255, 0.1) !important;
            border: none !important;
            padding: 1px 3px !important;
            border-radius: 2px !important;
          }
          .maplibregl-ctrl-attrib:hover {
            opacity: 0.15 !important;
            pointer-events: auto !important;
          }
          .maplibregl-map:hover .maplibregl-ctrl-attrib {
            opacity: 0.05 !important;
            pointer-events: auto !important;
          }
          .maplibregl-ctrl-attrib a {
            font-size: 6px !important;
            color: #999 !important;
            text-decoration: none !important;
            opacity: 0.6 !important;
          }
          .maplibregl-ctrl-attrib a:hover {
            opacity: 0.8 !important;
          }
          .maplibregl-ctrl-bottom-right {
            margin-bottom: 2px !important;
            margin-right: 2px !important;
          }
          
          /* 🔧 Z-INDEX FIX: Force popups above markers */
          .maplibregl-popup {
            z-index: 100 !important;
          }
          .maplibregl-popup-content {
            z-index: 101 !important;
          }
          .maplibregl-popup-tip {
            z-index: 101 !important;
          }
          
          /* Ensure popup container is also properly layered */
          .custom-popup, .draggable-popup {
            z-index: 100 !important;
          }
        `
      }} />
      
      <div 
        ref={mapContainer}
        className="w-full h-full min-h-[400px] rounded-lg"
        style={{ minHeight: '500px' }}
      />
      
      {/* ✅ NEW: 20km radius circles container */}
      <div 
        ref={circlesRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />
      
      {/* Removed magic wand UI components - replaced with bulk selection system */}
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading Australian map...</p>
          </div>
        </div>
      )}

      {/* Boundary Loading/Error State */}
      {boundaryLoading && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 border-l-4 border-blue-500">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-700">Loading boundary data...</span>
          </div>
        </div>
      )}

      {boundaryError && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 border-l-4 border-red-500 max-w-sm">
          <div className="flex items-start gap-2">
            <div className="text-red-500 mt-0.5">⚠️</div>
            <div>
              <p className="text-sm font-medium text-red-800">Boundary Loading Error</p>
              <p className="text-xs text-red-600 mt-1">{boundaryError}</p>
              <button 
                onClick={() => {
                  setBoundaryError(null);
                  handleBoundaryLayer(selectedGeoLayer);
                }}
                className="text-xs text-red-700 underline mt-1 hover:text-red-900"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Key Warning */}
      {MAPTILER_API_KEY === 'YOUR_MAPTILER_API_KEY' && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 rounded-lg border border-red-200">
          <div className="text-center p-4">
            <p className="text-red-800 font-semibold mb-2">MapTiler API Key Required</p>
            <p className="text-red-600 text-sm">
              Please add your MapTiler API key to the environment variables as NEXT_PUBLIC_MAPTILER_API_KEY
            </p>
          </div>
        </div>
      )}

      {/* Centralized Layer Manager - Handles all layers with unified lifecycle */}
      {map.current && (
        <LayerManager
          map={map.current}
          sa2HeatmapData={heatmapData}
          sa2HeatmapVisible={heatmapVisible}
          heatmapDataReady={heatmapDataReady}
          mapLoaded={isLoaded}
          facilityLoading={facilityLoading}
          onHeatmapMinMaxCalculated={onHeatmapMinMaxCalculated}
          onHeatmapRenderComplete={onHeatmapRenderComplete}
          userId={userId}
        />
      )}

      {/* Heatmap Data Service */}
      <HeatmapDataService
        selectedCategory={heatmapCategory}
        selectedSubcategory={heatmapSubcategory}
        dataType={heatmapDataType}
        onDataProcessed={handleHeatmapDataProcessed}
        onRankedDataCalculated={onRankedDataCalculated}
        loadingComplete={loadingComplete}
      />
    </div>
  );
});

AustralianMap.displayName = 'AustralianMap';

export default AustralianMap;