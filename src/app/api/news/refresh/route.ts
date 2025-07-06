import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews } from '../../../../lib/rss-service';
import { clearNewsCache } from '../route';
import { NewsCacheService } from '@/lib/news-cache';

/**
 * API Route: /api/news/refresh
 * 
 * Force refresh news cache and fetch latest RSS data
 * 
 * Endpoints:
 * - POST /api/news/refresh - Clear cache and fetch fresh news data
 * - GET /api/news/refresh - Get cache status information
 */

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 News cache refresh requested');
    
    // Clear existing cache
    await clearNewsCache();
    
    // Fetch fresh data
    const startTime = Date.now();
    const result = await fetchAllNews();
    const fetchDuration = Date.now() - startTime;
    
    console.log(`✅ Cache refresh completed in ${fetchDuration}ms`);
    console.log(`📰 Fetched ${result.items.length} items with ${result.errors.length} errors`);
    
    return NextResponse.json({
      success: true,
      message: 'News cache refreshed successfully',
      stats: {
        itemCount: result.items.length,
        errorCount: result.errors.length,
        fetchDuration: `${fetchDuration}ms`,
        refreshedAt: new Date().toISOString(),
      },
      errors: result.errors.length > 0 ? result.errors : undefined,
    });

  } catch (error) {
    console.error('❌ News cache refresh failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Cache refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to refresh news data from RSS sources'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Background news refresh started...');
    const startTime = Date.now();

    // Fetch fresh news data from all RSS sources
    const { items, errors } = await fetchAllNews();
    
    const fetchDuration = Date.now() - startTime;
    
    // Prepare cache data
    const cacheData = {
      items,
      errors,
      sources: items.map(item => item.source).filter((source, index, self) => 
        self.findIndex(s => s.id === source.id) === index
      ),
      lastUpdated: new Date().toISOString(),
      fetchDuration,
    };

    // Cache the data (30 minutes TTL)
    await NewsCacheService.setCache(cacheData, 30 * 60);

    console.log(`✅ Background refresh completed: ${items.length} items cached in ${fetchDuration}ms`);

    return NextResponse.json({
      success: true,
      message: 'News cache refreshed successfully',
      itemCount: items.length,
      errorCount: errors.length,
      duration: fetchDuration,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Background refresh failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to refresh news cache',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 