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