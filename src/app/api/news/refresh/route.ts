import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * API Route: /api/news/refresh
 * 
 * Force refresh news cache by warming main API endpoints
 * Fixes build error by removing clearNewsCache import dependency
 */

export async function GET() {
  try {
    console.log('🔄 News cache refresh requested via GET');
    
    // Warm the main lists (adjust sources/params as needed)
    const base = process.env.NEXT_PUBLIC_SITE_URL || "https://austratics.vercel.app";
    const paths = [
      "/api/news?limit=20&offset=0",
      "/api/news?source=aged-care-insite&limit=20&offset=0", 
      "/api/news?source=australian-ageing-agenda&limit=20&offset=0",
    ];

    const results = await Promise.allSettled(
      paths.map(p => 
        fetch(base + p, { 
          cache: "no-store",
          headers: {
            'User-Agent': 'News-Refresh-Service/1.0'
          }
        })
      )
    );
    
    const status = results.map((r, i) =>
      r.status === "fulfilled" 
        ? { path: paths[i], ok: r.value.ok, code: r.value.status } 
        : { path: paths[i], ok: false, code: 0, err: (r as any).reason?.message }
    );

    const successful = status.filter(s => s.ok).length;
    console.log(`✅ News refresh completed: ${successful}/${paths.length} paths warmed`);

    return NextResponse.json({ 
      success: true, 
      message: `Refreshed ${successful}/${paths.length} cache paths`,
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ News refresh failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Cache refresh failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST() {
  // Both GET and POST do the same thing for now
  return GET();
} 