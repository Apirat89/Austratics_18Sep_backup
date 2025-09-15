import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews } from '../../../../lib/rss-service';
import { NewsCacheService } from '../../../../lib/news-cache';

// Verify this is a legitimate Vercel cron request
const validateCronRequest = (req: NextRequest): boolean => {
  // Vercel adds this header to cron requests
  const vercelCron = req.headers.get('x-vercel-cron');
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // Accept either Vercel's cron header or our custom auth
  return vercelCron === '1' || authHeader === `Bearer ${cronSecret}`;
};

export async function GET(request: NextRequest) {
  return handleCronRequest(request);
}

export async function POST(request: NextRequest) {
  return handleCronRequest(request);
}

async function handleCronRequest(request: NextRequest) {
  // Security check - verify this is a legitimate cron request
  if (!validateCronRequest(request)) {
    console.warn('🚫 Unauthorized cron request attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  console.log('🔄 Vercel Cron: Starting news cache refresh');
  const startTime = Date.now();
  
  try {
    // Fetch all news from RSS sources
    const result = await fetchAllNews();
    
    // Prepare metadata
    const uniqueSources = Array.from(
      new Map(result.items.map(item => [item.source.id, item.source])).values()
    );
    
    const fetchDuration = Date.now() - startTime;
    
    // Store in cache with 2-hour TTL (for redundancy)
    await NewsCacheService.setCache({
      items: result.items,
      errors: result.errors,
      lastUpdated: new Date().toISOString(),
      sources: uniqueSources,
      fetchDuration
    }, 7200); // 2 hours TTL
    
    // Cache by source for more efficient filtering
    const sourceGroups = new Map<string, any[]>();
    result.items.forEach(item => {
      if (!sourceGroups.has(item.source.id)) {
        sourceGroups.set(item.source.id, []);
      }
      sourceGroups.get(item.source.id)?.push(item);
    });
    
    // Store source-specific caches in parallel
    const sourcePromises = Array.from(sourceGroups.entries()).map(
      ([sourceId, items]) => NewsCacheService.setCacheBySource(sourceId, items, 7200)
    );
    
    await Promise.all(sourcePromises);
    
    console.log(`✅ Vercel Cron: News cache refreshed successfully in ${fetchDuration}ms`);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        itemCount: result.items.length,
        sourceCount: uniqueSources.length,
        errorCount: result.errors.length,
        duration: fetchDuration
      },
      errors: result.errors.length > 0 ? result.errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Vercel Cron: News cache refresh failed:', error);
    
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}

// Configuration for maximum execution time
export const maxDuration = 300; // 5 minutes 