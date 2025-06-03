'use client';

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

// MapTiler API key - you'll need to add this to your environment variables
const MAPTILER_API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || 'YOUR_MAPTILER_API_KEY';

interface FacilityTypes {
  residential: boolean;
  home: boolean;
  retirement: boolean;
}

type GeoLayerType = 'sa2' | 'sa3' | 'sa4' | 'lga' | 'postcode' | 'locality';
type MapStyleType = 'basic' | 'topo' | 'satellite' | 'terrain' | 'streets';

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
}

// Expose methods to parent component
export interface AustralianMapRef {
  clearHighlight: () => void;
}

const AustralianMap = forwardRef<AustralianMapRef, AustralianMapProps>(({
  className = "",
  facilityTypes,
  selectedGeoLayer,
  selectedMapStyle,
  mapNavigation,
  onHighlightFeature,
  onClearSearchResult
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const selectedGeoLayerRef = useRef<GeoLayerType>(selectedGeoLayer);
  const isInitialLoadRef = useRef<boolean>(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);
  const [highlightedFeature, setHighlightedFeature] = useState<string | null>(null);
  const [highlightedFeatureName, setHighlightedFeatureName] = useState<string | null>(null);
  
  // Track markers with proper cleanup
  const markersRef = useRef<maptilersdk.Marker[]>([]);
  
  // Track processed navigation to prevent repeated map movements
  const lastProcessedNavigationRef = useRef<string | null>(null);

  // Stabilize facilityTypes to prevent unnecessary re-renders
  const stableFacilityTypes = useMemo(() => facilityTypes, [
    facilityTypes.residential,
    facilityTypes.home,
    facilityTypes.retirement
  ]);

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

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    maptilersdk.config.apiKey = MAPTILER_API_KEY;

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: getMapStyle(selectedMapStyle),
      center: [133.7751, -25.2744], // Center of Australia
      zoom: 4,
      maxZoom: 18,
      minZoom: 3
    });

    // Add controls
    map.current.addControl(new maptilersdk.NavigationControl(), 'top-right');
    map.current.addControl(new maptilersdk.ScaleControl(), 'bottom-right');

    map.current.on('load', () => {
      setIsLoaded(true);
      
      // Add click handler
      if (map.current) {
        map.current.on('click', handleMapClick);
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [selectedMapStyle]);

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
  }, []);

  // Helper function to handle facility hover
  const handleFacilityHover = useCallback((facility: any, markerElement: HTMLElement, isEntering: boolean) => {
    if (isEntering) {
      markerElement.style.transform = 'scale(1.2)';
      markerElement.style.zIndex = '1000';
    } else {
      markerElement.style.transform = 'scale(1)';
      markerElement.style.zIndex = '1';
    }
  }, []);

  // Load healthcare facilities with proper coordinate handling
  const addHealthcareFacilities = useCallback(async (types: FacilityTypes) => {
    if (!map.current) return;

    try {
      console.log('🏥 Loading healthcare facilities...');
      const response = await fetch('/maps/healthcare.geojson');
      
      if (!response.ok) {
        throw new Error(`Failed to load healthcare data: ${response.status}`);
      }
      
      const healthcareData = await response.json();
      console.log('🏥 Healthcare data loaded:', { 
        totalFeatures: healthcareData.features?.length || 0
      });
      
      if (!healthcareData.features) {
        console.warn('❌ No features found in healthcare data');
        return;
      }

      // Define care type mapping
      const careTypeMapping = {
        residential: ['Residential', 'Multi-Purpose Service'],
        home: ['Home Care', 'Community Care'],
        retirement: ['Retirement', 'Retirement Living', 'Retirement Village']
      };

      // Define colors for each type
      const typeColors = {
        residential: '#E53E3E', // Red
        home: '#2E8B57',        // Green
        retirement: '#9B59B6'   // Purple
      };

      // Process each enabled facility type
      Object.entries(types).forEach(([type, enabled]) => {
        if (!enabled) return;

        const typeKey = type as keyof typeof careTypeMapping;
        const careTypes = careTypeMapping[typeKey];
        
        // Filter facilities based on care type
        const filteredFacilities = healthcareData.features.filter((feature: any) => {
          const facilityCareType = feature.properties?.Care_Type;
          if (!facilityCareType) return false;

          if (typeKey === 'residential') {
            return careTypes.some(ct => facilityCareType.includes(ct));
          } else if (typeKey === 'home') {
            return (facilityCareType.includes('Multi-Purpose Service') && feature.properties?.Home_Care_Places > 0) ||
                   careTypes.some(ct => facilityCareType.includes(ct));
          } else if (typeKey === 'retirement') {
            return careTypes.some(ct => facilityCareType.toLowerCase().includes(ct.toLowerCase())) ||
                   feature.properties?.Service_Name?.toLowerCase().includes('retirement');
          }
          
          return false;
        });

        let validFacilities = 0;
        let invalidCoordinates = 0;
        let outsideBounds = 0;

        // Add markers for filtered facilities
        filteredFacilities.forEach((facility: any, index: number) => {
          const properties = facility.properties;
          
          // Use separate Latitude/Longitude fields (not GeoJSON coordinates)
          const lat = properties?.Latitude;
          const lng = properties?.Longitude;
          
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

          // Extract facility details
          const serviceName = properties?.Service_Name || 'Unknown Service';
          const address = properties?.Physical_Address || 'Address not available';
          const careType = properties?.Care_Type || 'Unknown';
          const state = properties?.Physical_State || '';
          const postcode = properties?.Physical_Postcode || '';
          const phone = properties?.Phone || '';
          const email = properties?.Email || '';
          const website = properties?.Website || '';
          const residentialPlaces = properties?.Residential_Places || 0;
          const homeCareMaxPlaces = properties?.Home_Care_Max_Places || 0;

          // Create beautiful popup
          const popup = new maptilersdk.Popup({ 
            offset: 25,
            closeButton: true,
            closeOnClick: false,
            className: 'custom-popup'
          })
          .setHTML(`
            <div class="aged-care-popup">
              <div class="popup-header" style="background: linear-gradient(135deg, ${typeColors[typeKey]}20, ${typeColors[typeKey]}10); border-left: 4px solid ${typeColors[typeKey]};">
                <h3 class="popup-title">${serviceName}</h3>
                <span class="popup-type" style="background-color: ${typeColors[typeKey]}20; color: ${typeColors[typeKey]};">${careType}</span>
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

          // Create and add marker
          const marker = new maptilersdk.Marker({ 
            element: markerElement,
            anchor: 'center'
          })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current!);

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

  // Effect to handle facility type changes
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    
    // Clear existing markers
    clearAllMarkers();
    
    // Add healthcare facilities
    if (Object.values(stableFacilityTypes).some(Boolean)) {
      addHealthcareFacilities(stableFacilityTypes);
    }
  }, [isLoaded, stableFacilityTypes, clearAllMarkers, addHealthcareFacilities]);

  // Helper function to get the right property field for each layer type
  const getPropertyField = (layerType: GeoLayerType): string => {
    switch (layerType) {
      case 'postcode': return 'poa_code_2021';
      case 'lga': return 'lga_code_2021';
      case 'sa2': return 'sa2_code_2021';
      case 'sa3': return 'sa3_code_2021';
      case 'sa4': return 'sa4_code_2021';
      case 'locality': return 'SAL_CODE21';
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
      default: return `${(layerType as string).toUpperCase()}: ${properties?.[getPropertyField(layerType)]}`;
    }
  };

  const clearHighlight = useCallback(() => {
    if (!map.current) return;

    const layerTypes: GeoLayerType[] = ['sa2', 'sa3', 'sa4', 'lga', 'postcode', 'locality'];
    
    layerTypes.forEach(type => {
      const highlightLayerId = `${type}-highlight`;
      try {
        if (map.current!.getLayer(highlightLayerId)) {
          map.current!.setFilter(highlightLayerId, ['==', ['get', getPropertyField(type)], '']);
        }
      } catch (error) {
        console.warn(`Failed to clear highlight for ${type}:`, error);
      }
    });
    
    setHighlightedFeature(null);
    setHighlightedFeatureName(null);
    onHighlightFeature?.(null, null);
  }, [setHighlightedFeature, setHighlightedFeatureName, onHighlightFeature]);

  const handleMapClick = useCallback((e: any) => {
    if (!map.current) return;

    const currentGeoLayer = selectedGeoLayerRef.current;
    const features = map.current.queryRenderedFeatures(e.point, {
      layers: [`${currentGeoLayer}-fill`]
    });

    if (features.length > 0) {
      // If multiple features, pick the smallest one (most specific)
      const feature = features.length > 1 
        ? features.reduce((smallest, current) => {
            const smallestArea = smallest.properties?.st_area_shape || Infinity;
            const currentArea = current.properties?.st_area_shape || Infinity;
            return currentArea < smallestArea ? current : smallest;
          })
        : features[0];

      const properties = feature.properties;
      const propertyField = getPropertyField(currentGeoLayer);
      const featureId = properties?.[propertyField];
      const featureName = getFeatureName(currentGeoLayer, properties);
      
      if (featureId) {
        // Clear any active search result since user is manually selecting
        onClearSearchResult?.();
        
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
        clearHighlight();
      }
    } else {
      clearHighlight();
    }
  }, [clearHighlight, getPropertyField, getFeatureName, setHighlightedFeature, setHighlightedFeatureName, onHighlightFeature, onClearSearchResult]);

  // Helper function to determine appropriate zoom level for each layer type
  const getAppropriateZoom = (layerType: GeoLayerType, currentZoom: number): number | null => {
    const minZoomForLayer: Record<GeoLayerType, number> = {
      'sa4': 5,
      'sa3': 6,
      'lga': 7,
      'sa2': 8,
      'postcode': 9,
      'locality': 11
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

    console.log(`Loading boundary layer: ${layerType}`);
    setBoundaryLoading(true);
    setBoundaryError(null);

    try {
      // Remove all existing boundary layers first
      const boundaryTypes: GeoLayerType[] = ['sa2', 'sa3', 'sa4', 'lga', 'postcode', 'locality'];
      
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

      // Load the new boundary data
      const fileMap: Record<GeoLayerType, string> = {
        'postcode': 'POA.geojson',
        'lga': 'LGA.geojson',
        'sa2': 'SA2.geojson',
        'sa3': 'SA3.geojson',
        'sa4': 'SA4.geojson',
        'locality': 'SAL.geojson'
      };

      const fileName = fileMap[layerType];
      console.log(`Fetching boundary file: /maps/${fileName}`);
      
      // Special handling for large files
      if (layerType === 'sa2') {
        console.log('⚠️  Loading SA2 boundaries - this is a large file (170MB) and may take time...');
      }
      
      const startTime = Date.now();
      const response = await fetch(`/maps/${fileName}`);
      const fetchTime = Date.now() - startTime;
      
      console.log(`Fetch completed in ${fetchTime}ms for ${fileName}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log(`Successfully fetched ${fileName} (${response.headers.get('content-length') ? Math.round(parseInt(response.headers.get('content-length')!) / 1024 / 1024) + 'MB' : 'unknown size'}), parsing JSON...`);
      const parseStartTime = Date.now();
      const geojsonData = await response.json();
      const parseTime = Date.now() - parseStartTime;
      console.log(`Parsed ${fileName} in ${parseTime}ms, features count:`, geojsonData.features?.length || 0);
      
      // Add the new source and layers
      const sourceId = `${layerType}-source`;
      
      // Ensure source doesn't exist before adding
      if (map.current!.getSource(sourceId)) {
        map.current!.removeSource(sourceId);
      }
      
      console.log(`Adding source: ${sourceId}`);
      map.current!.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData
      });

      // Add invisible fill layer for click detection
      console.log(`Adding fill layer: ${layerType}-fill`);
      map.current!.addLayer({
        id: `${layerType}-fill`,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': 'transparent',
          'fill-opacity': 0
        }
      });

      // Add outline layer
      console.log(`Adding outline layer: ${layerType}-layer`);
      map.current!.addLayer({
        id: `${layerType}-layer`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#E53E3E',
          'line-width': 1.5,
          'line-opacity': 0.8
        }
      });

      // Add highlight layer (initially hidden)
      console.log(`Adding highlight layer: ${layerType}-highlight`);
      map.current!.addLayer({
        id: `${layerType}-highlight`,
        type: 'fill',
        source: sourceId,
        filter: ['==', ['get', getPropertyField(layerType)], ''], // Initially hide all
        paint: {
          'fill-color': '#E53E3E',
          'fill-opacity': 0.1
        }
      });

      console.log(`Successfully loaded ${layerType} boundary layer`);
      setBoundaryLoading(false);
      
    } catch (error) {
      console.error(`Error loading ${layerType} boundary data:`, error);
      setBoundaryError(`Failed to load ${layerType} boundaries: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setBoundaryLoading(false);
    }
  }, [setBoundaryLoading, setBoundaryError]);

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

  // Expose clearHighlight method to parent
  useImperativeHandle(ref, () => ({
    clearHighlight: () => {
      clearHighlight();
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
        `
      }} />
      
      <div 
        ref={mapContainer}
        className="w-full h-full min-h-[400px] rounded-lg"
        style={{ minHeight: '500px' }}
      />
      
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
    </div>
  );
});

AustralianMap.displayName = 'AustralianMap';

export default AustralianMap;