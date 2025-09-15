/**
 * Client-safe public URL helper for Supabase Storage
 * Works in browser components without server-side dependencies
 */

export function publicUrl(bucket: string, path: string): string {
  console.log('🔧 publicUrl called with:', { bucket, path });
  
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  console.log('🔧 Environment NEXT_PUBLIC_SUPABASE_URL:', base || 'NOT FOUND');
  
  if (!base || !bucket || !path) {
    console.warn('❌ Missing parameters for publicUrl:', { base: !!base, bucket, path });
    return '';
  }
  
  // Extract project reference from Supabase URL
  const projectRef = base.split('//')[1]?.split('.')[0];
  console.log('🔧 Extracted project reference:', projectRef);
  
  if (!projectRef) {
    console.warn('❌ Could not extract project reference from:', base);
    return '';
  }
  
  // Build public storage URL (encode path to handle spaces and special characters)
  const encodedPath = encodeURIComponent(path);
  const url = `https://${projectRef}.supabase.co/storage/v1/object/public/${bucket}/${encodedPath}`;
  console.log('✅ Generated URL:', url);
  
  return url;
}

/**
 * Helper specifically for image assets
 */
export function getImageUrl(filename: string): string {
  console.log('🖼️ getImageUrl called with filename:', filename);
  return publicUrl('images', filename);
}

/**
 * Helper specifically for JSON data assets
 */
export function getJsonDataUrl(path: string): string {
  return publicUrl('json_data', path);
}

/**
 * Helper specifically for FAQ documents
 */
export function getFaqDocumentUrl(filename: string): string {
  return publicUrl('faq', `guides/${filename}`);
} 