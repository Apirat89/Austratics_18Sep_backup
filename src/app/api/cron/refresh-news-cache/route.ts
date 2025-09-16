import { fetchAllNews } from '../../../../lib/rss-service';
import { NewsCacheService } from '../../../../lib/news-cache';
import { NEWS_SOURCES } from '../../../../types/news';

// ✅ EXPERT PATTERN: Runtime configuration for proper Vercel function optimization
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // ✅ EXPERT PATTERN: Accept BOTH Vercel cron header AND bearer token
  const ua = req.headers.get('user-agent') || '';
  const isVercelCron = ua.includes('vercel-cron') || !!req.headers.get('x-vercel-cron');

  const auth = req.headers.get('authorization') || '';
  const hasBearer = auth === `Bearer ${process.env.CRON_SECRET}`;

  if (!isVercelCron && !hasBearer) {
    console.warn('Unauthorized cron request attempt', {
      ua,
      xCron: !!req.headers.get('x-vercel-cron'),
      authPresent: !!auth
    });
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('✅ Valid cron request detected:', {
    method: isVercelCron ? 'vercel-cron-header' : 'bearer-token',
    userAgent: ua.substring(0, 50)
  });
  
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
    
    // ✅ EXPERT PATTERN: Store in simplified cache
    await NewsCacheService.setCache({
      items: result.items,
      lastUpdated: new Date().toISOString(),
      errors: result.errors,
    });
    
    console.log(`✅ Vercel Cron: News cache refreshed successfully in ${fetchDuration}ms`);
    
    // ✅ EXPERT PATTERN: Pre-warm Edge cache with common queries
    const prewarmStartTime = Date.now();
    console.log('🔥 Starting Edge cache pre-warming...');
    
    // Determine base URL for pre-warming requests
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : new URL(req.url).origin;
    
    // Define common query patterns to pre-warm
    const prewarmPaths = [
      '/api/news?limit=20&offset=0', // Default query
    ];
    
    // Add per-source queries for available sources
    uniqueSources.forEach(source => {
      prewarmPaths.push(`/api/news?source=${source.id}&limit=20&offset=0`);
    });
    
    // Execute pre-warming requests in parallel
    const prewarmResults = await Promise.allSettled(
      prewarmPaths.map(async (path) => {
        try {
          const response = await fetch(`${baseUrl}${path}`, {
            headers: { 
              'x-prewarm': '1',
              'User-Agent': 'Taskmaster-Cron-Prewarm/1.0',
              // ✅ FIX: Include CRON_SECRET for authorized pre-warming
              'Authorization': `Bearer ${process.env.CRON_SECRET}`
            },
          });
          
          if (response.ok) {
            console.log(`✅ Pre-warmed: ${path} (${response.status})`);
            return { path, success: true, status: response.status };
          } else {
            console.warn(`⚠️ Pre-warm failed: ${path} (${response.status})`);
            return { path, success: false, status: response.status };
          }
        } catch (error) {
          console.error(`❌ Pre-warm error: ${path}:`, error);
          return { path, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );
    
    const prewarmDuration = Date.now() - prewarmStartTime;
    const successfulPrewarms = prewarmResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
    console.log(`🔥 Edge cache pre-warming completed: ${successfulPrewarms}/${prewarmPaths.length} paths in ${prewarmDuration}ms`);
    
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        itemCount: result.items.length,
        sourceCount: uniqueSources.length,
        errorCount: result.errors.length,
        duration: fetchDuration,
        prewarmDuration,
        prewarmPaths: prewarmPaths.length,
        prewarmSuccessful: successfulPrewarms,
      },
      errors: result.errors.length > 0 ? result.errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Vercel Cron: News cache refresh failed:', error);
    
    return Response.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    }, { status: 500 });
  }
}

// Configuration for maximum execution time
export const maxDuration = 300; // 5 minutes 