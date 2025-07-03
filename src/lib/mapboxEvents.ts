import type { Map as MapLibreMap } from 'maplibre-gl';

/**
 * Mapbox Event Utilities - Deterministic event-driven operations
 * 
 * These utilities replace arbitrary timeouts with actual Mapbox events
 * to ensure reliable layer recreation after style changes.
 */

/**
 * Wait for both style loading AND map idle state
 * 
 * This is crucial because:
 * - styledata: fired when new style is parsed but layers may not be ready
 * - idle: fired when map has finished rendering and is truly ready
 * 
 * Using both ensures the map is fully stable before adding layers.
 */
export function waitForStyleAndIdle(map: MapLibreMap): Promise<void> {
  return new Promise((resolve) => {
    // If map is already loaded and idle, resolve immediately
    if (map.isStyleLoaded() && !map.isMoving()) {
      console.log('✅ MapboxEvents: Map already ready, proceeding immediately');
      resolve();
      return;
    }
    
    console.log('⏳ MapboxEvents: Waiting for style and idle...');
    
    let styleLoaded = false;
    let isIdle = false;
    
    const checkCompletion = () => {
      if (styleLoaded && isIdle) {
        console.log('✅ MapboxEvents: Style and idle complete');
        resolve();
      }
    };
    
    // Listen for style data event
    const onStyleData = () => {
      console.log('🎨 MapboxEvents: Style data loaded');
      styleLoaded = true;
      map.off('styledata', onStyleData);
      checkCompletion();
    };
    
    // Listen for idle event
    const onIdle = () => {
      console.log('💤 MapboxEvents: Map idle');
      isIdle = true;
      map.off('idle', onIdle);
      checkCompletion();
    };
    
    // Set up listeners
    map.on('styledata', onStyleData);
    map.on('idle', onIdle);
    
    // If style is already loaded, mark it as such
    if (map.isStyleLoaded()) {
      console.log('🎨 MapboxEvents: Style already loaded');
      styleLoaded = true;
      checkCompletion();
    }
    
    // If map is already idle, mark it as such
    if (!map.isMoving()) {
      console.log('💤 MapboxEvents: Map already idle');
      isIdle = true;
      checkCompletion();
    }
    
    // Safety timeout (10 seconds)
    setTimeout(() => {
      if (!styleLoaded || !isIdle) {
        console.warn('⚠️ MapboxEvents: Timeout waiting for style/idle, proceeding anyway');
        map.off('styledata', onStyleData);
        map.off('idle', onIdle);
        resolve();
      }
    }, 10000);
  });
}

/**
 * Wait for map to be completely ready for layer operations
 * 
 * This ensures the map is loaded, style is ready, and not currently moving/zooming
 */
export function waitForMapReady(map: MapLibreMap): Promise<void> {
  return new Promise((resolve) => {
    const checkReady = () => {
      if (map.isStyleLoaded() && !map.isMoving() && map.loaded()) {
        console.log('✅ MapboxEvents: Map completely ready');
        resolve();
        return true;
      }
      return false;
    };
    
    // Check immediately
    if (checkReady()) return;
    
    console.log('⏳ MapboxEvents: Waiting for map to be ready...');
    
    const onReady = () => {
      if (checkReady()) {
        map.off('idle', onReady);
        map.off('styledata', onReady);
        map.off('load', onReady);
      }
    };
    
    // Listen for various ready events
    map.on('idle', onReady);
    map.on('styledata', onReady);
    map.on('load', onReady);
    
    // Safety timeout
    setTimeout(() => {
      console.warn('⚠️ MapboxEvents: Timeout waiting for map ready, proceeding anyway');
      map.off('idle', onReady);
      map.off('styledata', onReady);
      map.off('load', onReady);
      resolve();
    }, 15000);
  });
}

/**
 * Safely execute a map operation with proper event coordination
 * 
 * This wrapper ensures the map is ready and handles errors gracefully
 */
export async function safeMapOperation<T>(
  map: MapLibreMap,
  operation: () => Promise<T> | T,
  operationName: string = 'operation'
): Promise<T | null> {
  try {
    console.log(`🔄 MapboxEvents: Starting ${operationName}`);
    await waitForMapReady(map);
    
    const result = await operation();
    console.log(`✅ MapboxEvents: Completed ${operationName}`);
    return result;
  } catch (error) {
    console.error(`❌ MapboxEvents: Failed ${operationName}:`, error);
    return null;
  }
} 