'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { config, Map as MapLibreMap } from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

// Configure MapTiler API key
config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || 'YOUR_MAPTILER_API_KEY';

interface SA2HeatmapData {
  [sa2Id: string]: number;
}

interface SimpleHeatmapMapProps {
  sa2HeatmapData?: SA2HeatmapData | null;
  sa2HeatmapVisible?: boolean;
  className?: string;
}

export default function SimpleHeatmapMap({ 
  sa2HeatmapData,
  sa2HeatmapVisible,
  className = ''
}: SimpleHeatmapMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    console.log('🗺️ SimpleHeatmapMap: Initializing map...');

    try {
      map.current = new MapLibreMap({
        container: mapContainer.current,
        style: 'https://api.maptiler.com/maps/basic-v2/style.json',
        center: [134.755, -26.344], // Center of Australia
        zoom: 4.5,
        minZoom: 3,
        maxZoom: 18
      });

      map.current.on('load', () => {
        console.log('✅ SimpleHeatmapMap: Map loaded successfully');
        setMapLoaded(true);
        loadSA2Boundaries();
      });

      map.current.on('error', (e) => {
        console.error('❌ SimpleHeatmapMap: Map error:', e);
      });

    } catch (error) {
      console.error('❌ SimpleHeatmapMap: Error initializing map:', error);
    }

    // Cleanup function
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Load SA2 boundaries
  const loadSA2Boundaries = useCallback(async () => {
    if (!map.current || boundaryLoading || boundaryLoaded) return;

    console.log('📥 Loading SA2 boundaries...');
    setBoundaryLoading(true);
    setBoundaryError(null);

    try {
      // Check cache first
      let geojsonData = boundaryDataCache.current.get('sa2');
      
      if (geojsonData) {
        console.log('📦 Using cached SA2 boundary data');
      } else {
        console.log('📡 Fetching SA2.geojson (170MB file)...');
        const startTime = Date.now();
        
        const response = await fetch('/maps/SA2.geojson');
        if (!response.ok) {
          throw new Error(`Failed to load SA2 boundaries: ${response.status} ${response.statusText}`);
        }
        
        geojsonData = await response.json();
        boundaryDataCache.current.set('sa2', geojsonData);
        
        const loadTime = (Date.now() - startTime) / 1000;
        console.log(`✅ SA2 boundaries loaded in ${loadTime.toFixed(1)}s`);
        console.log(`📊 Features: ${geojsonData.features?.length || 0}`);
      }

      const sourceId = 'sa2-source';
      const layerId = 'sa2-layer';
      const highlightLayerId = 'sa2-highlight';

      // Add source
      if (!map.current!.getSource(sourceId)) {
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData
        });
      }

      // Add SA2 boundary layer (outline only)
      if (!map.current!.getLayer(layerId)) {
        map.current!.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#666666',
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              1.5, // Wider line on hover
              0.5  // Normal line width
            ],
            'line-opacity': 0.8
          }
        });
      }

      // Add highlight layer for mouse interactions
      if (!map.current!.getLayer(highlightLayerId)) {
        map.current!.addLayer({
          id: highlightLayerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#2563eb',
            'line-width': 2,
            'line-opacity': 1
          },
          filter: ['==', 'sa2_code_2021', '']
        });
      }

      // Add click handler for SA2 regions
      map.current!.on('click', layerId, async (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const properties = feature.properties;
          
          console.log('🖱️ Clicked SA2 region:', {
            sa2_code: properties?.sa2_code_2021,
            sa2_name: properties?.sa2_name_2021,
            properties: properties
          });

          // Show popup with region info
          if (properties?.sa2_name_2021) {
            const { Popup } = await import('@maptiler/sdk');
            const popup = new Popup()
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="font-semibold">${properties.sa2_name_2021}</div>
                <div class="text-sm text-gray-600">SA2 Code: ${properties.sa2_code_2021}</div>
                ${sa2HeatmapDataRef.current?.[properties.sa2_code_2021] 
                  ? `<div class="text-sm mt-1">Value: ${sa2HeatmapDataRef.current[properties.sa2_code_2021].toLocaleString()}</div>`
                  : '<div class="text-sm text-gray-500 mt-1">No data available</div>'
                }
              `)
              .addTo(map.current!);
          }
        }
      });

      // Add stable hover effects with debouncing to prevent flickering
      let currentHighlightedSA2: string | null = null;
      let hoverTimeout: NodeJS.Timeout | null = null;

      map.current!.on('mouseenter', layerId, (e) => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
          
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            const sa2Code = feature.properties?.sa2_code_2021;
            
            if (sa2Code && sa2Code !== currentHighlightedSA2) {
              // Clear any pending timeout
              if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
              }
              
              // Debounce the highlight update
              hoverTimeout = setTimeout(() => {
                if (map.current) {
                  // Clear previous highlight
                  if (currentHighlightedSA2) {
                    map.current.setFilter(highlightLayerId, ['==', 'sa2_code_2021', '']);
                  }
                  
                  // Set new highlight
                  currentHighlightedSA2 = sa2Code;
                  map.current.setFilter(highlightLayerId, ['==', 'sa2_code_2021', sa2Code]);
                }
              }, 50); // 50ms debounce delay
            }
          }
        }
      });

      map.current!.on('mouseleave', layerId, () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
          
          // Clear any pending timeout
          if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
          }
          
          // Clear highlight with debounce
          setTimeout(() => {
            if (map.current && currentHighlightedSA2) {
              map.current.setFilter(highlightLayerId, ['==', 'sa2_code_2021', '']);
              currentHighlightedSA2 = null;
            }
          }, 50); // 50ms debounce delay
        }
      });

      setBoundaryLoaded(true);
      console.log('✅ SA2 boundaries added to map');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error loading SA2 boundaries:', errorMessage);
      setBoundaryError(errorMessage);
    } finally {
      setBoundaryLoading(false);
    }
  }, [boundaryLoading, boundaryLoaded]);

  // Update heatmap when data or visibility changes
  const updateHeatmap = useCallback(() => {
    console.log('🔧 UpdateHeatmap called:', {
      mapExists: !!map.current,
      boundaryLoaded,
      visible: sa2HeatmapVisibleRef.current,
      hasData: !!sa2HeatmapDataRef.current,
      dataKeys: sa2HeatmapDataRef.current ? Object.keys(sa2HeatmapDataRef.current).length : 0
    });

    if (!map.current || !boundaryLoaded) {
      console.log('❌ UpdateHeatmap: Map not ready or boundaries not loaded');
      return;
    }

    const heatmapLayerId = 'sa2-heatmap';
    const sa2SourceId = 'sa2-source';

    // Remove existing heatmap layer if it exists
    if (map.current.getLayer(heatmapLayerId)) {
      console.log('🗑️ Removing existing heatmap layer');
      map.current.removeLayer(heatmapLayerId);
    }

    // If heatmap should be visible and we have data
    if (sa2HeatmapVisibleRef.current && sa2HeatmapDataRef.current) {
      const data = sa2HeatmapDataRef.current;
      const dataEntries = Object.entries(data);
      
      if (dataEntries.length === 0) {
        console.log('📊 No heatmap data to display');
        return;
      }

      // Find min and max values for normalization
      const values = dataEntries.map(([_, value]) => value);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      const valueRange = maxValue - minValue;

      console.log(`🗺️ Rendering SA2 heatmap with ${dataEntries.length} data points`);
      console.log(`📊 Value range: ${minValue} - ${maxValue}`);

      // Create expression for fill color
      // Neon blue: #00BFFF with varying opacity (max 80%)
      const fillExpression: any = [
        'case',
        ['has', ['get', 'sa2_code_2021'], ['literal', data]],
        [
          'rgba',
          0, 191, 255, // Neon blue RGB values (#00BFFF)
          [
            '*',
            0.8, // Max opacity of 0.8 (80%) - increased for visibility
            [
              '/',
              [
                '-',
                ['get', ['get', 'sa2_code_2021'], ['literal', data]],
                minValue
              ],
              valueRange || 1 // Avoid division by zero
            ]
          ]
        ],
        'rgba(0, 0, 0, 0)' // Transparent for areas without data
      ];

      console.log('🎨 Heatmap expression created with sample data:');
      console.log('- SA2 105021098 value:', data['105021098'] || 'not found');
      console.log('- Value range:', minValue, '-', maxValue);
      console.log('- Sample opacity for max value:', 0.8);

      // Add heatmap layer below the SA2 outline
      map.current.addLayer({
        id: heatmapLayerId,
        type: 'fill',
        source: sa2SourceId,
        paint: {
          'fill-color': fillExpression,
          'fill-opacity': 1 // Opacity is controlled in the color expression
        },
        layout: {
          'visibility': 'visible'
        }
      }, 'sa2-layer'); // Insert before the SA2 outline layer

      console.log('✅ Heatmap layer added');
    }
  }, [boundaryLoaded]);

  // Update heatmap when data or visibility changes
  useEffect(() => {
    updateHeatmap();
  }, [sa2HeatmapData, sa2HeatmapVisible, updateHeatmap]);

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Loading Overlay */}
      {(!mapLoaded || boundaryLoading) && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-600">
              {!mapLoaded ? 'Loading map...' : 'Loading SA2 boundaries...'}
            </p>
            {boundaryLoading && (
              <p className="text-sm text-gray-500 mt-1">
                This may take a moment (170MB file)
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {boundaryError && (
        <div className="absolute top-4 left-4 right-4 bg-red-50 border border-red-200 rounded-lg p-3 z-20">
          <h4 className="text-sm font-medium text-red-900">Error Loading Boundaries</h4>
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
            Try Again
          </button>
        </div>
      )}

      {/* Status Info */}
      {mapLoaded && boundaryLoaded && (
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg px-3 py-2 text-sm text-gray-600 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>SA2 boundaries loaded</span>
            {sa2HeatmapVisible && sa2HeatmapData && (
              <>
                <span>•</span>
                <span>{Object.keys(sa2HeatmapData).length} regions with data</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 