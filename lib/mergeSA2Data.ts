import fs from 'fs/promises';
import path from 'path';

/**
 * SA2 Data Merging Utility
 * 
 * Combines four long-format JSON datasets (Demographics_2023.json, econ_stats.json, 
 * health_stats.json, DSS_Cleaned_2024.json) into a unified wide-format object using 
 * SA2 ID as the unique key.
 * 
 * **Usage Examples:**
 * 
 * // In Next.js getStaticProps:
 * import { getMergedSA2Data, getSA2Row } from '@/lib/mergeSA2Data';
 * export async function getStaticProps() {
 *   const data = await getMergedSA2Data();
 *   return { props: { sa2Data: data } };
 * }
 * 
 * // In client-side code:
 * const response = await fetch('/api/sa2');
 * const sa2Data = await response.json();
 * 
 * // Access specific SA2 area:
 * const region = getSA2Row('101021007');
 * const income = region?.['Economics | Median Income'] || 0;
 */

// Type definitions
export interface SA2Row {
  sa2Id: string;
  sa2Name: string;
  dataset: string;
  metric: string;
  value: number;
}

export interface SA2Wide {
  sa2Name: string;
  [metricKey: string]: string | number; // sa2Name is string, metrics are numbers
}

export type SA2DataWide = {
  [sa2Id: string]: SA2Wide;
};

export type SA2DataLong = SA2Row[];

// Raw data interfaces for type safety
interface RawDemographicsRow {
  'SA2 ID': string | number;
  'SA2 Name': string;
  'Description': string;
  'Amount': string | number;
  [key: string]: any;
}

interface RawEconHealthRow {
  'SA2 ID': string | number;
  'SA2 Name': string;
  'Parent Description': string;
  'Description': string;
  'Amount': string | number;
  [key: string]: any;
}

interface RawDSSRow {
  'SA2 ID': string | number;
  'SA2 Name': string;
  'Category': string;
  'Type': string;
  'Amount': string | number;
  [key: string]: any;
}

// Module-level cache for memoization
let cachedData: SA2DataWide | null = null;
let cachedMetrics: string[] | null = null;

/**
 * Normalizes SA2 ID to 9-digit zero-padded string (ABS convention)
 */
function normalizeSA2Id(id: string | number): string {
  return String(id).padStart(9, '0');
}

/**
 * Normalizes SA2 Name by trimming whitespace
 */
function normalizeSA2Name(name: string): string {
  return String(name).trim();
}

/**
 * Cleans numeric fields by removing commas, spaces and converting to number
 */
function cleanNumericValue(value: string | number): number {
  if (typeof value === 'number') return value;
  
  const cleaned = String(value)
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Generates metric key for Demographics data
 */
function getDemographicsMetricKey(row: RawDemographicsRow): string {
  return `Demographics | ${row.Description}`;
}

/**
 * Generates metric key for Economics/Health data  
 */
function getEconHealthMetricKey(row: RawEconHealthRow): string {
  return `${row['Parent Description']} | ${row.Description}`;
}

/**
 * Generates metric key for DSS data
 */
function getDSSMetricKey(row: RawDSSRow): string {
  return `${row.Category} | ${row.Type}`;
}

/**
 * Reads and parses a JSON file from the data directory
 */
async function readDataFile<T>(filename: string): Promise<T[]> {
  try {
    const filePath = path.join(process.cwd(), 'data', 'sa2', filename);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.warn(`⚠️ Failed to read ${filename}:`, error);
    return [];
  }
}

/**
 * Merges all SA2 datasets into a unified wide-format object
 * 
 * **Format Choice: Wide Object**
 * We use wide format ({ [sa2Id]: { sa2Name, ...metrics } }) because:
 * - More efficient for chart lookups (access multiple metrics for same SA2)
 * - Better performance in ECharts and visualization libraries
 * - Easier to work with in React components
 * - Can easily convert to long format if needed via `convertToLongFormat()`
 * 
 * **To switch to long format:** Change return type and use `convertToLongFormat(mergedData)`
 */
export async function getMergedSA2Data(): Promise<SA2DataWide> {
  // Return cached data if available (memoization)
  if (cachedData) {
    console.log('📊 Returning cached SA2 data');
    return cachedData;
  }

  console.log('📥 Loading and merging SA2 datasets...');
  
  // Use Map for efficient merging
  const mergedMap = new Map<string, SA2Wide>();
  
  try {
    // 1. Load Demographics data
    console.log('📊 Processing Demographics_2023.json...');
    const demographicsData = await readDataFile<RawDemographicsRow>('Demographics_2023.json');
    
    demographicsData.forEach(row => {
      const sa2Id = normalizeSA2Id(row['SA2 ID']);
      const sa2Name = normalizeSA2Name(row['SA2 Name']);
      const metricKey = getDemographicsMetricKey(row);
      const value = cleanNumericValue(row.Amount);
      
      if (!mergedMap.has(sa2Id)) {
        mergedMap.set(sa2Id, { sa2Name });
      }
      
      const existing = mergedMap.get(sa2Id)!;
      if (existing[metricKey] !== undefined) {
        console.warn(`⚠️ Duplicate metric "${metricKey}" for SA2 ${sa2Id}, keeping latest`);
      }
      existing[metricKey] = value;
    });

    // 2. Load Economics data
    console.log('📊 Processing econ_stats.json...');
    const economicsData = await readDataFile<RawEconHealthRow>('econ_stats.json');
    
    economicsData.forEach(row => {
      const sa2Id = normalizeSA2Id(row['SA2 ID']);
      const sa2Name = normalizeSA2Name(row['SA2 Name']);
      const metricKey = getEconHealthMetricKey(row);
      const value = cleanNumericValue(row.Amount);
      
      if (!mergedMap.has(sa2Id)) {
        mergedMap.set(sa2Id, { sa2Name });
      }
      
      const existing = mergedMap.get(sa2Id)!;
      if (existing[metricKey] !== undefined) {
        console.warn(`⚠️ Duplicate metric "${metricKey}" for SA2 ${sa2Id}, keeping latest`);
      }
      existing[metricKey] = value;
    });

    // 3. Load Health Stats data
    console.log('📊 Processing health_stats.json...');
    const healthData = await readDataFile<RawEconHealthRow>('health_stats.json');
    
    healthData.forEach(row => {
      const sa2Id = normalizeSA2Id(row['SA2 ID']);
      const sa2Name = normalizeSA2Name(row['SA2 Name']);
      const metricKey = getEconHealthMetricKey(row);
      const value = cleanNumericValue(row.Amount);
      
      if (!mergedMap.has(sa2Id)) {
        mergedMap.set(sa2Id, { sa2Name });
      }
      
      const existing = mergedMap.get(sa2Id)!;
      if (existing[metricKey] !== undefined) {
        console.warn(`⚠️ Duplicate metric "${metricKey}" for SA2 ${sa2Id}, keeping latest`);
      }
      existing[metricKey] = value;
    });

    // 4. Load DSS data
    console.log('📊 Processing DSS_Cleaned_2024.json...');
    const dssData = await readDataFile<RawDSSRow>('DSS_Cleaned_2024.json');
    
    dssData.forEach(row => {
      const sa2Id = normalizeSA2Id(row['SA2 ID']);
      const sa2Name = normalizeSA2Name(row['SA2 Name']);
      const metricKey = getDSSMetricKey(row);
      const value = cleanNumericValue(row.Amount);
      
      if (!mergedMap.has(sa2Id)) {
        mergedMap.set(sa2Id, { sa2Name });
      }
      
      const existing = mergedMap.get(sa2Id)!;
      if (existing[metricKey] !== undefined) {
        console.warn(`⚠️ Duplicate metric "${metricKey}" for SA2 ${sa2Id}, keeping latest`);
      }
      existing[metricKey] = value;
    });

    // Convert Map to plain object
    const mergedData: SA2DataWide = {};
    mergedMap.forEach((value, key) => {
      mergedData[key] = value;
    });

    // Cache the result
    cachedData = mergedData;
    
    console.log(`✅ SA2 data merged successfully: ${Object.keys(mergedData).length} regions, ${getAllMetrics(mergedData).length} unique metrics`);
    
    // Production optimization: write to cache file
    if (process.env.NODE_ENV === 'production') {
      try {
        const cacheDir = path.join(process.cwd(), 'public', 'cache');
        await fs.mkdir(cacheDir, { recursive: true });
        await fs.writeFile(
          path.join(cacheDir, 'sa2_merged.json'),
          JSON.stringify(mergedData),
          'utf-8'
        );
        console.log('📁 Cached merged data to /public/cache/sa2_merged.json');
      } catch (error) {
        console.warn('⚠️ Failed to write cache file:', error);
      }
    }
    
    return mergedData;
    
  } catch (error) {
    console.error('❌ Failed to merge SA2 data:', error);
    throw error;
  }
}

/**
 * Extracts all unique metric keys from the merged data
 */
function getAllMetrics(data: SA2DataWide): string[] {
  const metricsSet = new Set<string>();
  
  Object.values(data).forEach(sa2 => {
    Object.keys(sa2).forEach(key => {
      if (key !== 'sa2Name') {
        metricsSet.add(key);
      }
    });
  });
  
  return Array.from(metricsSet).sort();
}

/**
 * Helper function: Get all available metric keys
 */
export async function listAllMetrics(): Promise<string[]> {
  if (cachedMetrics) {
    return cachedMetrics;
  }
  
  const data = await getMergedSA2Data();
  cachedMetrics = getAllMetrics(data);
  return cachedMetrics;
}

/**
 * Helper function: Get data for a specific SA2 area
 */
export async function getSA2Row(sa2Id: string): Promise<SA2Wide | null> {
  const data = await getMergedSA2Data();
  const normalizedId = normalizeSA2Id(sa2Id);
  return data[normalizedId] || null;
}

/**
 * Helper function: Get all SA2 IDs
 */
export async function listAllSA2Ids(): Promise<string[]> {
  const data = await getMergedSA2Data();
  return Object.keys(data).sort();
}

/**
 * Helper function: Convert wide format to long format if needed
 */
export function convertToLongFormat(wideData: SA2DataWide): SA2DataLong {
  const longData: SA2DataLong = [];
  
  Object.entries(wideData).forEach(([sa2Id, sa2Data]) => {
    Object.entries(sa2Data).forEach(([key, value]) => {
      if (key !== 'sa2Name' && typeof value === 'number') {
        // Parse dataset and metric from key
        const [dataset, ...metricParts] = key.split(' | ');
        const metric = metricParts.join(' | ');
        
        longData.push({
          sa2Id,
          sa2Name: sa2Data.sa2Name,
          dataset,
          metric,
          value
        });
      }
    });
  });
  
  return longData;
}

/**
 * Helper function: Get data for multiple SA2 areas
 */
export async function getMultipleSA2Rows(sa2Ids: string[]): Promise<(SA2Wide | null)[]> {
  const data = await getMergedSA2Data();
  return sa2Ids.map(id => {
    const normalizedId = normalizeSA2Id(id);
    return data[normalizedId] || null;
  });
}

/**
 * Helper function: Search SA2 areas by name (fuzzy search)
 */
export async function searchSA2ByName(query: string, limit = 10): Promise<Array<{ sa2Id: string; sa2Name: string }>> {
  const data = await getMergedSA2Data();
  const results: Array<{ sa2Id: string; sa2Name: string }> = [];
  
  const queryLower = query.toLowerCase();
  
  Object.entries(data).forEach(([sa2Id, sa2Data]) => {
    if (sa2Data.sa2Name.toLowerCase().includes(queryLower)) {
      results.push({ sa2Id, sa2Name: sa2Data.sa2Name });
    }
  });
  
  return results
    .sort((a, b) => a.sa2Name.localeCompare(b.sa2Name))
    .slice(0, limit);
}

/**
 * Clear cache (useful for testing)
 */
export function clearCache(): void {
  cachedData = null;
  cachedMetrics = null;
} 