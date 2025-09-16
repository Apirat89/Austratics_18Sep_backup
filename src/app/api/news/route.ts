import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews } from '../../../lib/rss-service';
import { NewsResponse, NewsItem, NewsServiceError } from '../../../types/news';
import { NewsCacheService } from '../../../lib/news-cache';

// ✅ EXPERT PATTERN: Edge runtime for global performance
export const runtime = 'edge';
export const preferredRegion = 'auto';

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
    'X-Cache-Strategy': 'edge-redis-rss',
  };
}

export async function GET(req: NextRequest) {
  try {
    console.log('📰 News API called:', req.url);
    const { searchParams } = new URL(req.url);
    
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit')) || 20));
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);
    const sourceFilter = searchParams.get('source') || null;

    // Generate cache key for this specific query
    const cacheKey = NewsCacheService.generateCacheKey({
      source: sourceFilter || undefined,
      limit,
      offset
    });

    console.log(`🔍 Cache key: ${cacheKey}`);

    // ✅ EXPERT PATTERN: 1) Try Redis cache first
    const cached = await NewsCacheService.getCache(cacheKey);

    if (cached && cached.items?.length) {
      console.log(`⚡ Redis cache HIT: ${cached.items.length} items`);
      
      // Apply pagination if needed (cache might have full dataset)
      const page = cached.items.slice(offset, offset + limit);
      
      // Build metadata
      const sources = Array.from(
        new Set(cached.items.map(i => i.source?.id).filter(Boolean))
      ).map(s => ({ id: String(s), name: String(s) }));

      return NextResponse.json({
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
      }, { 
        headers: generateCacheHeaders()
      });
    }

    // ✅ EXPERT PATTERN: 2) Cache miss - fetch from RSS sources
    console.log('❌ Redis cache MISS - fetching from RSS sources');
    const fetchResult = await fetchAllNews();
    
    // Apply source filter if specified
    const filtered = sourceFilter
      ? fetchResult.items.filter(i => i.source?.id?.toLowerCase() === sourceFilter.toLowerCase())
      : fetchResult.items;

    // Prepare cache data
    const cacheData = {
      items: filtered,
      lastUpdated: new Date().toISOString(),
      errors: fetchResult.errors,
    };

    // Store in Redis for future requests
    await NewsCacheService.setCache(cacheData, 3600, cacheKey); // 1 hour TTL

    // Apply pagination
    const page = filtered.slice(offset, offset + limit);

    // Build metadata
    const sources = Array.from(
      new Set(filtered.map(i => i.source?.id).filter(Boolean))
    ).map(s => ({ id: String(s), name: String(s) }));

    return NextResponse.json({
      success: true,
      items: page,
      metadata: {
        total: filtered.length,
        limit,
        offset,
        lastUpdated: cacheData.lastUpdated,
        sources,
        cached: false,
      },
    }, { 
      headers: generateCacheHeaders()
    });

  } catch (err: any) {
    console.error('❌ News API error:', err);
    
    return NextResponse.json(
      { 
        success: false, 
        message: err?.message ?? 'Unexpected error', 
        items: [], 
        metadata: null 
      },
      { 
        status: 500,
        headers: {
          // Even errors get some caching to avoid hammering failing services
          'Cache-Control': 'public, max-age=60',
        }
      }
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
        lastUpdated: new Date().toISOString(),
        errors: result.errors,
      });
      
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

// ✅ EXPERT PATTERN: Simplified API - additional methods removed for clean implementation 