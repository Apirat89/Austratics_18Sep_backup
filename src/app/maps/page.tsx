'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Import the MapDisplay component dynamically with SSR disabled
// This is crucial to avoid "window is not defined" errors
const MapDisplay = dynamic(
  () => import('@/components/maps/MapDisplay'),
  { ssr: false }
);

export default function MapsPage() {
  // List of GeoJSON layers to load from Supabase
  // These should match filenames in your json_data bucket
  const mapLayers = [
    'SA3.geojson',
    'SA4.geojson', 
    'LGA.geojson',
    'healthcare.geojson',
    'POA.geojson'
  ];

        return (
    <main className="flex flex-col min-h-screen">
      <div className="flex-grow p-4">
        <h1 className="text-2xl font-bold mb-4">Maps</h1>
        <p className="mb-4">Interactive map of healthcare facilities and regions in Australia.</p>
        
        {/* Map container with fixed height */}
        <div className="h-[70vh] w-full border rounded-lg overflow-hidden">
          <MapDisplay 
            style="streets" 
            layers={mapLayers} 
            center={[133.7751, -25.2744]} 
            zoom={4}
          />
                        </div>

        {/* Map legend or additional controls could go here */}
        <div className="mt-4 text-sm text-gray-600">
          <p>Data sources: Australian Bureau of Statistics, Department of Health</p>
                          </div>
          </div>
        </main>
  );
} 