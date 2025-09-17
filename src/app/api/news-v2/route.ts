import { fetchAllNews } from '../../../lib/rss-service';
import { NewsResponse, NewsItem, NewsServiceError } from '../../../types/news';

// ✅ SIMPLIFIED PATTERN: Direct RSS fetching without caching complexity
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 🇦🇺 Keep Sydney region for better Australian government RSS access
export const preferredRegion = ["syd1"];

/**
 * API Route: /api/news
 * 
 * SIMPLIFIED ARCHITECTURE: Direct RSS fetching on every request
 * - No Redis dependency
 * - No CRON jobs  
 * - Promise.allSettled for partial results
 * - Fast timeouts for reliability
 */

/**
 * Fast timeout wrapper - 8 seconds max per request
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

export async function GET(req: Request) {
  try {
    console.log('📰 News API called (SIMPLIFIED DIRECT FETCH MODE v2):', req.url);
    const { searchParams } = new URL(req.url);
    
    const limit = Math.max(1, Math.min(100, Number(searchParams.get('limit')) || 20));
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0);
    const sourceFilter = searchParams.get('source') || null;

    // Direct RSS fetch with fast timeout (8 seconds)
    console.log('🔄 Fetching directly from RSS sources...');
    const fetchResult = await withTimeout(
      fetchAllNews(),
      8000, // 8 seconds - fast failure for better UX
      'RSS fetch timeout - sources taking too long to respond'
    );
    
    // Filter by source if requested
    const filtered = sourceFilter
      ? fetchResult.items.filter(i => i.source?.id?.toLowerCase() === sourceFilter.toLowerCase())
      : fetchResult.items;

    // Paginate results
    const page = filtered.slice(offset, offset + limit);
    
    // Get available sources from results
    const sources = Array.from(
      new Set(filtered.map(i => i.source?.id).filter(Boolean))
    ).map(s => ({ id: String(s), name: String(s) }));

    // Simple success response  
    return Response.json({
      success: true,
      items: page,
      metadata: {
        total: filtered.length,
        limit,
        offset,
        lastUpdated: new Date().toISOString(),
        sources,
        cached: false, // Always false - direct fetch
        simplified_system: "v2_direct_rss",
        errors: fetchResult.errors?.length ? fetchResult.errors : undefined
      }
    });

  } catch (err) {
    console.error('NEWS_API_ERROR', err);
    
    // Simple error response - no complex fallback
    return Response.json({
      success: false,
      message: 'SIMPLIFIED SYSTEM: Failed to fetch news from RSS sources (v2)',
      error: err instanceof Error ? err.message : 'Unknown error',
      items: [],
      metadata: {
        total: 0,
        limit: Number(new URL(req.url).searchParams.get('limit')) || 20,
        offset: Number(new URL(req.url).searchParams.get('offset')) || 0,
        lastUpdated: new Date().toISOString(),
        sources: [],
        cached: false
      }
    }, { status: 500 });
  }
}

// Remove POST method - no cache refresh needed in direct mode 