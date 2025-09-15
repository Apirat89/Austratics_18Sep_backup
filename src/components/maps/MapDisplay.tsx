'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { downloadJson, getPublicUrl, getSignedUrl } from '@/lib/supabaseStorage';

interface MapDisplayProps {
  center?: [number, number]; // [longitude, latitude]
  zoom?: number;
  style?: string; // MapTiler style
  layers?: string[]; // GeoJSON files to load as layers
}

export default function MapDisplay({ 
  center = [133.7751, -25.2744], // Default to Australia center
  zoom = 4,
  style = 'streets',
  layers = []
}: MapDisplayProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [layersLoaded, setLayersLoaded] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    
    // MapTiler key must be available as NEXT_PUBLIC_MAPTILER_KEY
    const mapTilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;
    if (!mapTilerKey) {
      setError('MapTiler API key is missing. Add NEXT_PUBLIC_MAPTILER_KEY to your environment variables.');
      return;
    }
    
    try {
      // Create map instance
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: `https://api.maptiler.com/maps/${style}/style.json?key=${mapTilerKey}`,
        center: center,
        zoom: zoom
      });
      
      // Add navigation controls
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      
      // Set up load event handler
      map.current.on('load', () => {
        console.log('Map loaded successfully');
        setMapLoaded(true);
      });
      
      // Handle errors
      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setError(`Map error: ${e.error?.message || 'Unknown error'}`);
      });
    } catch (err) {
      console.error('Error initializing map:', err);
      setError(`Failed to initialize map: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [center, zoom, style]);
  
  // Load layers once the map is ready
  useEffect(() => {
    const loadLayers = async () => {
      if (!map.current || !mapLoaded || layers.length === 0) return;
      
      for (const layer of layers) {
        if (layersLoaded.includes(layer)) continue;
        
        try {
          // Try to load GeoJSON from Supabase storage
          console.log(`Loading layer: ${layer}`);
          
          // Try different possible locations
          const possiblePaths = [
            layer,
            `maps/${layer}`,
            `public-maps/${layer}`,
            layer.replace('.geojson', '').replace('.json', '') + '.geojson',
          ];
          
          let layerData;
          let sourceName = layer.split('/').pop()?.split('.')[0] || layer;
          
          // Method 1: Try direct download from Supabase
          try {
            layerData = await downloadJson('json_data', possiblePaths[0]);
            console.log(`Loaded ${layer} directly`);
          } catch (e) {
            // Method 2: Try finding at various paths
            for (let i = 1; i < possiblePaths.length; i++) {
              try {
                layerData = await downloadJson('json_data', possiblePaths[i]);
                console.log(`Loaded ${layer} from alternative path: ${possiblePaths[i]}`);
                break;
              } catch (err) {
                console.log(`Not found at ${possiblePaths[i]}`);
              }
            }
            
            // If still not found, try signed URL approach
            if (!layerData) {
              const signedUrl = await getSignedUrl('json_data', possiblePaths[0], 3600);
              
              // Use fetch with the signed URL
              const response = await fetch(signedUrl);
              if (response.ok) {
                layerData = await response.json();
                console.log(`Loaded ${layer} via signed URL`);
              } else {
                throw new Error(`Failed to fetch ${layer} via signed URL`);
              }
            }
          }
          
          // If we have data, add as source and layer
          if (layerData) {
            // Add source
            if (!map.current.getSource(sourceName)) {
              map.current.addSource(sourceName, {
                type: 'geojson',
                data: layerData
              });
              
              // Determine layer type based on geometry
              const firstFeature = layerData.features?.[0];
              const geometryType = firstFeature?.geometry?.type;
              
              if (geometryType) {
                // Add appropriate layer based on geometry type
                if (geometryType.includes('Point')) {
                  try {
                    // Try to load marker icon
                    const markerUrl = getPublicUrl('images', 'markers/residential.svg');
                    
                    // Load marker image with correct typing
                    map.current.loadImage(markerUrl, (err: Error | undefined, image: ImageBitmap | undefined) => {
                      if (err || !image) {
                        console.error('Error loading marker image:', err);
                        // Fallback to circle layer
                        if (map.current && !map.current.getLayer(`${sourceName}-layer`)) {
                          map.current.addLayer({
                            id: `${sourceName}-layer`,
                            type: 'circle',
                            source: sourceName,
                            paint: {
                              'circle-radius': 6,
                              'circle-color': '#3887be',
                              'circle-stroke-width': 2,
                              'circle-stroke-color': '#ffffff'
                            }
                          });
                        }
                        return;
                      }
                      
                      // Add image to map
                      if (map.current && !map.current.hasImage(`${sourceName}-marker`)) {
                        map.current.addImage(`${sourceName}-marker`, image);
                        
                        // Add symbol layer using the loaded image
                        map.current.addLayer({
                          id: `${sourceName}-layer`,
                          type: 'symbol',
                          source: sourceName,
                          layout: {
                            'icon-image': `${sourceName}-marker`,
                            'icon-size': 0.5,
                            'icon-allow-overlap': true
                          }
                        });
                      }
                    });
                  } catch (imgErr) {
                    console.error('Error with marker image:', imgErr);
                    // Fallback to circle layer
                    if (map.current && !map.current.getLayer(`${sourceName}-layer`)) {
                      map.current.addLayer({
                        id: `${sourceName}-layer`,
                        type: 'circle',
                        source: sourceName,
                        paint: {
                          'circle-radius': 6,
                          'circle-color': '#3887be',
                          'circle-stroke-width': 2,
                          'circle-stroke-color': '#ffffff'
                        }
                      });
                    }
                  }
                } else if (geometryType.includes('LineString')) {
                  map.current.addLayer({
                    id: `${sourceName}-layer`,
                    type: 'line',
                    source: sourceName,
                    paint: {
                      'line-color': '#3887be',
                      'line-width': 2
                    }
                  });
                } else if (geometryType.includes('Polygon')) {
                  map.current.addLayer({
                    id: `${sourceName}-layer`,
                    type: 'fill',
                    source: sourceName,
                    paint: {
                      'fill-color': '#3887be',
                      'fill-opacity': 0.2,
                      'fill-outline-color': '#000'
                    }
                  });
                }
              }
            }
            
            // Mark as loaded
            setLayersLoaded(prev => [...prev, layer]);
          }
        } catch (err) {
          console.error(`Error loading layer ${layer}:`, err);
        }
      }
    };
    
    loadLayers();
  }, [mapLoaded, layers, layersLoaded]);

  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainer} 
        className="map-container w-full h-full min-h-[400px]" 
        style={{ width: '100%', height: '100%', minHeight: '400px' }}
      />
      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-50 border border-red-500 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
} 