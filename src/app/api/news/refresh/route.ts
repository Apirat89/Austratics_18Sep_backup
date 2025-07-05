import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews } from '../../../../lib/rss-service';
import { clearNewsCache } from '../route';

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
    console.log('📊 News cache status requested');
    
    // Import the cache check function
    const { getCacheStatus } = await import('../route');
    const cacheStatus = await getCacheStatus();
    
    return NextResponse.json({
      success: true,
      cacheStatus,
    });

  } catch (error) {
    console.error('❌ Failed to get cache status:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get cache status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 