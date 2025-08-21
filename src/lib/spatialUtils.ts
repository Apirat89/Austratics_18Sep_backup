/**
 * Point interface for spatial operations
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Geographic point with latitude and longitude
 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Check if a point is inside a polygon using the ray casting algorithm
 * @param point - The point to test
 * @param polygon - Array of polygon vertices
 * @returns true if point is inside polygon, false otherwise
 */
export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;
  
  let inside = false;
  let j = polygon.length - 1;
  
  for (let i = 0; i < polygon.length; i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    
    if (((yi > point.y) !== (yj > point.y)) && 
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
    
    j = i;
  }
  
  return inside;
}

/**
 * Convert screen coordinates to map coordinates
 * @param screenPoint - Screen coordinates relative to map container
 * @param map - MapTiler map instance
 * @returns Geographic coordinates
 */
export function screenToGeo(screenPoint: Point, map: any): GeoPoint {
  const lngLat = map.unproject([screenPoint.x, screenPoint.y]);
  return {
    lat: lngLat.lat,
    lng: lngLat.lng
  };
}

/**
 * Convert geographic coordinates to screen coordinates
 * @param geoPoint - Geographic coordinates
 * @param map - MapTiler map instance
 * @returns Screen coordinates
 */
export function geoToScreen(geoPoint: GeoPoint, map: any): Point {
  const screenPoint = map.project([geoPoint.lng, geoPoint.lat]);
  return {
    x: screenPoint.x,
    y: screenPoint.y
  };
}

/**
 * Convert a screen polygon to geographic polygon
 * @param screenPolygon - Polygon in screen coordinates
 * @param map - MapTiler map instance
 * @returns Polygon in geographic coordinates
 */
export function screenPolygonToGeo(screenPolygon: Point[], map: any): GeoPoint[] {
  return screenPolygon.map(point => screenToGeo(point, map));
}

/**
 * Check if a facility is within a geographic polygon
 * @param facility - Facility with Latitude and Longitude properties
 * @param geoPolygon - Polygon in geographic coordinates
 * @returns true if facility is within polygon, false otherwise
 */
export function isFacilityInGeoPolygon(
  facility: { Latitude: number; Longitude: number },
  geoPolygon: GeoPoint[]
): boolean {
  const facilityPoint: Point = {
    x: facility.Longitude,
    y: facility.Latitude
  };
  
  const polygon: Point[] = geoPolygon.map(p => ({
    x: p.lng,
    y: p.lat
  }));
  
  return isPointInPolygon(facilityPoint, polygon);
}

/**
 * Calculate the zoom level threshold for enabling magic wand (≤30km)
 * @param map - MapTiler map instance
 * @returns true if zoom level allows magic wand (≤30km), false otherwise
 */
export function isZoomLevelSuitableForMagicWand(map: any): boolean {
  const zoomLevel = map.getZoom();
  return zoomLevel >= 11; // Zoom level 11+ shows ≤30km distance
}

/**
 * Get the approximate distance shown in the map viewport
 * @param map - MapTiler map instance
 * @returns Approximate distance in kilometers
 */
export function getMapViewportDistance(map: any): number {
  const zoomLevel = map.getZoom();
  const metersPerPixel = 40075016.686 / (256 * Math.pow(2, zoomLevel));
  const viewportWidthPixels = map.getContainer().clientWidth;
  const viewportWidthMeters = metersPerPixel * viewportWidthPixels;
  return viewportWidthMeters / 1000; // Convert to kilometers
}

/**
 * Filter facilities by polygon selection
 * @param facilities - Array of facilities to filter
 * @param screenPolygon - Selection polygon in screen coordinates
 * @param map - MapTiler map instance
 * @returns Array of facilities within the polygon
 */
export function filterFacilitiesByPolygon<T extends { Latitude: number; Longitude: number }>(
  facilities: T[],
  screenPolygon: Point[],
  map: any
): T[] {
  if (screenPolygon.length < 3) return [];
  
  const geoPolygon = screenPolygonToGeo(screenPolygon, map);
  
  return facilities.filter(facility => 
    isFacilityInGeoPolygon(facility, geoPolygon)
  );
}

/**
 * Calculate the distance between two geographic points using the Haversine formula
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in kilometers
}

/**
 * Filter facilities within a radius of a center point
 * @param facilities - Array of facilities with latitude and longitude
 * @param centerLat - Center latitude
 * @param centerLng - Center longitude
 * @param radiusDegrees - Radius in degrees (0.18 degrees ≈ 20km)
 * @returns Array of facilities within the radius
 */
export function filterFacilitiesByRadius<T extends { latitude?: number; longitude?: number }>(
  facilities: T[],
  centerLat: number,
  centerLng: number,
  radiusDegrees: number = 0.18
): T[] {
  return facilities.filter(facility => {
    if (!facility.latitude || !facility.longitude) return false;
    
    const latDiff = Math.abs(facility.latitude - centerLat);
    const lngDiff = Math.abs(facility.longitude - centerLng);
    
    // Quick bounding box check for performance
    if (latDiff > radiusDegrees || lngDiff > radiusDegrees) return false;
    
    // More precise distance calculation for edge cases
    const distance = calculateDistance(centerLat, centerLng, facility.latitude, facility.longitude);
    const radiusKm = radiusDegrees * 111; // Rough conversion: 0.18 degrees ≈ 20km
    
    return distance <= radiusKm;
  });
}

/**
 * Sort facilities by distance from a center point
 * @param facilities - Array of facilities with latitude and longitude
 * @param centerLat - Center latitude
 * @param centerLng - Center longitude
 * @returns Array of facilities sorted by distance (closest first)
 */
export function sortFacilitiesByDistance<T extends { latitude?: number; longitude?: number }>(
  facilities: T[],
  centerLat: number,
  centerLng: number
): T[] {
  return facilities.sort((a, b) => {
    if (!a.latitude || !a.longitude) return 1;
    if (!b.latitude || !b.longitude) return -1;
    
    const distanceA = calculateDistance(centerLat, centerLng, a.latitude, a.longitude);
    const distanceB = calculateDistance(centerLat, centerLng, b.latitude, b.longitude);
    
    return distanceA - distanceB;
  });
}

/**
 * Add distance information to facilities based on center point
 * @param facilities - Array of facilities with latitude and longitude
 * @param centerLat - Center latitude
 * @param centerLng - Center longitude
 * @returns Array of facilities with distance information added
 */
export function addDistanceToFacilities<T extends { latitude?: number; longitude?: number }>(
  facilities: T[],
  centerLat: number,
  centerLng: number
): (T & { distance?: number; distanceFormatted?: string })[] {
  return facilities.map(facility => {
    if (!facility.latitude || !facility.longitude) {
      return facility as T & { distance?: number; distanceFormatted?: string };
    }
    
    const distance = calculateDistance(centerLat, centerLng, facility.latitude, facility.longitude);
    const distanceFormatted = distance < 1 
      ? `${Math.round(distance * 1000)}m`
      : `${distance.toFixed(1)}km`;
    
    return {
      ...facility,
      distance,
      distanceFormatted
    };
  });
} 