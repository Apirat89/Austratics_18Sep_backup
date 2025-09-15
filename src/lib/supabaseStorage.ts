/**
 * Supabase Storage URL utilities
 * 
 * This file provides helper functions to generate URLs for files stored in Supabase Storage.
 * It implements mapping from local file paths to Supabase Storage URLs to facilitate
 * the migration from local file system to cloud storage.
 */

/**
 * SA2Record represents a single SA2 region's data
 */
export interface SA2Record {
  sa2_name: string;
  sa2_median?: Record<string, number>;
  postcodes?: string[];
  [key: string]: any;  // Other metrics and properties
}

/**
 * SA2DataMap is a map of SA2 IDs to their data records
 */
export type SA2DataMap = {
  [sa2Id: string]: SA2Record;
};

export const SUPABASE_STORAGE_URL = 'https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public';

/**
 * Generates a complete URL for a file in Supabase Storage
 * @param bucket - The storage bucket name (e.g., 'json_data', 'images', 'faq')
 * @param path - The path within the bucket (e.g., 'maps/Demographics_2023.json')
 * @returns Full URL to the file in Supabase Storage
 */
export function getSupabaseFileUrl(bucket: string, path: string): string {
  return `${SUPABASE_STORAGE_URL}/${bucket}/${path}`;
}

/**
 * Maps a local file path to its corresponding Supabase Storage URL
 * 
 * @param localPath - The local path to the file
 * @returns The Supabase Storage URL for the file
 */
export function getSupabaseUrl(localPath: string): string {
  // Clean up the path by removing leading slashes or 'public/'
  const cleanPath = localPath.replace(/^\/+|^public\/+/, '');
  
  // Map Maps_ABS_CSV files to json_data/maps bucket
  if (cleanPath.includes('Maps_ABS_CSV/') || cleanPath.includes('maps_abs_csv/') || cleanPath.includes('maps/abs_csv/')) {
    const filename = cleanPath.split('/').pop();
    return getSupabaseFileUrl('json_data', `maps/${filename}`);
  }
  
  // Map data/sa2 files to json_data/sa2 bucket
  if (cleanPath.includes('data/sa2/')) {
    const filename = cleanPath.split('/').pop();
    return getSupabaseFileUrl('json_data', `sa2/${filename}`);
  }
  
  // Map FAQ document files to faq/guides bucket
  if (cleanPath.includes('data/FAQ/')) {
    const filename = cleanPath.split('/').pop();
    return getSupabaseFileUrl('faq', `guides/${filename}`);
  }
  
  // Map image files to images bucket
  if (cleanPath.startsWith('images/') || 
      (cleanPath.endsWith('.jpg') || cleanPath.endsWith('.jpeg') || cleanPath.endsWith('.png'))) {
    const filename = cleanPath.split('/').pop();
    return getSupabaseFileUrl('images', filename || '');
  }
  
  // If no specific mapping found, return original path
  // This should not happen in practice as all files should be mapped
  console.warn(`⚠️ No Supabase mapping found for path: ${localPath}`);
  return localPath;
}

/**
 * Maps a file path used in a fetch() call to its Supabase Storage URL
 * Handles common fetch path patterns like '/Maps_ABS_CSV/file.json'
 * 
 * @param fetchPath - The path used in fetch() calls
 * @returns The corresponding Supabase Storage URL
 */
export function mapFetchPath(fetchPath: string): string {
  return getSupabaseUrl(fetchPath);
}

/**
 * Gets a URL for a specific SA2 data file in Supabase Storage
 * 
 * @param filename - The name of the SA2 data file
 * @returns Full Supabase URL for the SA2 data file
 */
export function getSA2DataUrl(filename: string): string {
  return getSupabaseFileUrl('json_data', `sa2/${filename}`);
}

/**
 * Gets a URL for a specific map data file in Supabase Storage
 * 
 * @param filename - The name of the map data file
 * @returns Full Supabase URL for the map data file
 */
export function getMapDataUrl(filename: string): string {
  return getSupabaseFileUrl('json_data', `maps/${filename}`);
}

/**
 * Gets a URL for a specific FAQ document in Supabase Storage
 * 
 * @param filename - The name of the FAQ document file
 * @returns Full Supabase URL for the FAQ document
 */
export function getFAQDocumentUrl(filename: string): string {
  return getSupabaseFileUrl('faq', `guides/${filename}`);
}

/**
 * Gets a URL for a specific image in Supabase Storage
 * 
 * @param filename - The name of the image file
 * @returns Full Supabase URL for the image
 */
export function getImageUrl(filename: string): string {
  return getSupabaseFileUrl('images', filename);
} 