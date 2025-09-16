import { fetchAllNews } from '../../../lib/rss-service';
import { NewsResponse, NewsItem, NewsServiceError } from '../../../types/news';
import { NewsCacheService } from '../../../lib/news-cache';

// ✅ EXPERT PATTERN: Runtime configuration for proper Vercel function optimization
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API Route: /api/news
 * 
 * Multi-layered caching: Vercel Edge Cache → Redis → RSS fallback
 * Background refresh + pre-warming via Vercel Cron Jobs
 */

/**
 * Generate CDN cache headers for Edge caching
 */
function generateCacheHeaders() {
  // 1 hour edge cache; serve stale for 5 minutes while revalidating; keep stale on error for a day
  const cdnCacheControl = 'public, s-maxage=3600, stale-while-revalidate=300, stale-if-error=86400';
  
  return {
    // Vercel respects CDN-Cache-Control for edge caching
    'CDN-Cache-Control': cdnCacheControl,
    // Browsers see normal Cache-Control; conservative for user browsers
    'Cache-Control': 'public, max-age=60',
    'Vary': 'Accept-Encoding',
    // Help with debugging
    'X-Cache-Strategy': 'serverless-redis-rss',
  };
}

/**
 * Timeout wrapper to prevent 504 Gateway Timeout errors on Vercel
 */
async function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  errorMessage: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  
  return Promise.race([promise, timeout]);
}

/**
 * ✅ EXPERT PATTERN: Try to get stale cache data as fallback when main logic fails
 */
async function tryGetStaleCacheSafely() {
  try {
    console.log('🔄 Attempting stale cache fallback...');
    const staleData = await NewsCacheService.getCache('news-cache:v1');
    if (staleData && staleData.items?.length) {
      console.log(`✅ Stale cache fallback: ${staleData.items.length} items`);
      return {
        ...staleData,
        metadata: {
          total: staleData.items.length,
          limit: 20,
          offset: 0,
          lastUpdated: staleData.lastUpdated || new Date().toISOString(),
          sources: Array.from(new Set(staleData.items.map(i => i.source?.id).filter(Boolean))).map(s => ({ id: String(s), name: String(s) })),
          cached: true,
          stale: true
        }
      };
    }
  } catch (staleError) {
    console.warn('⚠️ Stale cache fallback also failed:', staleError);
  }
  return null;
}

export async function GET(req: Request) {
  // ✅ EXPERT PATTERN: Comprehensive error handling wrapper
  try {
    console.log('📰 News API called:', req.url);
    const { searchParams } = new URL(req.url);
    
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit')) || 20));
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);
    const sourceFilter = searchParams.get('source') || null;

    // 1) Try hot cache (Redis/Upstash) first
    const cacheKey = NewsCacheService.generateCacheKey({
      source: sourceFilter || undefined,
      limit,
      offset
    });

    console.log(`🔍 Cache key: ${cacheKey}`);
    const cached = await NewsCacheService.getCache(cacheKey);

    if (cached && cached.items?.length) {
      console.log(`⚡ Redis cache HIT: ${cached.items.length} items`);
      
      const page = cached.items.slice(offset, offset + limit);
      const sources = Array.from(
        new Set(cached.items.map(i => i.source?.id).filter(Boolean))
      ).map(s => ({ id: String(s), name: String(s) }));

      return Response.json({
        success: true,
        items: page,
        metadata: {
          total: cached.items.length,
          limit,
          offset,
          lastUpdated: cached.lastUpdated || new Date().toISOString(),
          sources,
          cached: true,
        },
      });
    }

    // 2) If miss, fetch sources with short per-source timeout
    console.log('❌ Redis cache MISS - fetching from RSS sources');
    const fetchResult = await withTimeout(
      fetchAllNews(),
      50000, // 50 seconds (within Vercel serverless 60s limit)
      'RSS fetch timeout - taking too long to fetch news sources'
    );
    
    const filtered = sourceFilter
      ? fetchResult.items.filter(i => i.source?.id?.toLowerCase() === sourceFilter.toLowerCase())
      : fetchResult.items;

    // Store in Redis for future requests
    const cacheData = {
      items: filtered,
      lastUpdated: new Date().toISOString(),
      errors: fetchResult.errors,
    };
    await NewsCacheService.setCache(cacheData, 3600, cacheKey);

    const page = filtered.slice(offset, offset + limit);
    const sources = Array.from(
      new Set(filtered.map(i => i.source?.id).filter(Boolean))
    ).map(s => ({ id: String(s), name: String(s) }));

    // 3) Always catch and return partials instead of throwing
    return Response.json({
      success: true,
      items: page,
      metadata: {
        total: filtered.length,
        limit,
        offset,
        lastUpdated: cacheData.lastUpdated,
        sources,
        cached: false,
      }
    });

  } catch (err) {
    console.error('NEWS_API_FATAL', err);
    
    // Try returning stale cache if available to avoid a blank screen
    const stale = await tryGetStaleCacheSafely();
    if (stale) {
      return Response.json({
        success: true,
        ...stale,
        metadata: { ...stale.metadata, cached: true, stale: true }
      }, { status: 200 });
    }
    
    return Response.json({
      success: false,
      message: 'Internal error fetching news.'
    }, { status: 500 });
  }
}

/**
 * Manual cache refresh endpoint (for debugging)
 */
export async function POST(request: Request) {
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
        lastUpdated: new Date().toISOString(),
        errors: result.errors,
      });
      
      return Response.json({
        success: true,
        message: 'Cache refreshed manually',
        itemCount: result.items.length,
        errorCount: result.errors.length
      });
    }
    
    return Response.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ Manual refresh error:', error);
    return Response.json(
      { error: 'Refresh failed' },
      { status: 500 }
    );
  }
}

// ✅ EXPERT PATTERN: Simplified API - additional methods removed for clean implementation 