import { getPublicUrl, getSignedUrl } from './supabase-storage';

// List of buckets that are set to private
const PRIVATE_BUCKETS = ['images', 'json_data', 'documents', 'faq'];

/**
 * Converts a local image path to a Supabase Storage URL.
 * If the image is not found in Supabase Storage, falls back to the original path.
 *
 * @param imagePath - The local image path (e.g. '/my-image.jpg')
 * @returns Promise resolving to the Supabase Storage URL or the original path as a fallback
 */
export async function getImageUrl(imagePath: string): Promise<string> {
  if (!imagePath) return '';
  
  // Extract filename from path
  const filename = imagePath.split('/').pop();
  
  if (!filename) return imagePath;
  
  // Use signed URL for private buckets
  if (PRIVATE_BUCKETS.includes('images')) {
    const signedUrl = await getSignedUrl('images', filename);
    return signedUrl || imagePath;
  }
  
  // Return public URL for public buckets
  return getPublicUrl('images', filename);
}

/**
 * Updates all image sources in a document to use Supabase Storage URLs
 * 
 * @param html - HTML content with image tags
 * @returns Promise resolving to HTML content with updated image sources
 */
export async function updateImageSources(html: string): Promise<string> {
  // Extract all image sources
  const regex = /src="([^"]+\.(jpg|jpeg|png|gif|svg|webp))"/gi;
  let match;
  const imageSources = [];
  
  while ((match = regex.exec(html)) !== null) {
    imageSources.push(match[1]);
  }
  
  // Generate signed URLs for all images
  const imageUrlMap = new Map();
  for (const src of imageSources) {
    const filename = src.split('/').pop();
    if (!filename) continue;
    
    // Use signed URL for private buckets
    if (PRIVATE_BUCKETS.includes('images')) {
      const signedUrl = await getSignedUrl('images', filename);
      if (signedUrl) imageUrlMap.set(src, signedUrl);
    } else {
      const publicUrl = getPublicUrl('images', filename);
      imageUrlMap.set(src, publicUrl);
    }
  }
  
  // Replace all image sources with the signed or public URLs
  let updatedHtml = html;
  for (const [original, newUrl] of imageUrlMap.entries()) {
    updatedHtml = updatedHtml.replace(
      new RegExp(`src="${original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'), 
      `src="${newUrl}"`
    );
  }
  
  return updatedHtml;
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
 * @returns Promise resolving to the Supabase Storage URL
 */
export async function getDocumentUrl(docPath: string): Promise<string> {
  if (!docPath) return '';
  
  const bucket = getBucketForPath(docPath);
  const filename = docPath.split('/').pop();
  
  if (!filename) return docPath;
  
  const storagePath = docPath.includes('/') 
    ? `${docPath.split('/').slice(0, -1).join('/')}/${filename}` 
    : filename;
  
  // Use signed URL for private buckets
  if (PRIVATE_BUCKETS.includes(bucket)) {
    const signedUrl = await getSignedUrl(bucket, storagePath);
    return signedUrl || docPath;
  }
  
  // Return public URL for public buckets
  return getPublicUrl(bucket, storagePath);
} 