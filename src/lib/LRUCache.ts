interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated size in bytes
}

interface CacheConfig {
  maxItems: number;
  maxMemoryMB: number;
  ttlMs: number; // Time to live in milliseconds
  cleanupIntervalMs: number;
}

interface CacheStats {
  totalEntries: number;
  totalMemoryMB: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  oldestEntry: number;
  newestEntry: number;
  averageAccessCount: number;
  memoryUtilization: number; // Percentage
}

export class LRUCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = []; // Most recently used at the end
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    cleanups: 0
  };
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxItems: config.maxItems || 10,
      maxMemoryMB: config.maxMemoryMB || 512, // 512MB default limit
      ttlMs: config.ttlMs || 30 * 60 * 1000, // 30 minutes default TTL
      cleanupIntervalMs: config.cleanupIntervalMs || 5 * 60 * 1000 // 5 minutes cleanup interval
    };

    console.log('💾 LRUCache initialized with config:', this.config);
    this.startCleanupTimer();
  }

  // Estimate object size in bytes (approximation)
  private estimateSize(value: T): number {
    try {
      // For GeoJSON data, estimate based on string representation
      const jsonString = JSON.stringify(value);
      const sizeInBytes = new Blob([jsonString]).size;
      
      // Add overhead for object structure and cache metadata
      const overhead = 1024; // 1KB overhead per entry
      return sizeInBytes + overhead;
    } catch (error) {
      console.warn('⚠️ Could not estimate cache entry size, using default:', error);
      return 10 * 1024 * 1024; // 10MB default for unknown objects
    }
  }

  // Get current memory usage in MB
  private getCurrentMemoryMB(): number {
    let totalBytes = 0;
    this.cache.forEach(entry => {
      totalBytes += entry.size;
    });
    return totalBytes / (1024 * 1024);
  }

  // Update access order when an item is accessed
  private updateAccessOrder(key: string): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  // Remove least recently used items
  private evictLRU(): void {
    while (this.accessOrder.length > 0) {
      const lruKey = this.accessOrder[0];
      const entry = this.cache.get(lruKey);
      
      if (entry) {
        console.log(`🗑️ LRU evicting: ${lruKey} (${(entry.size / 1024 / 1024).toFixed(2)}MB, accessed ${entry.accessCount} times)`);
        this.cache.delete(lruKey);
        this.accessOrder.shift();
        this.stats.evictions++;
        
        // Check if we've freed enough space
        if (this.cache.size < this.config.maxItems && 
            this.getCurrentMemoryMB() < this.config.maxMemoryMB) {
          break;
        }
      } else {
        // Clean up orphaned access order entry
        this.accessOrder.shift();
      }
    }
  }

  // Remove expired entries
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.config.ttlMs) {
        expiredKeys.push(key);
      }
    });

    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaning up ${expiredKeys.length} expired cache entries`);
      
      expiredKeys.forEach(key => {
        const entry = this.cache.get(key);
        if (entry) {
          console.log(`🗑️ Expired: ${key} (age: ${Math.round((now - entry.timestamp) / 1000 / 60)}min)`);
        }
        this.cache.delete(key);
        
        // Remove from access order
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
          this.accessOrder.splice(index, 1);
        }
      });
      
      this.stats.cleanups++;
    }
  }

  // Start automatic cleanup timer
  private startCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      console.log('🔄 Running automatic cache cleanup...');
      this.cleanupExpired();
      
      // Also check memory limits and evict if needed
      if (this.getCurrentMemoryMB() > this.config.maxMemoryMB) {
        console.log(`💾 Memory limit exceeded (${this.getCurrentMemoryMB().toFixed(2)}MB / ${this.config.maxMemoryMB}MB), evicting LRU items`);
        this.evictLRU();
      }
      
    }, this.config.cleanupIntervalMs);
  }

  // Set a value in the cache
  set(key: string, value: T): void {
    const size = this.estimateSize(value);
    const sizeMB = size / 1024 / 1024;
    
    console.log(`💾 Caching: ${key} (${sizeMB.toFixed(2)}MB)`);

    // Check if single item exceeds memory limit
    if (sizeMB > this.config.maxMemoryMB) {
      console.warn(`⚠️ Item ${key} (${sizeMB.toFixed(2)}MB) exceeds memory limit (${this.config.maxMemoryMB}MB), not caching`);
      return;
    }

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }

    // Create new cache entry
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key);

    // Check if we need to evict items due to count or memory limits
    if (this.cache.size > this.config.maxItems || 
        this.getCurrentMemoryMB() > this.config.maxMemoryMB) {
      console.log(`📊 Cache limits exceeded: ${this.cache.size}/${this.config.maxItems} items, ${this.getCurrentMemoryMB().toFixed(2)}/${this.config.maxMemoryMB}MB`);
      this.evictLRU();
    }

    console.log(`✅ Cached ${key}. Total: ${this.cache.size} items, ${this.getCurrentMemoryMB().toFixed(2)}MB`);
  }

  // Get a value from the cache
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      console.log(`❌ Cache miss: ${key}`);
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.config.ttlMs) {
      console.log(`⏰ Cache entry expired: ${key} (age: ${Math.round((now - entry.timestamp) / 1000 / 60)}min)`);
      this.cache.delete(key);
      
      // Remove from access order
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      
      this.stats.misses++;
      return null;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = now;
    this.updateAccessOrder(key);
    
    this.stats.hits++;
    console.log(`✅ Cache hit: ${key} (accessed ${entry.accessCount} times)`);
    
    return entry.value;
  }

  // Check if a key exists in the cache (without updating access)
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.config.ttlMs) {
      return false;
    }

    return true;
  }

  // Remove a specific key from the cache
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      console.log(`🗑️ Manually deleted cache entry: ${key}`);
    }
    
    return deleted;
  }

  // Clear all cache entries
  clear(): void {
    const itemCount = this.cache.size;
    const memoryMB = this.getCurrentMemoryMB();
    
    this.cache.clear();
    this.accessOrder = [];
    
    console.log(`🧹 Cache cleared: ${itemCount} items, ${memoryMB.toFixed(2)}MB freed`);
  }

  // Get comprehensive cache statistics
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalAccesses = this.stats.hits + this.stats.misses;
    const hitRate = totalAccesses > 0 ? (this.stats.hits / totalAccesses) * 100 : 0;
    const missRate = totalAccesses > 0 ? (this.stats.misses / totalAccesses) * 100 : 0;

    const timestamps = entries.map(e => e.timestamp);
    const accessCounts = entries.map(e => e.accessCount);
    
    return {
      totalEntries: this.cache.size,
      totalMemoryMB: this.getCurrentMemoryMB(),
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round(missRate * 100) / 100,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
      averageAccessCount: accessCounts.length > 0 ? 
        Math.round((accessCounts.reduce((a, b) => a + b, 0) / accessCounts.length) * 100) / 100 : 0,
      memoryUtilization: Math.round((this.getCurrentMemoryMB() / this.config.maxMemoryMB) * 10000) / 100
    };
  }

  // Get detailed cache information for debugging
  getDebugInfo(): any {
    const stats = this.getStats();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      sizeMB: Math.round((entry.size / 1024 / 1024) * 100) / 100,
      accessCount: entry.accessCount,
      ageMinutes: Math.round((Date.now() - entry.timestamp) / 1000 / 60),
      lastAccessedMinutes: Math.round((Date.now() - entry.lastAccessed) / 1000 / 60)
    }));

    return {
      config: this.config,
      stats: {
        ...stats,
        evictions: this.stats.evictions,
        cleanups: this.stats.cleanups
      },
      entries: entries.sort((a, b) => b.accessCount - a.accessCount), // Most accessed first
      accessOrder: this.accessOrder
    };
  }

  // Update cache configuration
  updateConfig(newConfig: Partial<CacheConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };
    
    console.log('⚙️ Cache config updated:', { oldConfig, newConfig: this.config });

    // Restart cleanup timer if interval changed
    if (newConfig.cleanupIntervalMs && newConfig.cleanupIntervalMs !== oldConfig.cleanupIntervalMs) {
      this.startCleanupTimer();
    }

    // Check if new limits require immediate cleanup
    if (this.cache.size > this.config.maxItems || 
        this.getCurrentMemoryMB() > this.config.maxMemoryMB) {
      console.log('📊 New config requires immediate cleanup');
      this.evictLRU();
    }
  }

  // Destroy the cache and cleanup resources
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    const stats = this.getStats();
    console.log('💾 LRUCache destroying...', {
      finalStats: stats,
      itemsFreed: this.cache.size,
      memoryFreed: `${stats.totalMemoryMB.toFixed(2)}MB`
    });
    
    this.cache.clear();
    this.accessOrder = [];
  }
} 