'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Map as MapLibreMap } from '@maptiler/sdk';
import { globalLoadingCoordinator } from './MapLoadingCoordinator';

interface SA2HeatmapData {
  [sa2Id: string]: number;
}

interface HeatmapBackgroundLayerProps {
  map: MapLibreMap | null;
  sa2HeatmapData?: SA2HeatmapData | null;
  sa2HeatmapVisible?: boolean;
  dataReady?: boolean;
  mapLoaded?: boolean;
  className?: string;
  onMinMaxCalculated?: (minValue: number | undefined, maxValue: number | undefined) => void;
}

export default function HeatmapBackgroundLayer({ 
  map,
  sa2HeatmapData,
  sa2HeatmapVisible = true,
  dataReady = false,
  mapLoaded = false,
  onMinMaxCalculated
}: HeatmapBackgroundLayerProps) {
  const [boundaryLoaded, setBoundaryLoaded] = useState(false);
  const [boundaryLoading, setBoundaryLoading] = useState(false);
  const [boundaryError, setBoundaryError] = useState<string | null>(null);

  // Cache for boundary data to avoid reloading
  const boundaryDataCache = useRef<Map<string, any>>(new Map());
  
  // Refs for data to avoid stale closures
  const sa2HeatmapDataRef = useRef<SA2HeatmapData | null>(null);
  const sa2HeatmapVisibleRef = useRef<boolean>(false);

  // Update refs when props change
  useEffect(() => {
    sa2HeatmapDataRef.current = sa2HeatmapData || null;
    sa2HeatmapVisibleRef.current = sa2HeatmapVisible || false;
  }, [sa2HeatmapData, sa2HeatmapVisible]);

  // Load SA2 boundaries for heatmap
  const loadSA2Boundaries = useCallback(async () => {
    if (!map || boundaryLoading || boundaryLoaded) return;

    // Check if map style is loaded before proceeding
    if (!map.isStyleLoaded()) {
      console.log('⏳ HeatmapBackgroundLayer: Waiting for map style to load...');
      map.once('styledata', () => {
        console.log('✅ HeatmapBackgroundLayer: Map style loaded, retrying boundary load...');
        loadSA2Boundaries();
      });
      return;
    }

    console.log('🌡️ HeatmapBackgroundLayer: Loading SA2 boundaries for heatmap...');
    setBoundaryLoading(true);
    setBoundaryError(null);

    try {
      // Check cache first
      let geojsonData = boundaryDataCache.current.get('sa2-heatmap');
      
      if (geojsonData) {
        console.log('📦 HeatmapBackgroundLayer: Using cached SA2 boundary data');
        globalLoadingCoordinator.reportBoundaryLoading(100);
      } else {
        console.log('📡 HeatmapBackgroundLayer: Fetching SA2.geojson (170MB file)...');
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
        console.log(`✅ HeatmapBackgroundLayer: SA2 boundaries loaded in ${loadTime.toFixed(1)}s`);
        console.log(`📊 HeatmapBackgroundLayer: Features: ${geojsonData.features?.length || 0}`);
      }

      const sourceId = 'sa2-heatmap-source';

      // Add source for heatmap (separate from main map boundaries)
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData
        });
      }

      setBoundaryLoaded(true);
      console.log('✅ HeatmapBackgroundLayer: SA2 boundaries source added');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ HeatmapBackgroundLayer: Error loading SA2 boundaries:', errorMessage);
      setBoundaryError(errorMessage);
    } finally {
      setBoundaryLoading(false);
    }
  }, [map, boundaryLoading, boundaryLoaded]);

  // Load SA2 boundaries when map becomes available
  useEffect(() => {
    console.log('🗺️ HeatmapBackgroundLayer: Map readiness check:', {
      mapExists: !!map,
      mapLoaded,
      dataReady,
      boundaryLoaded,
      boundaryLoading,
      mapStyleLoaded: map ? map.isStyleLoaded() : 'no map'
    });

    // CRITICAL FIX: Only start boundary loading when both map AND data conditions are right
    const shouldLoadBoundaries = map && mapLoaded && !boundaryLoaded && !boundaryLoading && 
                                (dataReady || sa2HeatmapVisibleRef.current);

    if (shouldLoadBoundaries) {
      console.log('🚀 HeatmapBackgroundLayer: Starting coordinated boundary loading sequence...');
      
      // Simplified, reliable loading strategy
      const loadBoundaries = () => {
        if (map.isStyleLoaded() && !boundaryLoaded && !boundaryLoading) {
          console.log('✅ HeatmapBackgroundLayer: Map style ready, loading boundaries now');
          loadSA2Boundaries();
        }
      };
      
      // Try immediate load if style is ready
      if (map.isStyleLoaded()) {
        console.log('✅ HeatmapBackgroundLayer: Map style already loaded, loading boundaries immediately');
        setTimeout(loadBoundaries, 50); // Short delay for stability
      } else {
        console.log('⏳ HeatmapBackgroundLayer: Waiting for map style to load...');
        
        // Single listener for style load event  
        const onStyleLoad = () => {
          console.log('🎨 HeatmapBackgroundLayer: Style loaded event received');
          setTimeout(loadBoundaries, 50); // Short delay after style load
        };
        
        map.once('styledata', onStyleLoad);
        
        // Cleanup function
        return () => {
          map.off('styledata', onStyleLoad);
        };
      }
    } else {
      console.log('⏸️ HeatmapBackgroundLayer: Conditions not met for boundary loading:', {
        mapExists: !!map,
        mapLoaded,
        dataReady,
        boundaryLoaded,
        boundaryLoading,
        heatmapVisible: sa2HeatmapVisibleRef.current
      });
    }
  }, [map, mapLoaded, dataReady, loadSA2Boundaries, boundaryLoaded, boundaryLoading]);

  // Update heatmap when data or visibility changes - with data readiness check
  const updateHeatmap = useCallback(() => {
    console.log('🔧 HeatmapBackgroundLayer: UpdateHeatmap called:', {
      mapExists: !!map,
      mapLoaded,
      dataReady,
      boundaryLoaded,
      visible: sa2HeatmapVisibleRef.current,
      hasData: !!sa2HeatmapDataRef.current,
      dataKeys: sa2HeatmapDataRef.current ? Object.keys(sa2HeatmapDataRef.current).length : 0,
      sampleData: sa2HeatmapDataRef.current ? Object.entries(sa2HeatmapDataRef.current).slice(0, 3) : []
    });

    // ENHANCED READINESS CHECK: Map + boundaries + data must all be ready
    if (!map || !mapLoaded || !boundaryLoaded) {
      console.log('❌ HeatmapBackgroundLayer: Map not ready or boundaries not loaded:', {
        mapExists: !!map,
        mapLoaded,
        boundaryLoaded
      });
      return;
    }

    // CRITICAL FIX: Only proceed if we have actual data to display AND data is confirmed ready
    if (!dataReady || !sa2HeatmapDataRef.current || Object.keys(sa2HeatmapDataRef.current).length === 0) {
      console.log('📊 HeatmapBackgroundLayer: Data not ready or no heatmap data available:', {
        dataReady,
        hasData: !!sa2HeatmapDataRef.current,
        dataKeys: sa2HeatmapDataRef.current ? Object.keys(sa2HeatmapDataRef.current).length : 0
      });
      onMinMaxCalculated?.(undefined, undefined);
      return;
    }

    const heatmapLayerId = 'sa2-heatmap-background';
    const sa2SourceId = 'sa2-heatmap-source';

    // Remove existing heatmap layer if it exists
    if (map.getLayer(heatmapLayerId)) {
      console.log('🗑️ HeatmapBackgroundLayer: Removing existing heatmap layer');
      map.removeLayer(heatmapLayerId);
    }

    // If heatmap should be visible and we have data
    if (sa2HeatmapVisibleRef.current && sa2HeatmapDataRef.current) {
      const data = sa2HeatmapDataRef.current;
      const dataEntries = Object.entries(data);
      
      if (dataEntries.length === 0) {
        console.log('📊 HeatmapBackgroundLayer: No heatmap data to display');
        onMinMaxCalculated?.(undefined, undefined);
        return;
      }

      // Find min and max values for normalization
      const values = dataEntries.map(([_, value]) => value);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const valueRange = maxValue - minValue;

      console.log(`🗺️ HeatmapBackgroundLayer: Rendering SA2 heatmap with ${dataEntries.length} data points`);
      console.log(`📊 HeatmapBackgroundLayer: Value range: ${minValue} - ${maxValue}`);

      // Pass min/max values to parent component for legend display
      onMinMaxCalculated?.(minValue, maxValue);

      // Create data-driven heatmap expression
      // Build case expression for each SA2 with data
      const caseExpression: any[] = ['case'];
      
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
      
      const fillExpression = caseExpression as any;

      console.log('🎨 HeatmapBackgroundLayer: Data-driven heatmap created with red (#EF4444)');
      console.log('📊 HeatmapBackgroundLayer: Opacity range: 0 - 0.8 for', dataEntries.length, 'SA2 regions');
      console.log('💡 HeatmapBackgroundLayer: Max value gets 0.8 opacity:', maxValue);

      // Debug: Check SA2 source data structure
      const source = map.getSource(sa2SourceId);
      if (source && source.type === 'geojson') {
        const sourceData = (source as any)._data;
        if (sourceData && sourceData.features && sourceData.features.length > 0) {
          const sampleFeature = sourceData.features[0];
          console.log('🔍 Sample SA2 feature properties:', Object.keys(sampleFeature.properties || {}));
          console.log('🔍 Sample feature SA2 code:', sampleFeature.properties?.sa2_code_2021);
        }
      }

      // Debug: Check some sample data keys
      const sampleDataKeys = Object.keys(data).slice(0, 5);
      console.log('🔍 Sample heatmap data keys:', sampleDataKeys);

      // DEBUGGING: Add heatmap layer at the TOP of the layer stack for visibility testing
      console.log('🔝 HeatmapBackgroundLayer: Adding heatmap layer at TOP for debugging');
      
      // Debug: Show current map layers
      const currentLayers = map.getStyle().layers;
      console.log('🗺️ Current map layers before adding heatmap:', currentLayers.map(l => l.id));
      
      // Add heatmap layer at the top (no beforeLayer specified = top of stack)
      map.addLayer({
        id: heatmapLayerId,
        type: 'fill',
        source: sa2SourceId,
        paint: {
          'fill-color': fillExpression,
          'fill-opacity': 0.7 // High opacity for visibility testing
        },
        layout: {
          'visibility': 'visible'
        }
      }); // No beforeLayer = adds to top of layer stack

      console.log('✅ HeatmapBackgroundLayer: Heatmap layer added at TOP of layer stack');
    } else if (!sa2HeatmapDataRef.current) {
      // Only clear min/max values when there's no data at all
      console.log('📊 HeatmapBackgroundLayer: No data available, clearing min/max values');
      onMinMaxCalculated?.(undefined, undefined);
    }
  }, [map, mapLoaded, dataReady, boundaryLoaded, onMinMaxCalculated]);

  // Update heatmap when data or visibility changes
  useEffect(() => {
    updateHeatmap();
  }, [sa2HeatmapData, sa2HeatmapVisible, dataReady, mapLoaded, updateHeatmap]);

  // Return status info
  return (
    <>
      {/* Error Overlay */}
      {boundaryError && (
        <div className="absolute top-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 z-20 max-w-xs">
          <h4 className="text-sm font-medium text-red-900">Heatmap Error</h4>
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

      {/* Loading Status - REMOVED to eliminate flickering */}
      {/* {boundaryLoading && (
        <div className="absolute top-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-3 z-20">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-700">Loading heatmap...</span>
          </div>
        </div>
      )} */}
    </>
  );
} 