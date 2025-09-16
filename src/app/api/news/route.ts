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

export async function GET(req: NextRequest) {
  try {
    console.log('📰 News API called:', req.url);
    const { searchParams } = new URL(req.url);
    
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit')) || 20));
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);
    const sourceFilter = searchParams.get('source') || null;

    // ✅ EXPERT PATTERN: 1) Try cache first
    const cached = await NewsCacheService.getCache();

    // ✅ EXPERT PATTERN: 2) Fallback to fetching if cache miss
    const useCache = !!(cached && cached.items?.length);
    const itemsRaw = useCache ? cached!.items : (await fetchAllNews()).items;

    // ✅ EXPERT PATTERN: 3) Optional source filter + pagination
    const filtered = sourceFilter
      ? itemsRaw.filter(i => i.source?.id?.toLowerCase() === sourceFilter.toLowerCase())
      : itemsRaw;

    const total = filtered.length;
    const page = filtered.slice(offset, offset + limit);

    // Build metadata the UI expects
    const sources = Array.from(
      new Set(
        (itemsRaw || []).map(i => i.source?.id).filter(Boolean)
      )
    ).map(s => ({ id: String(s), name: String(s) }));

    const lastUpdated = useCache
      ? cached!.lastUpdated
      : new Date().toISOString();

    return NextResponse.json({
      success: true,
      items: page,
      metadata: {
        total,
        limit,
        offset,
        lastUpdated,
        sources,
        cached: useCache,
      },
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