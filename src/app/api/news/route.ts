import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews } from '../../../lib/rss-service';
import { NewsResponse, NewsItem, NewsServiceError } from '../../../types/news';
import NewsCacheService from '../../../lib/news-cache';

/**
 * API Route: /api/news
 * 
 * Serves aggregated news from multiple RSS sources
 * 
 * Endpoints:
 * - GET /api/news - Returns paginated news items from all sources
 * - GET /api/news?limit=20 - Limit number of items returned (default: 50)
 * - GET /api/news?offset=20 - Offset for pagination (default: 0)
 * - GET /api/news?source=guardian-aged-care - Filter by specific source
 * - GET /api/news?category=government - Filter by source category
 * - GET /api/news?refresh=true - Force refresh RSS feeds (bypass cache)
 */

// Redis-based caching (replacing in-memory cache)
const CACHE_DURATION = 30 * 60; // 30 minutes in seconds (for Redis TTL)

export async function GET(request: NextRequest) {
  try {
    console.log('📰 News API called:', request.url);
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sourceFilter = searchParams.get('source');
    const categoryFilter = searchParams.get('category');
    const refresh = searchParams.get('refresh') === 'true';
    
    console.log('📋 Query params:', { limit, offset, sourceFilter, categoryFilter, refresh });
    
    // Check cache validity
    const cacheValid = await NewsCacheService.isCacheValid();
    
    let newsData: NewsItem[];
    let errors: NewsServiceError[];
    let lastUpdated: string;
    
    if (cacheValid && !refresh) {
      console.log('✅ Using cached news data from Redis');
      const cachedData = await NewsCacheService.getCache();
      if (cachedData) {
        newsData = cachedData.items;
        errors = cachedData.errors;
        lastUpdated = cachedData.lastUpdated;
      } else {
        throw new Error('Cache validation succeeded but no data found');
      }
    } else {
      console.log('🔄 Fetching fresh news data from RSS sources...');
      
      try {
        const startTime = Date.now();
        const result = await fetchAllNews();
        const fetchDuration = Date.now() - startTime;
        
        newsData = result.items;
        errors = result.errors;
        lastUpdated = new Date().toISOString();
        
        // Get unique sources from the data
        const uniqueSources = Array.from(
          new Map(newsData.map(item => [item.source.id, item.source])).values()
        );
        
        // Update Redis cache
        await NewsCacheService.setCache({
          items: newsData,
          errors,
          lastUpdated,
          sources: uniqueSources,
          fetchDuration,
        }, CACHE_DURATION);
        
        console.log(`✅ Successfully fetched ${newsData.length} news items with ${errors.length} errors in ${fetchDuration}ms`);
      } catch (error) {
        console.error('❌ Failed to fetch news data:', error);
        
        // Try to return cached data if available, otherwise error
        const cachedData = await NewsCacheService.getCache();
        if (cachedData) {
          console.log('⚠️ Using stale cached data due to fetch error');
          newsData = cachedData.items;
          errors = [...cachedData.errors, {
            message: 'Failed to refresh news data, using cached version',
            code: 'REFRESH_ERROR',
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
          }];
          lastUpdated = cachedData.lastUpdated;
        } else {
          throw error;
        }
      }
    }
    
    // Apply filters
    let filteredData = newsData;
    
    if (sourceFilter) {
      filteredData = filteredData.filter(item => item.source.id === sourceFilter);
      console.log(`🔍 Filtered by source '${sourceFilter}': ${filteredData.length} items`);
    }
    
    if (categoryFilter) {
      filteredData = filteredData.filter(item => item.source.category === categoryFilter);
      console.log(`🔍 Filtered by category '${categoryFilter}': ${filteredData.length} items`);
    }
    
    // Apply pagination
    const total = filteredData.length;
    const paginatedData = filteredData.slice(offset, offset + limit);
    
    // Get unique sources from filtered data
    const uniqueSources = Array.from(
      new Map(filteredData.map(item => [item.source.id, item.source])).values()
    );
    
    // Get cache stats for metadata
    const cacheStats = await NewsCacheService.getCacheStats();
    
    const response: NewsResponse = {
      items: paginatedData,
      metadata: {
        total,
        limit,
        offset,
        lastUpdated,
        sources: uniqueSources,
        cached: cacheValid && !refresh,
        cacheExpires: cacheStats.expiresAt || undefined,
      },
    };
    
    // Include errors in response if any
    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} errors occurred while fetching news`);
    }
    
    return NextResponse.json({
      success: true,
      ...response,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('❌ News API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to fetch news data from RSS sources'
      },
      { status: 500 }
    );
  }
}

/**
 * Clear the news cache (for testing purposes)
 */
export async function clearNewsCache(): Promise<void> {
  await NewsCacheService.clearCache();
  console.log('🗑️ News cache cleared from Redis');
}

/**
 * Get current cache status
 */
export async function getCacheStatus() {
  return await NewsCacheService.getCacheStats();
} 