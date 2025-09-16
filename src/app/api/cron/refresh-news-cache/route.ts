import { NextRequest, NextResponse } from 'next/server';
import { fetchAllNews } from '../../../../lib/rss-service';
import { NewsCacheService } from '../../../../lib/news-cache';
import { NEWS_SOURCES } from '../../../../types/news';

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
      : new URL(request.url).origin;
    
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
              'User-Agent': 'Taskmaster-Cron-Prewarm/1.0'
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
    
    return NextResponse.json({
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