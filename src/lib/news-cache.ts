/**
 * ✅ EXPERT PATTERN: Simplified news caching with graceful Redis degradation
 * Uses Redis when available, gracefully degrades when not configured
 */

import { Redis } from '@upstash/redis';
import { NewsItem, NewsServiceError, NewsSource } from '../types/news';

// ✅ EXPERT PATTERN: Redis client hardening with quote/whitespace normalization
function getRedisFromEnv() {
  const url = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/^"|"$/g, "").trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || "").replace(/^"|"$/g, "").trim();
  if (!url || !token) {
    console.log('ℹ️ Redis credentials missing - falling back to file cache and degraded performance');
    return null;
  }
  console.log(`✅ Redis client initialized for: ${new URL(url).host}`);
  return new Redis({ url, token });
}

// If creds are missing, caching is disabled but API still works
const redis = getRedisFromEnv();

// Default TTL aligned with Edge cache (60 minutes)
const DEFAULT_TTL_SECONDS = 60 * 60;

// ✅ EXPERT PATTERN: Simplified interface
export interface NewsCacheData {
  items: NewsItem[];
  lastUpdated: string;
  errors?: NewsServiceError[];
  sources?: NewsSource[];
}

export class NewsCacheService {
  /**
   * Generate cache key for news queries
   */
  static generateCacheKey(params: {
    source?: string;
    limit?: number;
    offset?: number;
  } = {}): string {
    const { source, limit = 20, offset = 0 } = params;
    const parts = ['news-cache:v2']; // v2 for new key format
    
    if (source) parts.push(`source:${source}`);
    if (limit !== 20) parts.push(`limit:${limit}`);
    if (offset !== 0) parts.push(`offset:${offset}`);
    
    return parts.join(':');
  }

  /**
   * ✅ EXPERT PATTERN: Get cached data with graceful degradation
   */
  static async getCache(key?: string): Promise<NewsCacheData | null> {
    if (!redis) return null;
    const cacheKey = key || 'news-cache:v1'; // backward compatibility
    try {
      const data = await redis.get<NewsCacheData>(cacheKey);
      return data ?? null;
    } catch {
      return null;
    }
  }

  /**
   * ✅ EXPERT PATTERN: Set cache data with graceful degradation
   */
  static async setCache(
    data: NewsCacheData, 
    ttlSeconds = DEFAULT_TTL_SECONDS,
    key?: string
  ): Promise<void> {
    if (!redis) return; // no-op when Redis is not configured
    const cacheKey = key || 'news-cache:v1'; // backward compatibility
    try {
      await redis.set(cacheKey, data, { ex: ttlSeconds });
      console.log(`✅ News data cached in Redis (${cacheKey}): ${data.items.length} items, TTL: ${ttlSeconds}s`);
    } catch (error) {
      console.warn('⚠️ Redis cache write failed:', error);
    }
  }

  /**
   * Generic cache getter with key
   */
  static async get<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    try {
      const data = await redis.get<T>(key);
      return data ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Generic cache setter with key
   */
  static async set<T>(key: string, value: T, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<boolean> {
    if (!redis) return false;
    try {
      await redis.set(key, value as any, { ex: ttlSeconds });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cache health status
   */
  static async getCacheHealth(): Promise<{
    redis: boolean;
    mainCache: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let redisHealthy = false;
    let mainCacheExists = false;

    if (!redis) {
      errors.push('Redis not configured (missing credentials)');
      return { redis: false, mainCache: false, errors };
    }

    try {
      // Test Redis connection
      await redis.ping();
      redisHealthy = true;

      // Check if main cache exists
      const mainCache = await redis.exists('news-cache:v1');
      mainCacheExists = mainCache === 1;

    } catch (error) {
      errors.push(`Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      redis: redisHealthy,
      mainCache: mainCacheExists,
      errors,
    };
  }
}

export default NewsCacheService; 