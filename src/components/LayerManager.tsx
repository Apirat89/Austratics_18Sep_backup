'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { mapBusy } from '../lib/mapBusy';
import { waitForStyleAndIdle, safeMapOperation } from '../lib/mapboxEvents';
import { globalLoadingCoordinator } from './MapLoadingCoordinator';
import { trackApiCall } from '@/lib/usageTracking';
import { getMapDataUrl } from '../lib/supabaseStorage';

interface SA2HeatmapData {
  [sa2Id: string]: number;
}

interface LayerManagerProps {
  map: MapLibreMap;
  // Heatmap props
  sa2HeatmapData?: SA2HeatmapData | null;
  sa2HeatmapVisible?: boolean;
  heatmapDataReady?: boolean;
  onHeatmapMinMaxCalculated?: (minValue: number | undefined, maxValue: number | undefined) => void;
  // Facility coordination
  facilityLoading?: boolean;
  // General map state
  mapLoaded?: boolean;
  // ✅ NEW: Completion callback for real-time loading indicator
  onHeatmapRenderComplete?: () => void;
  // User ID for tracking
  userId?: string;
}

export default function LayerManager({
  map,
  sa2HeatmapData,
  sa2HeatmapVisible = false,
  heatmapDataReady = false,
  onHeatmapMinMaxCalculated,
  facilityLoading = false,
  mapLoaded = false,
  onHeatmapRenderComplete,
  userId
}: LayerManagerProps) {
  // Layer management state
  const [boundaryLoaded, setBoundaryLoaded] = useState(false);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);
  
  // Cache for boundary data to avoid reloading
  const boundaryDataCache = useRef<Map<string, any>>(new Map());
  
  // ⚡ PERFORMANCE: Style expression cache to avoid recreating expressions
  const styleExpressionCache = useRef<Map<string, any>>(new Map());
  const minMaxCache = useRef<Map<string, { minValue: number; maxValue: number }>>(new Map());
  
  // ✅ MEMORY MANAGEMENT: Cache size limits to prevent memory leaks
  const MAX_CACHE_SIZE = 50; // Limit cache to 50 entries
  
  // ✅ MEMORY MANAGEMENT: Cleanup old cache entries when limit is reached
  const cleanupCache = useCallback(() => {
    if (styleExpressionCache.current.size > MAX_CACHE_SIZE) {
      const entries = Array.from(styleExpressionCache.current.entries());
      const toKeep = entries.slice(-MAX_CACHE_SIZE / 2); // Keep most recent half
      styleExpressionCache.current.clear();
      toKeep.forEach(([key, value]) => styleExpressionCache.current.set(key, value));
      console.log(`🧹 LayerManager: Cleaned style expression cache, kept ${toKeep.length} entries`);
    }
    
    if (minMaxCache.current.size > MAX_CACHE_SIZE) {
      const entries = Array.from(minMaxCache.current.entries());
      const toKeep = entries.slice(-MAX_CACHE_SIZE / 2); // Keep most recent half
      minMaxCache.current.clear();
      toKeep.forEach(([key, value]) => minMaxCache.current.set(key, value));
      console.log(`🧹 LayerManager: Cleaned min/max cache, kept ${toKeep.length} entries`);
    }
  }, []);
  
  // Refs for stable data access
  const heatmapDataRef = useRef<SA2HeatmapData | null>(null);
  const heatmapVisibleRef = useRef<boolean>(false);
  
  // ✅ SAFETY: Add error boundary recovery for heatmap updates
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const MAX_CONSECUTIVE_ERRORS = 3;
  
  // Update refs when props change
  useEffect(() => {
    heatmapDataRef.current = sa2HeatmapData || null;
    heatmapVisibleRef.current = sa2HeatmapVisible;
  }, [sa2HeatmapData, sa2HeatmapVisible]);

  // ⚡ PERFORMANCE: Generate cached style expression to avoid recreation
  const generateCachedStyleExpression = useCallback((data: SA2HeatmapData): { 
    expression: any[], 
    minValue: number, 
    maxValue: number 
  } => {
    const dataEntries = Object.entries(data);
    
    // Create cache key from data signature (SA2 count + sample values)
    const sortedEntries = dataEntries.slice(0, 5).sort(); // Sample for cache key
    const cacheKey = `${dataEntries.length}-${sortedEntries.map(([id, val]) => `${id}:${val}`).join('|')}`;
    
    // Check style expression cache first
    const cachedExpression = styleExpressionCache.current.get(cacheKey);
    const cachedMinMax = minMaxCache.current.get(cacheKey);
    
    if (cachedExpression && cachedMinMax) {
      console.log(`⚡ LayerManager: Using cached style expression (${dataEntries.length} regions)`);
      return {
        expression: cachedExpression,
        minValue: cachedMinMax.minValue,
        maxValue: cachedMinMax.maxValue
      };
    }

    // Generate new style expression
    console.log(`🔧 LayerManager: Generating new style expression (${dataEntries.length} regions)`);
    const expressionStart = performance.now();
    
    // Calculate min/max values for normalization
    const values = dataEntries.map(([_, value]) => value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue;

    // Create data-driven heatmap expression
    const caseExpression: (string | any[])[] = ['case'];
    
    for (const [sa2Id, value] of dataEntries) {
      // Normalize value to 0-1 range
      const normalizedValue = valueRange > 0 ? (value - minValue) / valueRange : 0;
      
      // Calculate opacity (0 minimum, 0.8 maximum)
      const opacity = normalizedValue * 0.8;
      
      // Add condition and color
      caseExpression.push(
        ['==', ['get', 'sa2_code_2021'], sa2Id],
        `rgba(239, 68, 68, ${opacity})` // Red with calculated opacity
      );
    }
    
    // Default case: transparent for SA2s without data
    caseExpression.push('rgba(0,0,0,0)');

    // Cache the results
    styleExpressionCache.current.set(cacheKey, caseExpression);
    minMaxCache.current.set(cacheKey, { minValue, maxValue });
    
    // ✅ MEMORY MANAGEMENT: Cleanup cache if it gets too large
    cleanupCache();
    
    const expressionTime = performance.now() - expressionStart;
    console.log(`⚡ LayerManager: Style expression generated and cached in ${expressionTime.toFixed(2)}ms`);

    return {
      expression: caseExpression,
      minValue,
      maxValue
    };
  }, []);

  // Load SA2 boundaries for heatmap (centralized)
  const loadSA2Boundaries = useCallback(async () => {
    if (!map || boundaryLoading || boundaryLoaded || mapBusy.isBusy) return;

    console.log('🏗️ LayerManager: Loading SA2 boundaries...');
    mapBusy.acquire();
    setBoundaryLoading(true);
    setBoundaryError(null);

    // ✅ SAFETY: Add timeout to prevent permanent deadlock
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ LayerManager: SA2 boundary loading timeout, forcing release');
      mapBusy.release();
      setBoundaryLoading(false);
    }, 30000); // 30 second timeout

    try {
      await waitForStyleAndIdle(map);
      
      // Check cache first
      let geojsonData = boundaryDataCache.current.get('sa2-heatmap');
      
      if (geojsonData) {
        console.log('📦 LayerManager: Using cached SA2 boundary data');
        globalLoadingCoordinator.reportBoundaryLoading(100);
      } else {
        console.log('🔄 LayerManager: Loading SA2 boundary data...');
        
        // Load from Supabase Storage
        try {
          console.log('🔍 LayerManager: Loading SA2.geojson from Supabase Storage bucket');
          const supabaseUrl = getMapDataUrl('SA2.geojson');
          console.log('🔍 Using URL:', supabaseUrl);
          
          globalLoadingCoordinator.reportBoundaryLoading(10);
          
          const response = await fetch(supabaseUrl);
          
          if (!response.ok) {
            throw new Error(`Failed to load SA2.geojson from Supabase: ${response.status} ${response.statusText}`);
          }
          
          geojsonData = await response.json();
          
          globalLoadingCoordinator.reportBoundaryLoading(100);
          console.log('✅ LayerManager: Successfully loaded SA2 boundary data from Supabase Storage');
          console.log(`📊 LayerManager: Features loaded: ${geojsonData.features?.length || 0}`);
        } catch (error) {
          console.error('❌ LayerManager: Error loading SA2.geojson:', error);
          setBoundaryError(`Failed to load map boundaries. ${error instanceof Error ? error.message : 'Unknown error'}`);
          throw error; // Propagate error to outer try-catch
        }

        // Cache the data
        boundaryDataCache.current.set('sa2-heatmap', geojsonData);
      }

      const sourceId = 'sa2-heatmap-source';

      // Add source for heatmap if it doesn't exist
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData
        });
        console.log('✅ LayerManager: SA2 heatmap source added');
      }

      setBoundaryLoaded(true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ LayerManager: Error loading SA2 boundaries:', errorMessage);
      setBoundaryError(errorMessage);
      
      // ✅ SAFETY: Force reset mapBusy if we're in an error state
      if (mapBusy.isBusy) {
        console.warn('⚠️ LayerManager: Force resetting mapBusy due to boundary loading error');
        mapBusy.reset();
      }
    } finally {
      clearTimeout(timeoutId);
      setBoundaryLoading(false);
      mapBusy.release();
    }
  }, [map, boundaryLoading, boundaryLoaded]);

  // Create or update heatmap layer
  const ensureHeatmapLayer = useCallback(async () => {
    if (!map || !boundaryLoaded || mapBusy.isBusy || facilityLoading) {
      console.log('⏸️ LayerManager: Heatmap paused - not ready or busy', {
        mapExists: !!map,
        boundaryLoaded,
        mapBusy: mapBusy.isBusy,
        facilityLoading
      });
      return;
    }

    // Only proceed if we have data and visibility is enabled
    if (!heatmapDataReady || !heatmapDataRef.current || Object.keys(heatmapDataRef.current).length === 0) {
      console.log('📊 LayerManager: No heatmap data available');
      onHeatmapMinMaxCalculated?.(undefined, undefined);
      
      // Hide layer if it exists but has no data
      const heatmapLayerId = 'sa2-heatmap-background';
      if (map.getLayer(heatmapLayerId)) {
        map.setLayoutProperty(heatmapLayerId, 'visibility', 'none');
      }
      return;
    }

    console.log('🔧 LayerManager: Ensuring heatmap layer...');

    await safeMapOperation(map, async () => {
      const heatmapLayerId = 'sa2-heatmap-background';
      const sa2SourceId = 'sa2-heatmap-source';
      const layerExists = map.getLayer(heatmapLayerId);

      // If heatmap should be visible and we have data
      if (heatmapVisibleRef.current && heatmapDataRef.current) {
        const data = heatmapDataRef.current;
        const dataEntries = Object.entries(data);
        
        if (dataEntries.length === 0) {
          console.log('📊 LayerManager: No heatmap data entries to display');
          onHeatmapMinMaxCalculated?.(undefined, undefined);
          
          // Hide layer if it exists but has no data
          if (layerExists) {
            map.setLayoutProperty(heatmapLayerId, 'visibility', 'none');
          }
          return;
        }

        // ⚡ PERFORMANCE: Use cached style expression generation
        const { expression: caseExpression, minValue, maxValue } = generateCachedStyleExpression(data);

        console.log(`🗺️ LayerManager: Updating SA2 heatmap with ${dataEntries.length} data points`);
        console.log(`📊 LayerManager: Value range: ${minValue} - ${maxValue}`);

        // Pass min/max values to parent component for legend display
        onHeatmapMinMaxCalculated?.(minValue, maxValue);

        if (layerExists) {
          // ⚡ LAYER REUSE: Update existing layer paint properties
          console.log('⚡ LayerManager: Reusing existing layer in ensureHeatmapLayer');
          map.setPaintProperty(heatmapLayerId, 'fill-color', caseExpression as any);
          map.setLayoutProperty(heatmapLayerId, 'visibility', 'visible');
        } else {
          // ✨ CREATE NEW: Layer doesn't exist, create it
          console.log('✨ LayerManager: Creating new heatmap layer in ensureHeatmapLayer');
          map.addLayer({
            id: heatmapLayerId,
            type: 'fill',
            source: sa2SourceId,
            paint: {
              'fill-color': caseExpression as any,
              'fill-opacity': 0.7
            },
            layout: {
              'visibility': 'visible'
            }
          });
        }

        console.log('✅ LayerManager: Heatmap layer ensured successfully');
      } else {
        console.log('📊 LayerManager: Heatmap not visible or no data, hiding layer');
        onHeatmapMinMaxCalculated?.(undefined, undefined);
        
        // Hide layer instead of removing it
        if (layerExists) {
          map.setLayoutProperty(heatmapLayerId, 'visibility', 'none');
        }
      }
    }, 'heatmap layer creation');
  }, [map, boundaryLoaded, heatmapDataReady, facilityLoading, onHeatmapMinMaxCalculated]);

  // Restore all layers after style changes (centralized restoration)
  const restoreAllLayers = useCallback(async () => {
    if (!map || mapBusy.isBusy) return;

    console.log('🔄 LayerManager: Restoring all layers after style change...');
    mapBusy.acquire();

    try {
      await waitForStyleAndIdle(map);
      
      // Restore boundaries if they were loaded
      if (boundaryLoaded) {
        console.log('🔄 LayerManager: Restoring SA2 boundaries...');
        const cachedData = boundaryDataCache.current.get('sa2-heatmap');
        if (cachedData && !map.getSource('sa2-heatmap-source')) {
          map.addSource('sa2-heatmap-source', {
            type: 'geojson',
            data: cachedData
          });
          console.log('✅ LayerManager: SA2 source restored');
        }
      }
      
      // Restore heatmap layer
      await ensureHeatmapLayer();
      
      console.log('✅ LayerManager: All layers restored');
    } catch (error) {
      console.error('❌ LayerManager: Error restoring layers:', error);
    } finally {
      mapBusy.release();
    }
  }, [map, boundaryLoaded, ensureHeatmapLayer]);

  // Listen for style changes and restore layers
  useEffect(() => {
    if (!map || !mapLoaded) return;

    const handleStyleData = () => {
      console.log('🎨 LayerManager: Style change detected, will restore layers...');
      // Use setTimeout to ensure this runs after other style handlers
      setTimeout(() => {
        restoreAllLayers();
      }, 100);
    };

    map.on('styledata', handleStyleData);

    return () => {
      map.off('styledata', handleStyleData);
    };
  }, [map, mapLoaded, restoreAllLayers]);

  // Load boundaries when conditions are met
  useEffect(() => {
    if (!map || !mapLoaded || boundaryLoaded || boundaryLoading) return;
    
    // Only load boundaries if heatmap data is ready or will be visible
    if (heatmapDataReady || sa2HeatmapVisible) {
      console.log('🚀 LayerManager: Starting boundary loading...');
      loadSA2Boundaries();
    }
  }, [map, mapLoaded, heatmapDataReady, sa2HeatmapVisible, boundaryLoaded, boundaryLoading, loadSA2Boundaries]);

  // Update heatmap layer when data or visibility changes
  useEffect(() => {
    console.log('🗺️ LayerManager: Heatmap layer update triggered:', {
      hasHeatmapData: !!heatmapDataRef.current,
      dataLength: heatmapDataRef.current ? Object.keys(heatmapDataRef.current).length : 0,
      heatmapVisible: heatmapVisibleRef.current,
      heatmapDataReady,
      boundaryLoaded,
      facilityLoading
    });

    // Early return if boundary data isn't loaded yet
    if (!boundaryLoaded) {
      console.log('⏳ LayerManager: Boundary data not loaded yet, skipping heatmap update');
      return;
    }

    // Don't update heatmap while facilities are loading to avoid interference
    if (facilityLoading) {
      console.log('⏳ LayerManager: Facilities are loading, skipping heatmap update');
      return;
    }

    // ✅ SAFETY: Skip update if too many consecutive errors
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error(`❌ LayerManager: Skipping heatmap update due to ${consecutiveErrors} consecutive errors. Manual intervention required.`);
      // Force reset mapBusy if stuck
      if (mapBusy.isBusy) {
        console.warn('⚠️ LayerManager: Force resetting mapBusy due to consecutive errors');
        mapBusy.reset();
      }
      return;
    }

    // ⚡ PERFORMANCE OPTIMIZATION: Use layer reuse instead of recreation
    (async () => {
      const performanceStart = performance.now();

      try {
        await safeMapOperation(map, async () => {
        const heatmapLayerId = 'sa2-heatmap-background';
        const sa2SourceId = 'sa2-heatmap-source';

        // Check if layer exists
        const layerExists = map.getLayer(heatmapLayerId);

        // If heatmap should be visible and we have data
        if (heatmapVisibleRef.current && heatmapDataRef.current) {
          const data = heatmapDataRef.current;
          const dataEntries = Object.entries(data);
          
          if (dataEntries.length === 0) {
            console.log('📊 LayerManager: No heatmap data entries to display');
            onHeatmapMinMaxCalculated?.(undefined, undefined);
            
            // Hide layer if it exists but has no data
            if (layerExists) {
              map.setLayoutProperty(heatmapLayerId, 'visibility', 'none');
            }
            
            // ✅ FIXED: Report completion even when no data
            onHeatmapRenderComplete?.();
            
            // Track heatmap render event if user ID is available
            if (userId) {
              trackApiCall({
                userId,
                page: '/maps',
                service: 'maptiler',
                action: 'heatmap_render',
                endpoint: 'MapTiler heatmap',
                method: 'SDK',
                meta: { status: 'no_data' }
              });
            }
            return;
          }

          // ⚡ PERFORMANCE: Use cached style expression generation
          const { expression: caseExpression, minValue, maxValue } = generateCachedStyleExpression(data);

          console.log(`🗺️ LayerManager: Updating SA2 heatmap with ${dataEntries.length} data points`);
          console.log(`📊 LayerManager: Value range: ${minValue} - ${maxValue}`);

          // Pass min/max values to parent component for legend display
          onHeatmapMinMaxCalculated?.(minValue, maxValue);

          if (layerExists) {
            // ⚡ LAYER REUSE: Update existing layer paint properties instead of recreating
            console.log('⚡ LayerManager: Reusing existing layer - updating paint properties');
            map.setPaintProperty(heatmapLayerId, 'fill-color', caseExpression as any);
            map.setLayoutProperty(heatmapLayerId, 'visibility', 'visible');
          } else {
            // ✨ CREATE NEW: Layer doesn't exist, create it
            console.log('✨ LayerManager: Creating new heatmap layer');
            map.addLayer({
              id: heatmapLayerId,
              type: 'fill',
              source: sa2SourceId,
              paint: {
                'fill-color': caseExpression as any,
                'fill-opacity': 0.7
              },
              layout: {
                'visibility': 'visible'
              }
            });
          }

          console.log('✅ LayerManager: Heatmap layer updated successfully');
          
          // ✅ FIXED: Report completion to DataLayers for real-time loading indicator
          onHeatmapRenderComplete?.();
          
          // Track successful heatmap render
          if (userId) {
            trackApiCall({
              userId,
              page: '/maps',
              service: 'maptiler',
              action: 'heatmap_render',
              endpoint: 'MapTiler heatmap',
              method: 'SDK',
              meta: { 
                status: 'success',
                dataPoints: dataEntries.length,
                minValue,
                maxValue 
              }
            });
          }
          
        } else {
          console.log('📊 LayerManager: Heatmap not visible or no data, hiding layer');
          onHeatmapMinMaxCalculated?.(undefined, undefined);
          
          // Hide layer instead of removing it
          if (layerExists) {
            console.log('👁️ LayerManager: Hiding existing heatmap layer');
            map.setLayoutProperty(heatmapLayerId, 'visibility', 'none');
          }
          
          // ✅ FIXED: Report completion even when hiding heatmap
          onHeatmapRenderComplete?.();
          
          // Track hide heatmap event
          if (userId) {
            trackApiCall({
              userId,
              page: '/maps',
              service: 'maptiler',
              action: 'heatmap_hide',
              endpoint: 'MapTiler heatmap',
              method: 'SDK'
            });
          }
        }
        
          const totalTime = performance.now() - performanceStart;
          console.log(`⚡ PERFORMANCE: LayerManager update completed in ${totalTime.toFixed(2)}ms`);
          
        }, 'heatmap layer update');
      } catch (error) {
        console.error('❌ LayerManager: Heatmap update error:', error);
        setConsecutiveErrors(prev => prev + 1);
        
        // ✅ SAFETY: Report completion even on error to prevent stuck loading indicators
        onHeatmapRenderComplete?.();
        
        // Track error event
        if (userId) {
          trackApiCall({
            userId,
            page: '/maps',
            service: 'maptiler',
            action: 'heatmap_error',
            endpoint: 'MapTiler heatmap',
            method: 'SDK',
            meta: { error: error instanceof Error ? error.message : String(error) }
          });
        }
        
        // Force reset mapBusy if we're in an error state
        if (mapBusy.isBusy) {
          console.warn('⚠️ LayerManager: Force resetting mapBusy due to heatmap update error');
          mapBusy.reset();
        }
      }
    })();
  }, [map, boundaryLoaded, heatmapDataReady, facilityLoading, onHeatmapMinMaxCalculated, onHeatmapRenderComplete, cleanupCache, consecutiveErrors, userId]);

  // ✅ MEMORY MANAGEMENT: Cleanup caches when component unmounts
  useEffect(() => {
    return () => {
      console.log('🧹 LayerManager: Cleaning up caches on unmount');
      styleExpressionCache.current.clear();
      minMaxCache.current.clear();
      boundaryDataCache.current.clear();
    };
  }, []);

  // ✅ SAFETY: Monitor and recover from stuck mapBusy states
  useEffect(() => {
    const monitorInterval = setInterval(() => {
      if (mapBusy.isBusy) {
        console.warn('⚠️ LayerManager: mapBusy has been stuck for potential deadlock detection');
        // Don't auto-reset immediately, just log the warning
        // Allow manual intervention or timeout mechanisms to handle it
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(monitorInterval);
  }, []);

  useEffect(() => {
    // Reset error counter when data changes successfully  
    if (heatmapDataReady && sa2HeatmapData) {
      setConsecutiveErrors(0);
    }
  }, [heatmapDataReady, sa2HeatmapData]);

  // Return error UI if needed
  return (
    <>
      {boundaryError && (
        <div className="absolute top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 z-20 max-w-xs">
          <h4 className="text-sm font-medium text-red-900">Layer Manager Error</h4>
          <p className="text-sm text-red-700 mt-1">{boundaryError}</p>
          <button
            onClick={() => {
              setBoundaryError(null);
              setBoundaryLoading(false);
              setBoundaryLoaded(false);
              loadSA2Boundaries();
            }}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}
    </>
  );
} 