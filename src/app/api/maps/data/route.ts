import { NextRequest, NextResponse } from 'next/server';
import { getJsonFromStorage, createServerClient } from '@/lib/serverStorage';

// API route to proxy map data from Supabase
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('file');
    const bucket = searchParams.get('bucket') || 'json_data';
    
    // Validate required parameters
    if (!filename) {
      return NextResponse.json({ error: 'Missing file parameter' }, { status: 400 });
    }
    
    // Try different paths to find the file
    const possiblePaths = [
      filename,
      `maps/${filename}`,
      `public-maps/${filename}`,
      `sa2/${filename}`,
      filename.replace('.geojson', '').replace('.json', '') + '.geojson',
      filename.replace('.geojson', '').replace('.json', '') + '.json'
    ];
    
    let data: any = null;
    let foundPath: string | null = null;
    
    // Try each path until we find the file
    for (const path of possiblePaths) {
      try {
        data = await getJsonFromStorage(bucket, path);
        if (data) {
          foundPath = path;
          console.log(`Found file at ${bucket}/${path}`);
          break;
        }
      } catch (err) {
        console.log(`File not found at ${bucket}/${path}, trying next path...`);
      }
    }
    
    // If file was found, return it
    if (data) {
      // Determine content type based on file extension
      const contentType = filename.endsWith('.geojson') ? 
        'application/geo+json' : 'application/json';
      
      // Return the data with appropriate cache headers
      return NextResponse.json(data, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=600'
        }
      });
    }
    
    // If direct download failed, try signed URL approach
    try {
      // Get a signed URL for the file
      const supabase = createServerClient();
      const { data: urlData, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(possiblePaths[0], 3600);
      
      if (error || !urlData?.signedUrl) {
        throw error || new Error('Failed to generate signed URL');
      }
      
      // Redirect to the signed URL
      return NextResponse.redirect(urlData.signedUrl);
    } catch (err) {
      console.error(`Error getting signed URL for ${bucket}/${filename}:`, err);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error loading map data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 