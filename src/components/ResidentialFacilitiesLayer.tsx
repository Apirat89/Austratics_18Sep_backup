'use client';

import React, { useEffect, useState } from 'react';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useResidentialFacilityStore } from '@/lib/ResidentialFacilityService';
import { ResidentialFacilityMarker } from './ResidentialFacilityMarker';
import type { ResidentialFacility } from '@/lib/ResidentialFacilityService';

interface ResidentialFacilitiesLayerProps {
  onSelectFacility: (facility: ResidentialFacility) => void;
}

export function ResidentialFacilitiesLayer({ onSelectFacility }: ResidentialFacilitiesLayerProps) {
  const { facilities, isLoading, error } = useResidentialFacilityStore();
  const [filteredFacilities, setFilteredFacilities] = useState<ResidentialFacility[]>([]);

  useEffect(() => {
    if (facilities) {
      // Apply any filters here if needed
      setFilteredFacilities(facilities);
    }
  }, [facilities]);

  if (isLoading) {
    return null; // Or a loading indicator
  }

  if (error) {
    console.error('Error loading residential facilities:', error);
    return null; // Or an error indicator
  }

  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={60}
      spiderfyOnMaxZoom={true}
      showCoverageOnHover={false}
      zoomToBoundsOnClick={true}
      removeOutsideVisibleBounds={true}
      animate={true}
      disableClusteringAtZoom={18}
      spiderLegPolylineOptions={{ weight: 1.5 }}
      polygonOptions={{
        fillColor: '#3388ff',
        color: '#3388ff',
        weight: 1,
        opacity: 0.7,
        fillOpacity: 0.2
      }}
    >
      {filteredFacilities.map((facility) => (
        <ResidentialFacilityMarker
          key={facility.provider_id}
          facility={facility}
          onSelect={onSelectFacility}
        />
      ))}
    </MarkerClusterGroup>
  );
} 