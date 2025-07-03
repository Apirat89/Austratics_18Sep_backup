import React from 'react';

/**
 * Map Busy Semaphore - Prevents overlapping map operations
 * 
 * This utility ensures that only one heavy map operation runs at a time,
 * preventing race conditions between facility loading, style changes, 
 * heatmap rendering, and boundary updates.
 */

export const mapBusy = {
  counter: 0,
  
  /**
   * Acquire the semaphore before starting a map operation
   */
  acquire(): void {
    this.counter += 1;
    console.log(`🔒 MapBusy: Acquired (count: ${this.counter})`);
  },
  
  /**
   * Release the semaphore after completing a map operation
   */
  release(): void {
    this.counter = Math.max(0, this.counter - 1);
    console.log(`🔓 MapBusy: Released (count: ${this.counter})`);
  },
  
  /**
   * Check if any map operations are currently in progress
   */
  get isBusy(): boolean {
    return this.counter > 0;
  },
  
  /**
   * Force reset the semaphore (emergency use only)
   */
  reset(): void {
    console.warn('⚠️ MapBusy: Force reset!');
    this.counter = 0;
  }
};

/**
 * React hook to get current busy state with automatic re-renders
 */
export function useMapBusy() {
  const [busyCount, setBusyCount] = React.useState(mapBusy.counter);
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (busyCount !== mapBusy.counter) {
        setBusyCount(mapBusy.counter);
      }
    }, 50); // Check every 50ms for changes
    
    return () => clearInterval(interval);
  }, [busyCount]);
  
  return {
    isBusy: mapBusy.isBusy,
    count: busyCount,
    acquire: mapBusy.acquire.bind(mapBusy),
    release: mapBusy.release.bind(mapBusy)
  };
} 