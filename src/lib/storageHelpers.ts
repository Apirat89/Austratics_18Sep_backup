import { getPublicUrl } from './supabase-storage';

/**
 * Converts a local image path to a Supabase Storage URL.
 * If the image is not found in Supabase Storage, falls back to the original path.
 *
 * @param imagePath - The local image path (e.g. '/my-image.jpg')
 * @returns The Supabase Storage URL or the original path as a fallback
 */
export function getImageUrl(imagePath: string): string {
  if (!imagePath) return '';
  
  // Extract filename from path
  const filename = imagePath.split('/').pop();
  
  if (!filename) return imagePath;
  
  // Return Supabase Storage URL
  return getPublicUrl('images', filename);
}

/**
 * Updates all image sources in a document to use Supabase Storage URLs
 * 
 * @param html - HTML content with image tags
 * @returns HTML content with updated image sources
 */
export function updateImageSources(html: string): string {
  // Replace image sources with Supabase Storage URLs
  return html.replace(/src="([^"]+\.(jpg|jpeg|png|gif|svg|webp))"/gi, (match, src) => {
    const filename = src.split('/').pop();
    if (!filename) return match;
    
    const storageUrl = getPublicUrl('images', filename);
    return `src="${storageUrl}"`;
  });
}

/**
 * Returns the appropriate bucket name for a file based on its path
 * 
 * @param filePath - The file path
 * @returns The bucket name
 */
export function getBucketForPath(filePath: string): string {
  const lowerPath = filePath.toLowerCase();
  
  if (lowerPath.endsWith('.json')) {
    return 'json_data';
  }
  
  if (lowerPath.endsWith('.pdf') || lowerPath.endsWith('.docx') || lowerPath.endsWith('.doc')) {
    if (lowerPath.includes('faq')) {
      return 'faq';
    }
    return 'documents';
  }
  
  // Default to images for all other files
  return 'images';
}

/**
 * Converts a document path to a Supabase Storage URL
 * 
 * @param docPath - The document path
 * @returns The Supabase Storage URL
 */
export function getDocumentUrl(docPath: string): string {
  if (!docPath) return '';
  
  const bucket = getBucketForPath(docPath);
  const filename = docPath.split('/').pop();
  
  if (!filename) return docPath;
  
  const storagePath = docPath.includes('/') 
    ? `${docPath.split('/').slice(0, -1).join('/')}/${filename}` 
    : filename;
  
  return getPublicUrl(bucket, storagePath);
} 