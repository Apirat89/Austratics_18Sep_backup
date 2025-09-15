/**
 * Supabase Storage Server Utilities
 * 
 * SERVER-ONLY functions for interacting with Supabase Storage and local filesystem.
 * This file uses Node.js-only modules like 'fs/promises' and should only be imported
 * in server components or API routes.
 */

import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { SA2DataMap, SA2Record } from './supabaseStorage';

// Initialize Supabase client for server-side operations
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Get JSON from Supabase Storage with server-side authentication
export async function getJsonFromStorage<T>(bucket: string, path: string): Promise<T | null> {
  const supabase = createServerClient();
  
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    
    if (error) {
      console.error(`Error downloading file ${path} from ${bucket}:`, error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    const text = await data.text();
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(`Error parsing JSON file ${path} from ${bucket}:`, error);
    return null;
  }
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