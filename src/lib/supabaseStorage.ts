/**
 * Supabase Storage Data Loader
 * 
 * Handles loading SA2 data and other data files from Supabase Storage
 * with a fallback to local files when needed.
 */
import fs from 'fs/promises';
import path from 'path';
import { getJsonFromStorage } from './supabase-storage';
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

// SA2 Data Types
export interface SA2Record {
  sa2_name: string;
  [metricKey: string]: any;
}

export interface SA2DataMap {
  [sa2Id: string]: SA2Record;
}

// Cache for loaded data
let sa2DataCache: SA2DataMap | null = null;
let homecareProvidersCache: any[] | null = null;
let residentialProvidersCache: any[] | null = null;

/**
 * Load SA2 data from Supabase Storage or local file
 */
export async function loadSA2Data(): Promise<SA2DataMap> {
  // Return cached data if available
  if (sa2DataCache) {
    return sa2DataCache;
  }

  try {
    console.log('📥 Loading SA2 data...');
    
    // Try loading from Supabase Storage first
    const data = await getJsonFromStorage<any>('json_data', 'sa2/merged_sa2_data_with_postcodes.json');
    
    if (data && data.regions) {
      console.log('✅ Loaded SA2 data from Supabase Storage');
      
      // Process the data into the expected format
      const processedData: SA2DataMap = {};
      
      data.regions.forEach((region: any) => {
        const sa2Id = region.id.replace(/^0+/, ''); // Remove leading zeros
        
        processedData[sa2Id] = {
          sa2_name: region.name,
          ...region.metrics,
          sa2_median: region.medians || {},
          postcodes: region.postcodes || []
        };
      });
      
      // Cache and return
      sa2DataCache = processedData;
      return processedData;
    }
    
    // Fall back to local file
    console.log('⚠️ Falling back to local file for SA2 data');
    const filePath = path.join(process.cwd(), 'data', 'sa2', 'merged_sa2_data_with_postcodes.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const localData = JSON.parse(fileContent);
    
    // Process the data into the expected format
    const processedData: SA2DataMap = {};
    
    localData.regions.forEach((region: any) => {
      const sa2Id = region.id.replace(/^0+/, ''); // Remove leading zeros
      
      processedData[sa2Id] = {
        sa2_name: region.name,
        ...region.metrics,
        sa2_median: region.medians || {},
        postcodes: region.postcodes || []
      };
    });
    
    // Cache and return
    sa2DataCache = processedData;
    return processedData;
  } catch (error) {
    console.error('❌ Error loading SA2 data:', error);
    throw new Error('Failed to load SA2 data');
  }
}

/**
 * Load homecare providers data from Supabase Storage or local file
 */
export async function loadHomecareProviders(): Promise<any[]> {
  // Return cached data if available
  if (homecareProvidersCache) {
    return homecareProvidersCache;
  }

  try {
    console.log('📥 Loading homecare providers data...');
    
    // Try loading from Supabase Storage first
    const data = await getJsonFromStorage<any[]>('json_data', 'maps/merged_homecare_providers.json');
    
    if (data) {
      console.log('✅ Loaded homecare providers from Supabase Storage');
      homecareProvidersCache = data;
      return data;
    }
    
    // Fall back to local file
    console.log('⚠️ Falling back to local file for homecare providers');
    const filePath = path.join(process.cwd(), 'Maps_ABS_CSV', 'merged_homecare_providers.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const localData = JSON.parse(fileContent);
    
    homecareProvidersCache = localData;
    return localData;
  } catch (error) {
    console.error('❌ Error loading homecare providers:', error);
    throw new Error('Failed to load homecare providers data');
  }
}

/**
 * Load residential providers data from Supabase Storage or local file
 */
export async function loadResidentialProviders(): Promise<any[]> {
  // Return cached data if available
  if (residentialProvidersCache) {
    return residentialProvidersCache;
  }

  try {
    console.log('📥 Loading residential providers data...');
    
    // Try loading from Supabase Storage first
    const data = await getJsonFromStorage<any[]>('json_data', 'maps/Residential_May2025_ExcludeMPS_updated_with_finance.json');
    
    if (data) {
      console.log('✅ Loaded residential providers from Supabase Storage');
      residentialProvidersCache = data;
      return data;
    }
    
    // Fall back to local file
    console.log('⚠️ Falling back to local file for residential providers');
    const filePath = path.join(process.cwd(), 'public', 'maps', 'abs_csv', 'Residential_May2025_ExcludeMPS_updated_with_finance.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const localData = JSON.parse(fileContent);
    
    residentialProvidersCache = localData;
    return localData;
  } catch (error) {
    console.error('❌ Error loading residential providers:', error);
    throw new Error('Failed to load residential providers data');
  }
}

/**
 * Clear all data caches to force reloading from storage
 */
export function clearDataCaches(): void {
  sa2DataCache = null;
  homecareProvidersCache = null;
  residentialProvidersCache = null;
} 