/**
 * Supabase Storage Client Utilities
 * 
 * Client-safe functions for interacting with Supabase Storage.
 * This file does NOT use any Node.js-only modules like 'fs/promises'.
 */
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for browser-side operations
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Get a publicly accessible URL for a file (for public buckets)
export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createBrowserClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Download JSON data directly (for private buckets)
export async function downloadJson<T = any>(bucket: string, path: string): Promise<T> {
  const supabase = createBrowserClient();
  
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    
    if (error) {
      console.error(`Error downloading file ${path} from ${bucket}:`, error);
      throw error;
    }
    
    if (!data) {
      throw new Error(`No data returned from ${bucket}/${path}`);
    }
    
    const text = await data.text();
    return JSON.parse(text);
  } catch (error) {
    console.error(`Error processing JSON file ${path} from ${bucket}:`, error);
    throw error;
  }
}

// Get a signed URL for private files (time-limited access)
export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  
  if (error) {
    console.error(`Error creating signed URL for ${path} from ${bucket}:`, error);
    throw error;
  }
  
  return data.signedUrl;
}

// Multi-location file finder - tries several paths to find a file
// Useful when you're not sure of the exact path structure
export async function findAndDownloadJson<T = any>(bucket: string, filename: string, possiblePaths?: string[]): Promise<T> {
  const supabase = createBrowserClient();
  
  // Default paths to try
  const paths = possiblePaths || [
    `${filename}`,
    `maps/${filename}`,
    `public-maps/${filename}`,
    `sa2/${filename}`
  ];
  
  // Try each path until we find the file
  for (const path of paths) {
    try {
      const { data, error } = await supabase.storage.from(bucket).download(path);
      
      if (!error && data) {
        const text = await data.text();
        return JSON.parse(text);
      }
    } catch (e) {
      console.log(`File not found at ${bucket}/${path}, trying next path...`);
    }
  }
  
  // If all paths fail, throw an error
  throw new Error(`Failed to find file ${filename} in ${bucket} bucket at any of the tried paths`);
}

// List files in a bucket/folder
export async function listFiles(bucket: string, folder = ''): Promise<string[]> {
  const supabase = createBrowserClient();
  
  const { data, error } = await supabase.storage.from(bucket).list(folder);
  
  if (error) {
    console.error(`Error listing files in ${bucket}/${folder}:`, error);
    throw error;
  }
  
  return data.map(item => item.name);
}

// SA2 Data Types (used by server-side code but safe to include here)
export interface SA2Record {
  sa2_name: string;
  [metricKey: string]: any;
}

export interface SA2DataMap {
  [sa2Id: string]: SA2Record;
} 