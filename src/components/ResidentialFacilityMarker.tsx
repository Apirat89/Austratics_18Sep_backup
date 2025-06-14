'use client';

import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { ResidentialFacility } from '@/lib/ResidentialFacilityService';

interface ResidentialFacilityMarkerProps {
  facility: ResidentialFacility;
  onSelect: (facility: ResidentialFacility) => void;
}

// Custom marker icon
const facilityIcon = new Icon({
  iconUrl: '/markers/residential.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export function ResidentialFacilityMarker({ facility, onSelect }: ResidentialFacilityMarkerProps) {
  const handleClick = () => {
    onSelect(facility);
  };

  return (
    <Marker
      position={[facility.latitude, facility.longitude]}
      icon={facilityIcon}
      eventHandlers={{
        click: handleClick,
      }}
    >
      <Popup>
        <div className="p-2 min-w-[200px] sm:min-w-[300px]">
          <h3 className="font-semibold text-base sm:text-lg mb-1">{facility.service_name}</h3>
          <p className="text-xs sm:text-sm text-gray-600 mb-2">{facility.formatted_address}</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs sm:text-sm font-medium">Rating:</span>
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-3 h-3 sm:w-4 sm:h-4 ${
                    i < facility.overall_rating_stars
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
            <div>
              <span className="font-medium">Rooms:</span>
              <span className="ml-1">{facility.rooms_data.total_rooms}</span>
            </div>
            <div>
              <span className="font-medium">Available:</span>
              <span className="ml-1">{facility.rooms_data.available_rooms}</span>
            </div>
          </div>
          <button
            onClick={handleClick}
            className="mt-2 w-full bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600 transition-colors text-xs sm:text-sm"
          >
            View Details
          </button>
        </div>
      </Popup>
    </Marker>
  );
} 