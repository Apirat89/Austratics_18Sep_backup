import { NextResponse } from "next/server";

export async function GET() {
  const rawUrl = process.env.UPSTASH_REDIS_REST_URL || "";
  const rawTok = process.env.UPSTASH_REDIS_REST_TOKEN || "";
  const url = rawUrl.replace(/^"|"$/g, "").trim();
  const token = rawTok.replace(/^"|"$/g, "").trim();
  return NextResponse.json({
    urlSeenByServer: url,
    host: (() => { try { return new URL(url).host; } catch { return null } })(),
    hasToken: Boolean(token),
  });
} 