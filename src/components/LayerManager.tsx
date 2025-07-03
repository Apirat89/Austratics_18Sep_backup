'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { mapBusy } from '../lib/mapBusy';
import { waitForStyleAndIdle, safeMapOperation } from '../lib/mapboxEvents';
import { globalLoadingCoordinator } from './MapLoadingCoordinator';

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
}

export default function LayerManager({
  map,
  sa2HeatmapData,
  sa2HeatmapVisible = false,
  heatmapDataReady = false,
  onHeatmapMinMaxCalculated,
  facilityLoading = false,
  mapLoaded = false
}: LayerManagerProps) {
  // Layer management state
  const [boundaryLoaded, setBoundaryLoaded] = useState(false);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);
  
  // Cache for boundary data to avoid reloading
  const boundaryDataCache = useRef<Map<string, any>>(new Map());
  
  // Refs for stable data access
  const heatmapDataRef = useRef<SA2HeatmapData | null>(null);
  const heatmapVisibleRef = useRef<boolean>(false);
  
  // Update refs when props change
  useEffect(() => {
    heatmapDataRef.current = sa2HeatmapData || null;
    heatmapVisibleRef.current = sa2HeatmapVisible;
  }, [sa2HeatmapData, sa2HeatmapVisible]);

  // Load SA2 boundaries for heatmap (centralized)
  const loadSA2Boundaries = useCallback(async () => {
    if (!map || boundaryLoading || boundaryLoaded || mapBusy.isBusy) return;

    console.log('🏗️ LayerManager: Loading SA2 boundaries...');
    mapBusy.acquire();
    setBoundaryLoading(true);
    setBoundaryError(null);

    try {
      await waitForStyleAndIdle(map);
      
      // Check cache first
      let geojsonData = boundaryDataCache.current.get('sa2-heatmap');
      
      if (geojsonData) {
        console.log('📦 LayerManager: Using cached SA2 boundary data');
        globalLoadingCoordinator.reportBoundaryLoading(100);
      } else {
        console.log('📡 LayerManager: Fetching SA2.geojson (170MB file)...');
        globalLoadingCoordinator.reportBoundaryLoading(10);
        const startTime = Date.now();
        
        const response = await fetch('/maps/SA2.geojson');
        if (!response.ok) {
          throw new Error(`Failed to load SA2 boundaries: ${response.status} ${response.statusText}`);
        }
        globalLoadingCoordinator.reportBoundaryLoading(60);
        
        geojsonData = await response.json();
        boundaryDataCache.current.set('sa2-heatmap', geojsonData);
        globalLoadingCoordinator.reportBoundaryLoading(100);
        
        const loadTime = (Date.now() - startTime) / 1000;
        console.log(`✅ LayerManager: SA2 boundaries loaded in ${loadTime.toFixed(1)}s`);
        console.log(`📊 LayerManager: Features: ${geojsonData.features?.length || 0}`);
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
    } finally {
      setBoundaryLoading(false);
      mapBusy.release();
    }
  }, [map, boundaryLoading, boundaryLoaded]);

  // Create or update heatmap layer
  const ensureHeatmapLayer = useCallback(async () => {
    if (!map || !boundaryLoaded || mapBusy.isBusy) {
      console.log('⏸️ LayerManager: Heatmap paused - not ready or busy', {
        mapExists: !!map,
        boundaryLoaded,
        mapBusy: mapBusy.isBusy,
        facilityLoading: facilityLoading ? 'true (coordination only)' : 'false'
      });
      return;
    }

    // Only proceed if we have data and visibility is enabled
    if (!heatmapDataReady || !heatmapDataRef.current || Object.keys(heatmapDataRef.current).length === 0) {
      console.log('📊 LayerManager: No heatmap data available');
      onHeatmapMinMaxCalculated?.(undefined, undefined);
      return;
    }

    console.log('🔧 LayerManager: Ensuring heatmap layer...');

    await safeMapOperation(map, async () => {
      const heatmapLayerId = 'sa2-heatmap-background';
      const sa2SourceId = 'sa2-heatmap-source';

      // Remove existing heatmap layer if it exists
      if (map.getLayer(heatmapLayerId)) {
        console.log('🗑️ LayerManager: Removing existing heatmap layer');
        map.removeLayer(heatmapLayerId);
      }

      // If heatmap should be visible and we have data
      if (heatmapVisibleRef.current && heatmapDataRef.current) {
        const data = heatmapDataRef.current;
        const dataEntries = Object.entries(data);
        
        if (dataEntries.length === 0) {
          console.log('📊 LayerManager: No heatmap data entries to display');
          onHeatmapMinMaxCalculated?.(undefined, undefined);
          return;
        }

        // Find min and max values for normalization
        const values = dataEntries.map(([_, value]) => value);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const valueRange = maxValue - minValue;

        console.log(`🗺️ LayerManager: Rendering SA2 heatmap with ${dataEntries.length} data points`);
        console.log(`📊 LayerManager: Value range: ${minValue} - ${maxValue}`);

        // Pass min/max values to parent component for legend display
        onHeatmapMinMaxCalculated?.(minValue, maxValue);

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

         // Add heatmap layer
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

        console.log('✅ LayerManager: Heatmap layer created successfully');
      } else {
        console.log('📊 LayerManager: Heatmap not visible or no data, clearing min/max');
        onHeatmapMinMaxCalculated?.(undefined, undefined);
      }
    }, 'heatmap layer creation');
  }, [map, boundaryLoaded, heatmapDataReady, onHeatmapMinMaxCalculated]);

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

  // Update heatmap when data or visibility changes
  useEffect(() => {
    if (!mapLoaded || !boundaryLoaded) return;
    
    console.log('🔄 LayerManager: Heatmap data/visibility/facility loading changed, updating layer...');
    ensureHeatmapLayer();
  }, [sa2HeatmapData, sa2HeatmapVisible, heatmapDataReady, mapLoaded, boundaryLoaded, ensureHeatmapLayer, facilityLoading]);

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