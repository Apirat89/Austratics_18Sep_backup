import { NextResponse } from 'next/server';

// This creates a dynamic route segment to bypass static generation
// The mere existence of this file will cause Next.js to treat this as a dynamic route
export async function GET() {
  // This function won't actually be called - we just need the file to exist
  return NextResponse.next();
} 