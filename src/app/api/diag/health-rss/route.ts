import { NextResponse } from "next/server";

// 🇦🇺 CRITICAL: Run from Sydney to test Australian government RSS access
export const runtime = "nodejs";
export const preferredRegion = ["syd1"];

export async function GET() {
  const start = Date.now();
  
  try {
    console.log(`🧪 Testing health.gov.au RSS from region: ${process.env.VERCEL_REGION}`);
    
    const res = await fetch("https://www.health.gov.au/news/rss.xml", {
      headers: {
        "User-Agent": "AustraticsBot/1.0 (+https://austratics.vercel.app; contact: admin@austratics.vercel.app)",
        "Accept": "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7",
        "Accept-Language": "en-AU,en;q=0.8",
        "Referer": "https://www.health.gov.au/news"
      },
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(25000) // 25 second timeout for gov site
    });

    const responseText = res.ok ? await res.text().catch(() => "[failed to read]") : "[no response text]";
    const contentLength = responseText.length;
    
    console.log(`🧪 Health RSS test result: ${res.status} (${contentLength} chars) in ${Date.now() - start}ms`);

    return NextResponse.json({
      success: res.ok,
      status: res.status,
      region: process.env.VERCEL_REGION || "unknown",
      tookMs: Date.now() - start,
      contentLength,
      headers: {
        contentType: res.headers.get('content-type'),
        server: res.headers.get('server'),
        cacheControl: res.headers.get('cache-control')
      },
      preview: res.ok ? responseText.substring(0, 500) + "..." : responseText
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.warn(`🧪 Health RSS test failed: ${errorMsg}`);
    
    return NextResponse.json({
      success: false,
      status: 0,
      region: process.env.VERCEL_REGION || "unknown", 
      tookMs: Date.now() - start,
      error: errorMsg,
      contentLength: 0
    });
  }
} 