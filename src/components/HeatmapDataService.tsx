'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { globalLoadingCoordinator } from './MapLoadingCoordinator';

// Define the structure of our DSS data (healthcare)
interface DSSData {
  'SA2 Name': string;
  'SA2 ID': string;
  'Category': string;
  'Type': string;
  'Amount': number | string;
}

// Define the structure of demographics data
interface DemographicsData {
  'SA2 Name': string;
  'SA2 ID': number;
  'Description': string;
  'Amount': number;
}

// Define the structure of economic statistics data
interface EconomicStatsData {
  'SA2 Name': string;
  'SA2 ID': number;
  'Parent Description': string;
  'Description': string;
  'Amount': number;
}

// Define the structure of health statistics data
interface HealthStatsData {
  'SA2 Name': string;
  'SA2 ID': number;
  'Parent Description': string;
  'Description': string;
  'Amount': number;
}

// Define the structure for processed SA2 data
export interface SA2HeatmapData {
  [sa2Id: string]: number;
}

// Define the structure for ranked SA2 data
export interface RankedSA2Data {
  topRegions: Array<{ sa2Id: string; sa2Name: string; value: number }>;
  bottomRegions: Array<{ sa2Id: string; sa2Name: string; value: number }>;
  totalRegions: number;
  selectedVariable: string;
}

// Props interface
interface HeatmapDataServiceProps {
  selectedCategory?: string;
  selectedSubcategory?: string;
  dataType?: 'healthcare' | 'demographics' | 'economics' | 'health-statistics'; // Extended data type selector
  onDataProcessed: (data: SA2HeatmapData | null, selectedOption: string) => void;
  onRankedDataCalculated?: (rankedData: RankedSA2Data | null) => void;
  loadingComplete?: boolean; // Loading completion state for flickering fix
}

// Define healthcare program types and their data categories (18 total options)
export const PROGRAM_TYPES = {
  'Commonwealth Home Support Program': [
    'Number of Participants',
    'Spending',
    'Number of Providers',
    'Participants per provider',
    'Spending per provider',
    'Spending per participant',
  ],
  'Home Care': [
    'Number of Participants',
    'Spending',
    'Number of Providers',
    'Participants per provider',
    'Spending per provider',
    'Spending per participant',
  ],
  'Residential Care': [
    'Number of Participants',
    'Spending',
    'Number of Providers',
    'Participants per provider',
    'Spending per provider',
    'Spending per participant',
  ],
};

// Define demographics categories (9 total options)
export const DEMOGRAPHICS_TYPES = {
  'Population': [
    'Estimated resident population (no.)',
    'Population density (persons/km2)'
  ],
  'Age Groups': [
    'Median age - persons (years)',
    'Persons - 55-64 years (%)',
    'Persons - 55-64 years (no.)',
    'Persons - 65 years and over (%)',
    'Persons - 65 years and over (no.)'
  ],
  'Working Age': [
    'Working age population (aged 15-64 years) (%)',
    'Working age population (aged 15-64 years) (no.)'
  ]
};

// Define economic statistics categories
export const ECONOMIC_TYPES = {
  'Employment': [
    '% of total Census responding population employed',
    'Unemployment rate (%)'
  ],
  'Income': [
    'Median employee income ($)',
    'Median superannuation and annuity income ($)'
  ],
  'Housing': [
    'Median price of attached dwelling transfers ($)',
    'Median weekly household rental payment ($)',
    'Owned outright (%)',
    'Owned outright (no.)'
  ],
  'Socio-Economic Index': [
    'SEIFA Index of relative socio-economic advantage and disadvantage (IRSAD) - rank within Australia (decile)',
    'SEIFA Index of relative socio-economic disadvantage (IRSD) - rank within Australia (decile)'
  ]
};

// Define health statistics categories
export const HEALTH_TYPES = {
  'Core Activity Need': [
    'Persons who have need for assistance with core activities (%)',
    'Persons who have need for assistance with core activities (no.)'
  ],
  'Household Composition': [
    'Lone person households (no.)',
    'Provided unpaid assistance (%)'
  ],
  'Health Conditions': [
    'Arthritis (%)',
    'Asthma (%)',
    'Cancer (including remission) (%)',
    'Dementia (including Alzheimer\'s) (%)',
    'Diabetes (excluding gestational diabetes) (%)',
    'Heart disease (including heart attack or angina) (%)',
    'Kidney disease (%)',
    'Lung condition (including COPD or emphysema) (%)',
    'Mental health condition (including depression or anxiety) (%)',
    'Stroke (%)',
    'Other long-term health condition(s) (%)',
    'No long-term health condition(s) (%)'
  ]
};

// Create flattened options list for healthcare
export const getFlattenedHealthcareOptions = () => {
  const options: Array<{ value: string; label: string; category: string; subcategory: string }> = [];
  
  Object.entries(PROGRAM_TYPES).forEach(([category, subcategories]) => {
    subcategories.forEach(subcategory => {
      options.push({
        value: `${category} | ${subcategory}`, // Use single pipe to match SA2 data format
        label: `${category} - ${subcategory}`,
        category,
        subcategory
      });
    });
  });
  
  return options;
};

// Create flattened options list for demographics
export const getFlattenedDemographicsOptions = () => {
  const options: Array<{ value: string; label: string; category: string; subcategory: string }> = [];
  
  Object.entries(DEMOGRAPHICS_TYPES).forEach(([category, subcategories]) => {
    subcategories.forEach(subcategory => {
      options.push({
        value: `Demographics | ${subcategory}`, // Match actual SA2 data format
        label: `${category} - ${subcategory}`,
        category,
        subcategory
      });
    });
  });
  
  return options;
};

// Create flattened options list for economic statistics
export const getFlattenedEconomicOptions = () => {
  const options: Array<{ value: string; label: string; category: string; subcategory: string }> = [];
  
  Object.entries(ECONOMIC_TYPES).forEach(([category, subcategories]) => {
    subcategories.forEach(subcategory => {
      options.push({
        value: `Economics | ${subcategory}`, // Match actual SA2 data format
        label: `${category} - ${subcategory}`,
        category,
        subcategory
      });
    });
  });
  
  return options;
};

// Create flattened options list for health statistics
export const getFlattenedHealthStatsOptions = () => {
  const options: Array<{ value: string; label: string; category: string; subcategory: string }> = [];
  
  Object.entries(HEALTH_TYPES).forEach(([category, subcategories]) => {
    subcategories.forEach(subcategory => {
      options.push({
        value: `Health | ${subcategory}`, // Match actual SA2 data format
        label: `${category} - ${subcategory}`,
        category,
        subcategory
      });
    });
  });
  
  return options;
};

// Legacy function for backward compatibility
export const getFlattenedOptions = () => {
  return getFlattenedHealthcareOptions();
};

// Module-level cache for SA2 API data and processed metrics
let cachedSA2Data: any = null;
let cachedProcessedMetrics: { [key: string]: SA2HeatmapData } = {};

/**
 * Unified data service that uses SA2 API instead of separate JSON files
 * Provides caching for both raw data and processed metric results
 */
class UnifiedSA2DataService {
  private static instance: UnifiedSA2DataService;
  private sa2Data: any = null;
  private processedCache: { [key: string]: SA2HeatmapData } = {};
  private loading = false;

  static getInstance(): UnifiedSA2DataService {
    if (!UnifiedSA2DataService.instance) {
      UnifiedSA2DataService.instance = new UnifiedSA2DataService();
    }
    return UnifiedSA2DataService.instance;
  }

  /**
   * Load SA2 data from API (cached)
   */
  async loadSA2Data(): Promise<any> {
    // Return cached data if available
    if (this.sa2Data) {
      console.log('⚡ UnifiedSA2DataService: Using cached SA2 data');
      return this.sa2Data;
    }

    // Prevent duplicate loading
    if (this.loading) {
      console.log('⏳ UnifiedSA2DataService: Already loading, waiting...');
      // Wait for loading to complete
      while (this.loading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.sa2Data;
    }

    console.log('📡 UnifiedSA2DataService: Loading SA2 data from API...');
    this.loading = true;

    try {
      const startTime = performance.now();
      const response = await fetch('/api/sa2');
      
      if (!response.ok) {
        throw new Error(`SA2 API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      this.sa2Data = result.data;
      
      const loadTime = performance.now() - startTime;
      console.log(`✅ UnifiedSA2DataService: SA2 data loaded in ${loadTime.toFixed(2)}ms`);
      console.log(`📊 UnifiedSA2DataService: ${Object.keys(this.sa2Data).length} regions loaded`);
      
      return this.sa2Data;
    } catch (error) {
      console.error('❌ UnifiedSA2DataService: Failed to load SA2 data:', error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Get processed metric data (cached)
   */
  async getProcessedMetric(metricKey: string): Promise<SA2HeatmapData> {
    // Check cache first
    if (this.processedCache[metricKey]) {
      console.log(`⚡ UnifiedSA2DataService: Using cached metric "${metricKey}"`);
      return this.processedCache[metricKey];
    }

    console.log(`🔄 UnifiedSA2DataService: Processing metric "${metricKey}"`);
    const processingStart = performance.now();

    // Ensure SA2 data is loaded
    const sa2Data = await this.loadSA2Data();
    
    // Process the metric
    const result: SA2HeatmapData = {};
    
    for (const [sa2Id, regionData] of Object.entries(sa2Data)) {
      const region = regionData as any;
      if (region[metricKey] !== undefined && region[metricKey] !== null) {
        result[sa2Id] = typeof region[metricKey] === 'number' 
          ? region[metricKey] 
          : parseFloat(String(region[metricKey])) || 0;
      }
    }

    // Cache the result
    this.processedCache[metricKey] = result;
    
    const processingTime = performance.now() - processingStart;
    console.log(`✅ UnifiedSA2DataService: Processed "${metricKey}" in ${processingTime.toFixed(2)}ms`);
    console.log(`📊 UnifiedSA2DataService: ${Object.keys(result).length} regions with data`);

    return result;
  }

  /**
   * Get available metrics from SA2 data
   */
  async getAvailableMetrics(): Promise<string[]> {
    const sa2Data = await this.loadSA2Data();
    
    // Get metrics from first region that has data
    for (const regionData of Object.values(sa2Data)) {
      const region = regionData as any;
      return Object.keys(region).filter(key => 
        key !== 'sa2Name' && 
        key !== 'postcode_data' &&
        typeof region[key] === 'number'
      );
    }
    
    return [];
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    console.log('🗑️ UnifiedSA2DataService: Clearing all caches');
    this.sa2Data = null;
    this.processedCache = {};
  }
}

export default function HeatmapDataService({ 
  selectedCategory,
  selectedSubcategory,
  dataType = 'healthcare', // Default to healthcare for backward compatibility
  onDataProcessed,
  onRankedDataCalculated,
  loadingComplete = false
}: HeatmapDataServiceProps) {
  // 🚀 PERFORMANCE OPTIMIZATION: Toggle between old and new data service
  const [useOptimizedService, setUseOptimizedService] = useState(false); // 🔧 FIX: Disabled by default until metric mapping is resolved
  const unifiedService = UnifiedSA2DataService.getInstance();

  const [dssData, setDssData] = useState<DSSData[]>([]);
  const [demographicsData, setDemographicsData] = useState<DemographicsData[]>([]);
  const [economicStatsData, setEconomicStatsData] = useState<EconomicStatsData[]>([]);
  const [healthStatsData, setHealthStatsData] = useState<HealthStatsData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // SA2 name cache for ranking display
  const [sa2NameCache, setSa2NameCache] = useState<{ [sa2Id: string]: string } | null>(null);
  const [loadingSA2Names, setLoadingSA2Names] = useState(false);
  const [sa2NameError, setSa2NameError] = useState<string | null>(null);
  
  // Preloaded heatmap data cache for faster access
  const [preloadedHeatmapData, setPreloadedHeatmapData] = useState<{ [key: string]: SA2HeatmapData }>({});
  const [preloadingHeatmaps, setPreloadingHeatmaps] = useState(false);

  // Cache for boundary data to avoid multiple 170MB loads
  const boundaryDataCache = useRef<Map<string, any>>(new Map());

  // 🔧 FLICKERING FIX: Local state flag to permanently prevent coordinator calls
  const [hasEverReportedToCoordinator, setHasEverReportedToCoordinator] = useState(false);

  // 🔧 FLICKERING FIX: Helper function to check if coordinator calls should be skipped
  const shouldSkipCoordinator = useCallback(() => {
    const skip = loadingComplete || 
                 hasEverReportedToCoordinator || 
                 globalLoadingCoordinator.isInitialLoadingComplete();
    if (skip) {
      console.log('⏭️  HeatmapDataService: Skipping coordinator call - already completed initial load');
    }
    return skip;
  }, [loadingComplete, hasEverReportedToCoordinator]);

  // 🚀 OPTIMIZED: Process data using SA2 API (new method)
  const processDataOptimized = useCallback(async (category: string, subcategory: string): Promise<SA2HeatmapData> => {
    console.log('🚀 HeatmapDataService: Using OPTIMIZED data processing');
    
    // Create metric key similar to existing format
    const metricKey = `${category} | ${subcategory}`;
    
    try {
      const result = await unifiedService.getProcessedMetric(metricKey);
      console.log(`✅ Optimized processing complete for "${metricKey}": ${Object.keys(result).length} regions`);
      return result;
    } catch (error) {
      console.error(`❌ Optimized processing failed for "${metricKey}":`, error);
      // Fallback to empty result
      return {};
    }
  }, [unifiedService]);

  // Load DSS healthcare data
  const loadDSSData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 HeatmapDataService: Loading DSS healthcare data from /DSS_Cleaned_2024.json');
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('healthcare', 10);
      
      const response = await fetch('/DSS_Cleaned_2024.json');
      console.log('📡 HeatmapDataService: Response status:', response.status);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('healthcare', 60);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ HeatmapDataService: DSS healthcare data loaded successfully:', data.length, 'records');
      console.log('✅ HeatmapDataService: Sample DSS record:', data[0]);
      
      setDssData(data);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('healthcare', 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ HeatmapDataService: Error loading DSS healthcare data:', errorMessage);
      setError(`Failed to load DSS healthcare data: ${errorMessage}`);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('healthcare', 100);
    } finally {
      setLoading(false);
    }
  };

  // Load Demographics data
  const loadDemographicsData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 HeatmapDataService: Loading demographics data from /Maps_ABS_CSV/Demographics_2023.json');
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('demographics', 10);
      
      const response = await fetch('/Maps_ABS_CSV/Demographics_2023.json');
      console.log('📡 HeatmapDataService: Response status:', response.status);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('demographics', 60);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ HeatmapDataService: Demographics data loaded successfully:', data.length, 'records');
      console.log('✅ HeatmapDataService: Sample demographics record:', data[0]);
      
      setDemographicsData(data);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('demographics', 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ HeatmapDataService: Error loading demographics data:', errorMessage);
      setError(`Failed to load demographics data: ${errorMessage}`);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('demographics', 100);
    } finally {
      setLoading(false);
    }
  };

  // Load Economic Statistics data
  const loadEconomicData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 HeatmapDataService: Loading economic statistics data from /Maps_ABS_CSV/econ_stats.json');
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('economics', 10);
      
      const response = await fetch('/Maps_ABS_CSV/econ_stats.json');
      console.log('📡 HeatmapDataService: Response status:', response.status);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('economics', 60);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ HeatmapDataService: Economic statistics data loaded successfully:', data.length, 'records');
      console.log('✅ HeatmapDataService: Sample economic statistics record:', data[0]);
      
      setEconomicStatsData(data);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('economics', 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ HeatmapDataService: Error loading economic statistics data:', errorMessage);
      setError(`Failed to load economic statistics data: ${errorMessage}`);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('economics', 100);
    } finally {
      setLoading(false);
    }
  };

  // Load Health Statistics data
  const loadHealthStatsData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 HeatmapDataService: Loading health statistics data from /Maps_ABS_CSV/health_stats.json');
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('health-stats', 10);
      
      const response = await fetch('/Maps_ABS_CSV/health_stats.json');
      console.log('📡 HeatmapDataService: Response status:', response.status);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('health-stats', 60);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ HeatmapDataService: Health statistics data loaded successfully:', data.length, 'records');
      console.log('✅ HeatmapDataService: Sample health statistics record:', data[0]);
      
      setHealthStatsData(data);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('health-stats', 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ HeatmapDataService: Error loading health statistics data:', errorMessage);
      setError(`Failed to load health statistics data: ${errorMessage}`);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('health-stats', 100);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 PERFORMANCE: Pre-built lookup table for healthcare data
  const healthcareIndex = useMemo(() => {
    console.log('⚡ Building healthcare index for fast lookup...');
    const index: { [key: string]: SA2HeatmapData } = {};
    
    dssData.forEach(item => {
      if (item.Type && item.Category && item['SA2 ID'] && item.Amount) {
        const key = `${item.Type}|${item.Category}`;
        
        if (!index[key]) {
          index[key] = {};
        }
        
        // Clean the amount string and convert to number once during indexing
        const cleanAmount = typeof item.Amount === 'string' 
          ? parseFloat(item.Amount.replace(/[,\s]/g, ''))
          : item.Amount;
        
        if (!isNaN(cleanAmount)) {
          index[key][item['SA2 ID']] = cleanAmount;
        }
      }
    });
    
    const indexKeys = Object.keys(index);
    console.log(`⚡ Healthcare index built: ${indexKeys.length} category combinations indexed`);
    console.log('🎯 Sample index keys:', indexKeys.slice(0, 5));
    
    return index;
  }, [dssData]);

  // Process healthcare data for selected category and subcategory (OPTIMIZED)
  const processHealthcareData = useCallback((category: string, subcategory: string): SA2HeatmapData => {
    console.log('🚀 HeatmapDataService: Fast lookup healthcare data for:', category, '-', subcategory);
    
    const lookupKey = `${category}|${subcategory}`;
    const result = healthcareIndex[lookupKey] || {};
    
    console.log(`⚡ HeatmapDataService: FAST healthcare lookup (${lookupKey}):`, Object.keys(result).length, 'regions with data');
    return result;
  }, [healthcareIndex]);

  // 🚀 PERFORMANCE: Pre-built lookup table for demographics data
  const demographicsIndex = useMemo(() => {
    console.log('⚡ Building demographics index for fast lookup...');
    const index: { [key: string]: SA2HeatmapData } = {};
    
    demographicsData.forEach(item => {
      if (item.Description && item['SA2 ID'] && item.Amount !== undefined && item.Amount !== null) {
        const key = item.Description;
        
        if (!index[key]) {
          index[key] = {};
        }
        
        const sa2Id = item['SA2 ID'].toString();
        index[key][sa2Id] = item.Amount;
      }
    });
    
    const indexKeys = Object.keys(index);
    console.log(`⚡ Demographics index built: ${indexKeys.length} descriptions indexed`);
    
    return index;
  }, [demographicsData]);

  // Process demographics data for selected category and subcategory (OPTIMIZED)
  const processDemographicsData = useCallback((category: string, subcategory: string): SA2HeatmapData => {
    console.log('🚀 HeatmapDataService: Fast lookup demographics data for:', category, '-', subcategory);
    
    const result = demographicsIndex[subcategory] || {};
    
    console.log(`⚡ HeatmapDataService: FAST demographics lookup (${subcategory}):`, Object.keys(result).length, 'regions with data');
    return result;
  }, [demographicsIndex]);

  // 🚀 PERFORMANCE: Pre-built lookup table for economic statistics data
  const economicIndex = useMemo(() => {
    console.log('⚡ Building economic statistics index for fast lookup...');
    const index: { [key: string]: SA2HeatmapData } = {};
    
    economicStatsData.forEach(item => {
      if (item.Description && item['SA2 ID'] && item.Amount !== undefined && item.Amount !== null) {
        const key = item.Description;
        
        if (!index[key]) {
          index[key] = {};
        }
        
        const sa2Id = item['SA2 ID'].toString();
        index[key][sa2Id] = item.Amount;
      }
    });
    
    const indexKeys = Object.keys(index);
    console.log(`⚡ Economic statistics index built: ${indexKeys.length} descriptions indexed`);
    
    return index;
  }, [economicStatsData]);

  // Process economic statistics data for selected category and subcategory (OPTIMIZED)
  const processEconomicData = useCallback((category: string, subcategory: string): SA2HeatmapData => {
    console.log('🚀 HeatmapDataService: Fast lookup economic statistics data for:', category, '-', subcategory);
    
    const result = economicIndex[subcategory] || {};
    
    console.log(`⚡ HeatmapDataService: FAST economic statistics lookup (${subcategory}):`, Object.keys(result).length, 'regions with data');
    return result;
  }, [economicIndex]);

  // 🚀 PERFORMANCE: Pre-built lookup table for health statistics data
  const healthStatsIndex = useMemo(() => {
    console.log('⚡ Building health statistics index for fast lookup...');
    const index: { [key: string]: SA2HeatmapData } = {};
    
    healthStatsData.forEach(item => {
      if (item.Description && item['SA2 ID'] && item.Amount !== undefined && item.Amount !== null) {
        const key = item.Description;
        
        if (!index[key]) {
          index[key] = {};
        }
        
        const sa2Id = item['SA2 ID'].toString();
        index[key][sa2Id] = item.Amount;
      }
    });
    
    const indexKeys = Object.keys(index);
    console.log(`⚡ Health statistics index built: ${indexKeys.length} descriptions indexed`);
    
    return index;
  }, [healthStatsData]);

  // Process health statistics data for selected category and subcategory (OPTIMIZED)
  const processHealthStatsData = useCallback((category: string, subcategory: string): SA2HeatmapData => {
    console.log('🚀 HeatmapDataService: Fast lookup health statistics data for:', category, '-', subcategory);
    
    const result = healthStatsIndex[subcategory] || {};
    
    console.log(`⚡ HeatmapDataService: FAST health statistics lookup (${subcategory}):`, Object.keys(result).length, 'regions with data');
    return result;
  }, [healthStatsIndex]);

  // Unified process data function that handles all data types
  const processData = useCallback((category: string, subcategory: string, type: 'healthcare' | 'demographics' | 'economics' | 'health-statistics' = dataType): SA2HeatmapData => {
    if (type === 'demographics') {
      return processDemographicsData(category, subcategory);
    } else if (type === 'economics') {
      return processEconomicData(category, subcategory);
    } else if (type === 'health-statistics') {
      return processHealthStatsData(category, subcategory);
    } else {
      return processHealthcareData(category, subcategory);
    }
  }, [dataType, processHealthcareData, processDemographicsData, processEconomicData, processHealthStatsData]);

  // Preload all variable combinations for faster access
  const preloadAllHeatmapData = useCallback(async () => {
    if ((dataType === 'healthcare' && dssData.length === 0) || 
        (dataType === 'demographics' && demographicsData.length === 0) || 
        (dataType === 'economics' && economicStatsData.length === 0) ||
        (dataType === 'health-statistics' && healthStatsData.length === 0) ||
        preloadingHeatmaps) return;

    console.log(`⚡ HeatmapDataService: Starting preload of all ${dataType} variable combinations...`);
    if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataProcessing(10);
    setPreloadingHeatmaps(true);

    try {
      const startTime = Date.now();
      const preloadedData: { [key: string]: SA2HeatmapData } = {};
      
      // Get all available options based on data type
      const allOptions = dataType === 'demographics' 
        ? getFlattenedDemographicsOptions()
        : dataType === 'economics'
        ? getFlattenedEconomicOptions()
        : dataType === 'health-statistics'
        ? getFlattenedHealthStatsOptions()
        : getFlattenedHealthcareOptions();
      
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataProcessing(30);
      
      // Process each option and cache the result
      for (let i = 0; i < allOptions.length; i++) {
        const option = allOptions[i];
        const cacheKey = `${dataType}-${option.category}-${option.subcategory}`;
        const processedData = processData(option.category, option.subcategory, dataType);
        preloadedData[cacheKey] = processedData;
        
        // Report progress during processing
        const progress = 30 + Math.floor((i / allOptions.length) * 60);
        if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataProcessing(progress);
      }
      
      setPreloadedHeatmapData(preloadedData);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataProcessing(100);
      
      const loadTime = (Date.now() - startTime) / 1000;
      console.log(`⚡ HeatmapDataService: Preloaded ${allOptions.length} ${dataType} variables in ${loadTime.toFixed(1)}s`);
      console.log('🎯 HeatmapDataService: Preload cache keys:', Object.keys(preloadedData));
      
    } catch (err) {
      console.error(`❌ HeatmapDataService: Error during ${dataType} heatmap preloading:`, err);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataProcessing(100);
    } finally {
      setPreloadingHeatmaps(false);
    }
  }, [dssData, demographicsData, dataType, preloadingHeatmaps]);

  // Get processed data from cache or process on demand
  const getProcessedData = useCallback((category: string, subcategory: string): SA2HeatmapData => {
    const cacheKey = `${dataType}-${category}-${subcategory}`;
    
    // Try to get from preloaded cache first
    if (preloadedHeatmapData[cacheKey]) {
      console.log(`⚡ HeatmapDataService: Using preloaded ${dataType} data for:`, category, '-', subcategory);
      return preloadedHeatmapData[cacheKey];
    }
    
    // If not in cache, process on demand
    console.log(`🔄 HeatmapDataService: Processing ${dataType} data on demand for:`, category, '-', subcategory);
    return processData(category, subcategory, dataType);
  }, [preloadedHeatmapData, dataType, processData]);

  // Load data on component mount based on data type
  useEffect(() => {
    // 🚀 OPTIMIZATION: Only load legacy data if not using optimized service
    if (!useOptimizedService) {
      console.log('🐌 HeatmapDataService: Loading legacy data for comparison');
      if (dataType === 'healthcare') {
        loadDSSData();
      } else if (dataType === 'demographics') {
        loadDemographicsData();
      } else if (dataType === 'economics') {
        loadEconomicData();
      } else if (dataType === 'health-statistics') {
        loadHealthStatsData();
      }
    } else {
      console.log('🚀 HeatmapDataService: Skipping legacy data loading (optimized service enabled)');
    }
  }, [dataType]); // Fixed: Remove useOptimizedService from dependency array

  // Separate effect for optimization service changes
  useEffect(() => {
    // 🚀 OPTIMIZATION: Reload data when switching between services
    console.log(`🔄 HeatmapDataService: Service mode changed to ${useOptimizedService ? 'OPTIMIZED' : 'LEGACY'}`);
    
    // Clear existing data when switching to optimized service
    if (useOptimizedService) {
      console.log('🚀 HeatmapDataService: Switched to optimized service, clearing legacy data');
      setDssData([]);
      setDemographicsData([]);
      setEconomicStatsData([]);
      setHealthStatsData([]);
    } else {
      console.log('🐌 HeatmapDataService: Switched to legacy service, loading data...');
      // Trigger data loading based on current dataType
      if (dataType === 'healthcare') {
        loadDSSData();
      } else if (dataType === 'demographics') {
        loadDemographicsData();
      } else if (dataType === 'economics') {
        loadEconomicData();
      } else if (dataType === 'health-statistics') {
        loadHealthStatsData();
      }
    }
  }, [useOptimizedService]); // Stable dependency array with only useOptimizedService

  // Load SA2 names from boundary data for ranking display
  const loadSA2Names = useCallback(async () => {
    if (sa2NameCache || loadingSA2Names) return; // Already loaded or loading

    console.log('🗺️ HeatmapDataService: Loading SA2 names for ranking...');
    if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportNameMapping(10);
    setLoadingSA2Names(true);
    setSa2NameError(null);

    try {
      // Check cache first
      let geojsonData = boundaryDataCache.current.get('sa2-names');
      
      if (geojsonData) {
        console.log('📦 HeatmapDataService: Using cached SA2 boundary data for names');
        if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportNameMapping(60);
      } else {
        console.log('📡 HeatmapDataService: Fetching SA2.geojson for name lookup...');
        const startTime = Date.now();
        
        const response = await fetch('/maps/SA2.geojson');
        if (!response.ok) {
          throw new Error(`Failed to load SA2 boundaries: ${response.status} ${response.statusText}`);
        }
        if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportNameMapping(40);
        
        geojsonData = await response.json();
        boundaryDataCache.current.set('sa2-names', geojsonData);
        if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportNameMapping(60);
        
        const loadTime = (Date.now() - startTime) / 1000;
        console.log(`✅ HeatmapDataService: SA2 boundaries loaded in ${loadTime.toFixed(1)}s for name extraction`);
      }

      // Extract SA2 ID -> Name mapping
      const nameMapping: { [sa2Id: string]: string } = {};
      
      if (geojsonData?.features) {
        geojsonData.features.forEach((feature: any) => {
          const props = feature.properties;
          const sa2Id = props?.sa2_code_2021;
          const sa2Name = props?.sa2_name_2021;
          
          if (sa2Id && sa2Name) {
            nameMapping[sa2Id] = sa2Name;
          }
        });
      }
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportNameMapping(90);
      
      console.log(`✅ HeatmapDataService: Extracted ${Object.keys(nameMapping).length} SA2 name mappings`);
      console.log('🎯 HeatmapDataService: Sample SA2 name mapping:', Object.entries(nameMapping).slice(0, 3));
      
      setSa2NameCache(nameMapping);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportNameMapping(100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ HeatmapDataService: Error loading SA2 names:', errorMessage);
      setSa2NameError(`Failed to load SA2 names: ${errorMessage}`);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportNameMapping(100);
    } finally {
      setLoadingSA2Names(false);
    }
  }, [sa2NameCache, loadingSA2Names]);

  // Load SA2 names when component mounts
  useEffect(() => {
    loadSA2Names();
  }, []);

  // Load and preload data when data becomes available
  useEffect(() => {
    if ((dataType === 'healthcare' && dssData.length > 0) || 
        (dataType === 'demographics' && demographicsData.length > 0) ||
        (dataType === 'economics' && economicStatsData.length > 0) ||
        (dataType === 'health-statistics' && healthStatsData.length > 0)) {
      console.log(`✅ HeatmapDataService: ${dataType} data loaded, starting preload operations...`);
      // Preload all heatmap data combinations
      preloadAllHeatmapData();
    }
  }, [dssData, demographicsData, economicStatsData, healthStatsData, dataType]);

  // Calculate ranked data from SA2 heatmap data
  const calculateRankedData = useCallback((
    heatmapData: SA2HeatmapData, 
    variableName: string
  ): RankedSA2Data | null => {
    if (!sa2NameCache) {
      console.log('⏳ HeatmapDataService: SA2 names not loaded yet, skipping ranking calculation');
      return null;
    }

    console.log('📊 HeatmapDataService: Calculating rankings for:', variableName);
    
    // Convert to array with names for sorting
    const regionsWithNames = Object.entries(heatmapData)
      .map(([sa2Id, value]) => ({
        sa2Id,
        sa2Name: sa2NameCache[sa2Id] || `Unknown Region`,
        value
      }))
      .filter(region => region.sa2Name !== 'Unknown Region'); // Only include regions with known names

    console.log(`🎯 HeatmapDataService: ${regionsWithNames.length}/${Object.keys(heatmapData).length} regions have name mappings`);

    // Sort by value (descending for top, ascending for bottom)
    const sortedByValue = [...regionsWithNames].sort((a, b) => b.value - a.value);
    
    // Get top 3 and bottom 3
    const topRegions = sortedByValue.slice(0, 3);
    const bottomRegions = sortedByValue.slice(-3).reverse(); // Reverse to show lowest first

    const rankedData: RankedSA2Data = {
      topRegions,
      bottomRegions,
      totalRegions: regionsWithNames.length,
      selectedVariable: variableName
    };

    console.log('✅ HeatmapDataService: Ranking calculation complete');
    console.log('🔝 Top 3 regions:', topRegions.map(r => `${r.sa2Name} (${r.sa2Id}): ${r.value.toLocaleString()}`));
    console.log('🔻 Bottom 3 regions:', bottomRegions.map(r => `${r.sa2Name} (${r.sa2Id}): ${r.value.toLocaleString()}`));

    return rankedData;
  }, [sa2NameCache]);

  // Process data when selection changes
  useEffect(() => {
    // 🎯 PERFORMANCE PROFILING: Add timing measurements
    const performanceStart = performance.now();
    
    console.log('🔄 HeatmapDataService: useEffect triggered:', {
      selectedCategory,
      selectedSubcategory,
      dataType,
      useOptimizedService, // 🚀 NEW: Log which service is being used
      dssDataLength: dssData.length,
      demographicsDataLength: demographicsData.length,
      economicStatsDataLength: economicStatsData.length,
      healthStatsDataLength: healthStatsData.length,
      hasOnDataProcessed: !!onDataProcessed,
      hasOnRankedDataCalculated: !!onRankedDataCalculated,
      loadingComplete,
      hasEverReportedToCoordinator,
      performanceStart: `${performanceStart}ms`
    });

    const hasDataForType = (dataType === 'healthcare' && dssData.length > 0) || 
                          (dataType === 'demographics' && demographicsData.length > 0) ||
                          (dataType === 'economics' && economicStatsData.length > 0) ||
                          (dataType === 'health-statistics' && healthStatsData.length > 0);

    if (selectedCategory && selectedSubcategory) {
      // 🚀 OPTIMIZED PATH: Use SA2 API service
      if (useOptimizedService) {
        console.log('🚀 HeatmapDataService: Using OPTIMIZED processing path');
        
        // 🎯 PERFORMANCE: Measure optimized processing time
        const processingStart = performance.now();
        
        // 🔧 FLICKERING FIX: Use centralized safety check for all coordinator calls
        if (!shouldSkipCoordinator()) {
          console.log('📡 HeatmapDataService: Reporting to coordinator (first time only)');
          globalLoadingCoordinator.reportHeatmapRendering(10);
          setHasEverReportedToCoordinator(true); // Set flag permanently
        }
        
        // Process data using optimized service
        processDataOptimized(selectedCategory, selectedSubcategory)
          .then(processedData => {
            const processingEnd = performance.now();
            const processingTime = processingEnd - processingStart;
            
            const label = `${selectedCategory} - ${selectedSubcategory}`;
            
            if (!shouldSkipCoordinator()) {
              globalLoadingCoordinator.reportHeatmapRendering(50);
            }
            
            console.log('📊 HeatmapDataService: About to call onDataProcessed with OPTIMIZED data:', {
              dataKeys: Object.keys(processedData).length,
              label,
              sampleData: Object.entries(processedData).slice(0, 3),
              processingTime: `${processingTime.toFixed(2)}ms`
            });
            
            // 🎯 PERFORMANCE: Measure callback execution time  
            const callbackStart = performance.now();
            
            // Call existing heatmap callback
            onDataProcessed(processedData, label);
            
            const callbackEnd = performance.now();
            const callbackTime = callbackEnd - callbackStart;
            
            if (!shouldSkipCoordinator()) {
              globalLoadingCoordinator.reportHeatmapRendering(80);
            }
            
            // Calculate and call ranking callback if available
            if (onRankedDataCalculated) {
              console.log('📊 HeatmapDataService: Calculating ranked data...');
              const rankingStart = performance.now();
              
              const rankedData = calculateRankedData(processedData, label);
              console.log('📊 HeatmapDataService: About to call onRankedDataCalculated with:', rankedData);
              onRankedDataCalculated(rankedData);
              
              const rankingEnd = performance.now();
              const rankingTime = rankingEnd - rankingStart;
              
              console.log(`⚡ PERFORMANCE: Ranking calculation took ${rankingTime.toFixed(2)}ms`);
            }
            
            if (!shouldSkipCoordinator()) {
              globalLoadingCoordinator.reportHeatmapRendering(100);
            }
            
            // 🎯 PERFORMANCE: Total time measurement
            const totalTime = performance.now() - performanceStart;
            console.log(`🚀 OPTIMIZED PERFORMANCE SUMMARY for "${label}":
              - Data Processing: ${processingTime.toFixed(2)}ms
              - Callback Execution: ${callbackTime.toFixed(2)}ms  
              - Total Time: ${totalTime.toFixed(2)}ms
              - Data Points: ${Object.keys(processedData).length}
              - Service: OPTIMIZED SA2 API
            `);
          })
          .catch(error => {
            console.error('❌ HeatmapDataService: Optimized processing failed:', error);
            // Clear data on error
            onDataProcessed(null, '');
            if (onRankedDataCalculated) {
              onRankedDataCalculated(null);
            }
          });
        
        return; // Early exit for optimized path
      }

      // 🐌 LEGACY PATH: Use existing JSON file processing
      if (hasDataForType) {
        console.log('🐌 HeatmapDataService: Using LEGACY processing path');
        console.log('✅ HeatmapDataService: All conditions met, processing data...');
        
        // 🎯 PERFORMANCE: Measure data processing time
        const processingStart = performance.now();
        
        // 🔧 FLICKERING FIX: Use centralized safety check for all coordinator calls
        if (!shouldSkipCoordinator()) {
          console.log('📡 HeatmapDataService: Reporting to coordinator (first time only)');
          globalLoadingCoordinator.reportHeatmapRendering(10);
          setHasEverReportedToCoordinator(true); // Set flag permanently
        }
        
        const processedData = getProcessedData(selectedCategory, selectedSubcategory);
        const processingEnd = performance.now();
        const processingTime = processingEnd - processingStart;
        
        const label = `${selectedCategory} - ${selectedSubcategory}`;
        
        if (!shouldSkipCoordinator()) {
          globalLoadingCoordinator.reportHeatmapRendering(50);
        }
        
        console.log('📊 HeatmapDataService: About to call onDataProcessed with LEGACY data:', {
          dataKeys: Object.keys(processedData).length,
          label,
          sampleData: Object.entries(processedData).slice(0, 3),
          processingTime: `${processingTime.toFixed(2)}ms`
        });
        
        // 🎯 PERFORMANCE: Measure callback execution time  
        const callbackStart = performance.now();
        
        // Call existing heatmap callback
        onDataProcessed(processedData, label);
        
        const callbackEnd = performance.now();
        const callbackTime = callbackEnd - callbackStart;
        
        if (!shouldSkipCoordinator()) {
          globalLoadingCoordinator.reportHeatmapRendering(80);
        }
        
        // Calculate and call ranking callback if available
        if (onRankedDataCalculated) {
          console.log('📊 HeatmapDataService: Calculating ranked data...');
          const rankingStart = performance.now();
          
          const rankedData = calculateRankedData(processedData, label);
          console.log('📊 HeatmapDataService: About to call onRankedDataCalculated with:', rankedData);
          onRankedDataCalculated(rankedData);
          
          const rankingEnd = performance.now();
          const rankingTime = rankingEnd - rankingStart;
          
          console.log(`⚡ PERFORMANCE: Ranking calculation took ${rankingTime.toFixed(2)}ms`);
        }
        
        if (!shouldSkipCoordinator()) {
          globalLoadingCoordinator.reportHeatmapRendering(100);
        }
        
        // 🎯 PERFORMANCE: Total time measurement
        const totalTime = performance.now() - performanceStart;
        console.log(`🐌 LEGACY PERFORMANCE SUMMARY for "${label}":
          - Data Processing: ${processingTime.toFixed(2)}ms
          - Callback Execution: ${callbackTime.toFixed(2)}ms  
          - Total Time: ${totalTime.toFixed(2)}ms
          - Data Points: ${Object.keys(processedData).length}
          - Service: LEGACY JSON Files
        `);
        
      } else {
        console.log('❌ HeatmapDataService: Conditions not met for legacy path, clearing data:', {
          selectedCategory,
          selectedSubcategory,
          dataType,
          hasDataForType,
          useOptimizedService
        });
        // Clear both callbacks when no selection
        onDataProcessed(null, '');
        if (onRankedDataCalculated) {
          onRankedDataCalculated(null);
        }
        
        // 🎯 PERFORMANCE: Log when no processing needed
        const totalTime = performance.now() - performanceStart;
        console.log(`⚡ PERFORMANCE: No legacy processing needed - ${totalTime.toFixed(2)}ms`);
      }
    } else {
      console.log('❌ HeatmapDataService: No category/subcategory selected, clearing data');
      // Clear both callbacks when no selection
      onDataProcessed(null, '');
      if (onRankedDataCalculated) {
        onRankedDataCalculated(null);
      }
      
      // 🎯 PERFORMANCE: Log when no processing needed
      const totalTime = performance.now() - performanceStart;
      console.log(`⚡ PERFORMANCE: No selection - ${totalTime.toFixed(2)}ms`);
    }
  }, [selectedCategory, selectedSubcategory, dataType, useOptimizedService, dssData, demographicsData, economicStatsData, healthStatsData, onDataProcessed, onRankedDataCalculated, loadingComplete, hasEverReportedToCoordinator, processDataOptimized, getProcessedData, shouldSkipCoordinator, calculateRankedData]);

  // Combined loading state for user feedback
  const isPreloading = loading || loadingSA2Names || preloadingHeatmaps;
  const preloadStatus = loading ? `Loading ${dataType} data...` : 
                       loadingSA2Names ? 'Loading region names...' : 
                       preloadingHeatmaps ? `Preloading ${dataType} heatmap data...` : 
                       'Ready';
  
  // Only show individual loading indicators during initial load (before loadingComplete)
  const shouldShowLoadingIndicators = isPreloading && !loadingComplete;
  
  // Debug logging - only log when there's a change
  if (isPreloading || loadingComplete) {
    console.log('🔍 HeatmapDataService Loading Debug:', {
      isPreloading,
      loadingComplete,
      shouldShowLoadingIndicators,
      preloadStatus,
      selectedCategory,
      selectedSubcategory
    });
  }

  return (
    <div>
      {/* 🚀 PERFORMANCE TESTING: A/B Toggle for Service Comparison */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontSize: '12px',
        zIndex: 1000,
        fontFamily: 'monospace'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={useOptimizedService}
            onChange={(e) => setUseOptimizedService(e.target.checked)}
          />
          <span>
            {useOptimizedService ? '🚀 OPTIMIZED' : '🐌 LEGACY'} Data Service
          </span>
        </label>
        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.7 }}>
          Compare performance in browser console
        </div>
      </div>

      {/* Loading indicators only during initial load */}
      {shouldShowLoadingIndicators && (
        <div className="fixed top-4 left-4 bg-black bg-opacity-75 text-white p-3 rounded-lg z-50">
          <div className="text-sm">Loading heatmap data...</div>
          <div className="text-xs text-gray-300 mt-1">{preloadStatus}</div>
        </div>
      )}

      {/* Error UI */}
      {error && (
        <div className="absolute top-4 left-4 bg-red-50 border border-red-200 rounded-lg p-3 z-20">
          <div className="text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* SA2 Name Loading Error UI */}
      {sa2NameError && (
        <div className="absolute top-20 left-4 bg-orange-50 border border-orange-200 rounded-lg p-3 z-20">
          <div className="text-sm text-orange-700">
            <strong>Warning:</strong> {sa2NameError}
          </div>
          <div className="text-xs text-orange-600 mt-1">Rankings will show region IDs instead of names</div>
        </div>
      )}
    </div>
  );
} 