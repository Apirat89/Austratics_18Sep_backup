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
let cachedMedians: { [key: string]: number } | null = null;

// Interface for the merged comprehensive file
interface MergedSA2File {
  regions: Array<{
    id: string;
    name: string;
    metrics: { [key: string]: number };
  }>;
  metadata: {
    totalRegions: number;
    totalMetrics: number;
    medians: { [key: string]: number };
    generatedAt: string;
    [key: string]: any;
  };
}

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
 * Loads pre-merged SA2 data from the comprehensive merged file
 * 
 * **Optimized Approach:**
 * Instead of loading and merging 4 separate files (14MB total), we load a single
 * pre-merged file (5.4MB) with all 2,456 regions and 34 metrics, including
 * pre-calculated medians for optimal performance.
 * 
 * **Format Choice: Wide Object**
 * We use wide format ({ [sa2Id]: { sa2Name, ...metrics } }) because:
 * - More efficient for chart lookups (access multiple metrics for same SA2)
 * - Better performance in ECharts and visualization libraries
 * - Easier to work with in React components
 * - Can easily convert to long format if needed via `convertToLongFormat()`
 */
export async function getMergedSA2Data(): Promise<SA2DataWide> {
  // Return cached data if available (memoization)
  if (cachedData) {
    console.log('📊 Returning cached SA2 data');
    return cachedData;
  }

  console.log('📥 Loading pre-merged SA2 comprehensive dataset...');
  
  try {
    // Load the single merged file
    const filePath = path.join(process.cwd(), 'data', 'sa2', 'merged_sa2_data_comprehensive.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const mergedFile: MergedSA2File = JSON.parse(fileContent);
    
    console.log(`📊 Processing merged data: ${mergedFile.metadata.totalRegions} regions, ${mergedFile.metadata.totalMetrics} metrics`);
    
    // Convert to wide format expected by the rest of the system
    const mergedData: SA2DataWide = {};
    
    mergedFile.regions.forEach(region => {
      const sa2Id = normalizeSA2Id(region.id);
      const sa2Name = normalizeSA2Name(region.name);
      
      // Convert metrics to expected format (with proper prefixes)
      const metrics: SA2Wide = { sa2Name };
      
      Object.entries(region.metrics).forEach(([metricKey, value]) => {
        // Convert from "Demographics_Metric" to "Demographics | Metric" format
        const formattedKey = metricKey.replace(/_(.*)/, ' | $1');
        metrics[formattedKey] = value;
      });
      
      mergedData[sa2Id] = metrics;
    });
    
    // Cache the processed data and medians
    cachedData = mergedData;
    cachedMedians = mergedFile.metadata.medians;
    
    const regionCount = Object.keys(mergedData).length;
    const metricsSet = new Set<string>();
    Object.values(mergedData).forEach(region => {
      Object.keys(region).forEach(key => {
        if (key !== 'sa2Name') metricsSet.add(key);
      });
    });

    console.log(`✅ SA2 data loaded successfully: ${regionCount} regions, ${metricsSet.size} unique metrics`);
    console.log(`📊 Medians available for ${Object.keys(mergedFile.metadata.medians || {}).length} metrics`);
    
    return mergedData;

  } catch (error) {
    console.error('❌ Error loading merged SA2 data:', error);
    console.log('🔄 Falling back to legacy loading method...');
    
    // Fallback to the old method if merged file doesn't exist
    return await getMergedSA2DataLegacy();
  }
}

/**
 * Legacy method: Merges all SA2 datasets from individual files (fallback only)
 * This method is kept as a fallback in case the merged file is missing
 */
async function getMergedSA2DataLegacy(): Promise<SA2DataWide> {
  console.log('📥 Loading and merging SA2 datasets (legacy method)...');
  
  // Use Map for efficient merging
  const mergedMap = new Map<string, SA2Wide>();
  
  try {
    // 1. Load Demographics data
    console.log('📊 Processing Demographics_2023_comprehensive.json...');
    const demographicsData = await readDataFile<RawDemographicsRow>('Demographics_2023_comprehensive.json');
    
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
    console.log('📊 Processing econ_stats_comprehensive.json...');
    const economicsData = await readDataFile<RawEconHealthRow>('econ_stats_comprehensive.json');
    
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
    console.log('📊 Processing health_stats_comprehensive.json...');
    const healthData = await readDataFile<RawEconHealthRow>('health_stats_comprehensive.json');
    
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
    console.log('📊 Processing DSS_Cleaned_2024_comprehensive.json...');
    const dssData = await readDataFile<RawDSSRow>('DSS_Cleaned_2024_comprehensive.json');
    
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
 * Helper function: Get pre-calculated medians for all metrics
 */
export async function getMetricMedians(): Promise<{ [key: string]: number }> {
  if (cachedMedians) {
    return cachedMedians;
  }
  
  // Trigger loading of the merged data which will populate cachedMedians
  await getMergedSA2Data();
  
  return cachedMedians || {};
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