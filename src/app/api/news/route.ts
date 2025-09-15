import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews } from '../../../lib/rss-service';
import { NewsResponse, NewsItem, NewsServiceError } from '../../../types/news';
import { NewsCacheService } from '../../../lib/news-cache';

/**
 * API Route: /api/news
 * 
 * Serves cached news from Redis - no direct RSS fetching
 * Background refresh is handled by Vercel Cron Jobs
 */

export async function GET(request: NextRequest) {
  try {
    console.log('📰 News API called:', request.url);
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sourceFilter = searchParams.get('source');
    const categoryFilter = searchParams.get('category');
    const forceRefresh = searchParams.get('refresh') === 'true';
    
    // Always check cache first - this is now the primary data source
    const cachedData = await NewsCacheService.getCache();
    
    if (cachedData) {
      console.log('⚡ Serving cached news data');
      
      // Apply filters to cached data
      let filteredData = cachedData.items;
      
      if (sourceFilter) {
        filteredData = filteredData.filter(item => item.source.id === sourceFilter);
      }
      
      if (categoryFilter) {
        filteredData = filteredData.filter(item => item.source.category === categoryFilter);
      }
      
      // Apply pagination
      const total = filteredData.length;
      const paginatedData = filteredData.slice(offset, offset + limit);
      
      // Get unique sources from original unfiltered data
      const uniqueSources = Array.from(
        new Map(cachedData.items.map(item => [item.source.id, item.source])).values()
      );
      
      return NextResponse.json({
        success: true,
        items: paginatedData,
        metadata: {
          total,
          limit,
          offset,
          lastUpdated: cachedData.lastUpdated,
          sources: uniqueSources,
          cached: true,
          cacheSource: 'redis'
        }
      });
    }
    
    // Cache miss - trigger background refresh if requested
    if (forceRefresh) {
      console.log('🔄 Manual refresh requested - triggering background cache refresh');
      
      try {
        // Trigger a manual cache refresh without waiting
        const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
        const cronSecret = process.env.CRON_SECRET;
        
        fetch(`${baseUrl}/api/cron/refresh-news-cache`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cronSecret}`,
            'Content-Type': 'application/json'
          }
        }).catch(error => {
          console.error('⚠️ Background refresh trigger failed:', error);
        });
        
      } catch (error) {
        console.error('⚠️ Failed to trigger background refresh:', error);
      }
    }
    
    // Return empty response with cache miss indicator
    console.log('📭 Cache miss - returning empty response');
    
    return NextResponse.json({
      success: true,
      items: [],
      metadata: {
        total: 0,
        limit,
        offset,
        lastUpdated: new Date().toISOString(),
        sources: [],
        cached: false,
        cacheSource: 'none',
        message: 'Cache miss - news data will be available after the next hourly refresh'
      }
    });

  } catch (error) {
    console.error('❌ News API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to fetch news data'
      },
      { status: 500 }
    );
  }
}

/**
 * Manual cache refresh endpoint (for debugging)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'refresh-cache') {
      console.log('🔄 Manual cache refresh requested');
      
      // Direct cache refresh (bypass cron)
      const result = await fetchAllNews();
      
      const uniqueSources = Array.from(
        new Map(result.items.map(item => [item.source.id, item.source])).values()
      );
      
      await NewsCacheService.setCache({
        items: result.items,
        errors: result.errors,
        lastUpdated: new Date().toISOString(),
        sources: uniqueSources,
        fetchDuration: 0
      }, 7200);
      
      return NextResponse.json({
        success: true,
        message: 'Cache refreshed manually',
        itemCount: result.items.length,
        errorCount: result.errors.length
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ Manual refresh error:', error);
    return NextResponse.json(
      { error: 'Refresh failed' },
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