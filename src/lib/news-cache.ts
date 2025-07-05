/**
 * Redis-based caching service for news data
 * Integrates with existing Upstash Redis configuration
 */

import { Redis } from '@upstash/redis';
import { NewsItem, NewsServiceError, NewsSource } from '../types/news';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface NewsCacheData {
  items: NewsItem[];
  errors: NewsServiceError[];
  lastUpdated: string;
  sources: NewsSource[];
  fetchDuration?: number;
}

export interface NewsCacheStats {
  cached: boolean;
  lastUpdated: string | null;
  expiresAt: string | null;
  itemCount: number;
  errorCount: number;
  sourceCount: number;
  isExpired: boolean;
  ttl: number; // Time to live in seconds
}

export class NewsCacheService {
  private static CACHE_KEY = 'news:aggregated';
  private static METADATA_KEY = 'news:metadata';
  private static DEFAULT_TTL = 30 * 60; // 30 minutes in seconds
  
  /**
   * Store news data in Redis cache
   * Gracefully handles Redis connection failures
   */
  static async setCache(data: NewsCacheData, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const cachePayload = {
        ...data,
        cachedAt: new Date().toISOString(),
      };
      
      // Store main news data
      await redis.set(this.CACHE_KEY, JSON.stringify(cachePayload), { ex: ttl });
      
      // Store metadata for quick access
      const metadata = {
        lastUpdated: data.lastUpdated,
        itemCount: data.items.length,
        errorCount: data.errors.length,
        sourceCount: data.sources.length,
        cachedAt: cachePayload.cachedAt,
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
        ttl,
      };
      await redis.set(this.METADATA_KEY, JSON.stringify(metadata), { ex: ttl });
      
      console.log(`✅ News data cached in Redis: ${data.items.length} items for ${ttl}s`);
    } catch (error) {
      console.error('⚠️ Failed to cache news data in Redis (continuing without cache):', error);
      // Don't throw error - allow the service to continue without caching
    }
  }
  
  /**
   * Retrieve news data from Redis cache
   */
  static async getCache(): Promise<NewsCacheData | null> {
    try {
      const cachedData = await redis.get(this.CACHE_KEY);
      
      if (!cachedData) {
        console.log('🔍 No cached news data found in Redis');
        return null;
      }
      
      const parsedData = JSON.parse(cachedData as string) as NewsCacheData & { cachedAt: string };
      console.log(`✅ Retrieved cached news data: ${parsedData.items.length} items`);
      
      return {
        items: parsedData.items,
        errors: parsedData.errors,
        lastUpdated: parsedData.lastUpdated,
        sources: parsedData.sources,
        fetchDuration: parsedData.fetchDuration,
      };
    } catch (error) {
      console.error('❌ Failed to retrieve news data from Redis:', error);
      return null;
    }
  }
  
  /**
   * Get cache statistics and status
   */
  static async getCacheStats(): Promise<NewsCacheStats> {
    try {
      const metadata = await redis.get(this.METADATA_KEY);
      
      if (!metadata) {
        return {
          cached: false,
          lastUpdated: null,
          expiresAt: null,
          itemCount: 0,
          errorCount: 0,
          sourceCount: 0,
          isExpired: true,
          ttl: 0,
        };
      }
      
      const parsedMetadata = JSON.parse(metadata as string);
      const now = Date.now();
      const expiresAt = new Date(parsedMetadata.expiresAt).getTime();
      const isExpired = now > expiresAt;
      
      // Get remaining TTL from Redis
      const ttl = await redis.ttl(this.CACHE_KEY);
      
      return {
        cached: true,
        lastUpdated: parsedMetadata.lastUpdated,
        expiresAt: parsedMetadata.expiresAt,
        itemCount: parsedMetadata.itemCount,
        errorCount: parsedMetadata.errorCount,
        sourceCount: parsedMetadata.sourceCount,
        isExpired,
        ttl: ttl || 0,
      };
    } catch (error) {
      console.error('❌ Failed to get cache stats from Redis:', error);
      return {
        cached: false,
        lastUpdated: null,
        expiresAt: null,
        itemCount: 0,
        errorCount: 0,
        sourceCount: 0,
        isExpired: true,
        ttl: 0,
      };
    }
  }
  
  /**
   * Clear news cache from Redis
   * Gracefully handles Redis connection failures
   */
  static async clearCache(): Promise<void> {
    try {
      await Promise.all([
        redis.del(this.CACHE_KEY),
        redis.del(this.METADATA_KEY),
      ]);
      console.log('🗑️ News cache cleared from Redis');
    } catch (error) {
      console.error('⚠️ Failed to clear news cache from Redis (continuing without cache):', error);
      // Don't throw error - cache clearing is not critical for application functionality
    }
  }
  
  /**
   * Check if cache exists and is valid
   */
  static async isCacheValid(): Promise<boolean> {
    try {
      const stats = await this.getCacheStats();
      return stats.cached && !stats.isExpired;
    } catch (error) {
      console.error('❌ Failed to check cache validity:', error);
      return false;
    }
  }
  
  /**
   * Extend cache TTL (useful for frequently accessed data)
   */
  static async extendCacheTTL(additionalSeconds: number = 300): Promise<void> {
    try {
      const currentTTL = await redis.ttl(this.CACHE_KEY);
      if (currentTTL > 0) {
        const newTTL = currentTTL + additionalSeconds;
        await Promise.all([
          redis.expire(this.CACHE_KEY, newTTL),
          redis.expire(this.METADATA_KEY, newTTL),
        ]);
        console.log(`⏰ Extended news cache TTL by ${additionalSeconds}s (new TTL: ${newTTL}s)`);
      }
    } catch (error) {
      console.error('❌ Failed to extend cache TTL:', error);
    }
  }
  
  /**
   * Cache specific source data separately (for filtered requests)
   */
  static async setCacheBySource(sourceId: string, data: NewsItem[], ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const cacheKey = `news:source:${sourceId}`;
      const cachePayload = {
        sourceId,
        items: data,
        cachedAt: new Date().toISOString(),
      };
      
      await redis.set(cacheKey, JSON.stringify(cachePayload), { ex: ttl });
      console.log(`✅ Source-specific cache set for ${sourceId}: ${data.length} items`);
    } catch (error) {
      console.error(`❌ Failed to cache data for source ${sourceId}:`, error);
    }
  }
  
  /**
   * Get cached data for specific source
   */
  static async getCacheBySource(sourceId: string): Promise<NewsItem[] | null> {
    try {
      const cacheKey = `news:source:${sourceId}`;
      const cachedData = await redis.get(cacheKey);
      
      if (!cachedData) {
        return null;
      }
      
      const parsedData = JSON.parse(cachedData as string);
      console.log(`✅ Retrieved cached data for source ${sourceId}: ${parsedData.items.length} items`);
      
      return parsedData.items;
    } catch (error) {
      console.error(`❌ Failed to retrieve cached data for source ${sourceId}:`, error);
      return null;
    }
  }
  
  /**
   * Get cache health information
   */
  static async getCacheHealth(): Promise<{
    redis: boolean;
    mainCache: boolean;
    metadata: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let redisHealthy = false;
    let mainCacheExists = false;
    let metadataExists = false;
    
    try {
      // Test Redis connection
      await redis.ping();
      redisHealthy = true;
      
      // Check if main cache exists
      const mainCache = await redis.exists(this.CACHE_KEY);
      mainCacheExists = mainCache === 1;
      
      // Check if metadata exists
      const metadata = await redis.exists(this.METADATA_KEY);
      metadataExists = metadata === 1;
      
    } catch (error) {
      errors.push(`Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      redis: redisHealthy,
      mainCache: mainCacheExists,
      metadata: metadataExists,
      errors,
    };
  }
}

export default NewsCacheService; 