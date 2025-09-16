/**
 * ✅ EXPERT PATTERN: Simplified news caching with graceful Redis degradation
 * Uses Redis when available, gracefully degrades when not configured
 */

import { Redis } from '@upstash/redis';
import { NewsItem, NewsServiceError, NewsSource } from '../types/news';

// ✅ EXPERT PATTERN: Graceful degradation when Redis credentials missing
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// If creds are missing, caching is disabled but API still works
const redis = url && token ? new Redis({ url, token }) : null;

// ✅ EXPERT PATTERN: Simplified interface
export interface NewsCacheData {
  items: NewsItem[];
  lastUpdated: string;
  errors?: NewsServiceError[];
  sources?: NewsSource[];
}

export class NewsCacheService {
  /**
   * ✅ EXPERT PATTERN: Get cached data with graceful degradation
   */
  static async getCache(): Promise<NewsCacheData | null> {
    if (!redis) return null;
    try {
      const data = await redis.get<NewsCacheData>('news-cache:v1');
      return data ?? null;
    } catch {
      return null;
    }
  }

  /**
   * ✅ EXPERT PATTERN: Set cache data with graceful degradation
   */
  static async setCache(data: NewsCacheData): Promise<void> {
    if (!redis) return; // no-op when Redis is not configured
    try {
      // 60 minutes TTL; adjust as needed
      await redis.set('news-cache:v1', data, { ex: 60 * 60 });
      console.log(`✅ News data cached in Redis: ${data.items.length} items`);
    } catch (error) {
      console.warn('⚠️ Redis cache write failed:', error);
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