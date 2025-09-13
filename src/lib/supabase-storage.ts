import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with storage capabilities
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create admin client for server-side operations
export function createStorageClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  });
}

// For client-side operations with public access
export function createPublicStorageClient() {
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Get a file from storage
 * @param bucket The bucket name
 * @param path The file path within the bucket
 * @returns The file data or null if not found
 */
export async function getFileFromStorage(bucket: string, path: string): Promise<any> {
  const supabase = createStorageClient();
  
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .download(path);
  
  if (error) {
    console.error(`Error downloading file ${path} from ${bucket}:`, error);
    return null;
  }
  
  return data;
}

/**
 * Get a JSON file from storage and parse it
 * @param bucket The bucket name
 * @param path The file path within the bucket
 * @returns The parsed JSON data or null if not found/invalid
 */
export async function getJsonFromStorage<T>(bucket: string, path: string): Promise<T | null> {
  const file = await getFileFromStorage(bucket, path);
  
  if (!file) {
    return null;
  }
  
  try {
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(`Error parsing JSON file ${path} from ${bucket}:`, error);
    return null;
  }
}

/**
 * Upload a file to storage
 * @param bucket The bucket name
 * @param path The file path within the bucket
 * @param file The file to upload (File or Blob)
 * @param options Additional options
 * @returns Success status
 */
export async function uploadFileToStorage(
  bucket: string, 
  path: string, 
  file: File | Blob,
  options: { contentType?: string, upsert?: boolean } = {}
): Promise<boolean> {
  const supabase = createStorageClient();
  
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .upload(path, file, {
      contentType: options.contentType,
      upsert: options.upsert ?? true
    });
  
  if (error) {
    console.error(`Error uploading file to ${bucket}/${path}:`, error);
    return false;
  }
  
  return true;
}

/**
 * Get a publicly accessible URL for a file
 * @param bucket The bucket name
 * @param path The file path within the bucket
 * @returns The public URL
 */
export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createPublicStorageClient();
  
  const { data } = supabase
    .storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

/**
 * List all files in a bucket/folder
 * @param bucket The bucket name
 * @param folder Optional folder path within the bucket
 * @returns Array of files or null if error
 */
export async function listFiles(bucket: string, folder: string = ''): Promise<any[] | null> {
  const supabase = createStorageClient();
  
  const { data, error } = await supabase
    .storage
    .from(bucket)
    .list(folder);
  
  if (error) {
    console.error(`Error listing files in ${bucket}/${folder}:`, error);
    return null;
  }
  
  return data;
} 