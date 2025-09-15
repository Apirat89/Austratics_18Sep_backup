'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { globalLoadingCoordinator } from './MapLoadingCoordinator';
// Import helper functions for Supabase Storage URLs
import { getMapDataUrl, getSupabaseUrl, mapFetchPath } from '../lib/supabaseStorage';

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
  return [
    ...getFlattenedHealthcareOptions(),
    ...getFlattenedDemographicsOptions(),
    ...getFlattenedEconomicOptions(),
    ...getFlattenedHealthStatsOptions()
  ];
};

export default function HeatmapDataService({ 
  selectedCategory,
  selectedSubcategory,
  dataType = 'healthcare', // Default to healthcare for backward compatibility
  onDataProcessed,
  onRankedDataCalculated,
  loadingComplete = false
}: HeatmapDataServiceProps) {
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
      // Use Supabase URL instead of local path
      const supabaseUrl = getMapDataUrl('Demographics_2023.json');
      console.log('🔍 HeatmapDataService: Loading demographics data from', supabaseUrl);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('demographics', 10);
      
      const response = await fetch(supabaseUrl);
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
      // Use Supabase URL instead of local path
      const supabaseUrl = getMapDataUrl('econ_stats.json');
      console.log('🔍 HeatmapDataService: Loading economic statistics data from', supabaseUrl);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('economics', 10);
      
      const response = await fetch(supabaseUrl);
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
      // Use Supabase URL instead of local path
      const supabaseUrl = getMapDataUrl('health_stats.json');
      console.log('🔍 HeatmapDataService: Loading health statistics data from', supabaseUrl);
      if (!shouldSkipCoordinator()) globalLoadingCoordinator.reportDataLoading('health-stats', 10);
      
      const response = await fetch(supabaseUrl);
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

  // Load data based on dataType when component mounts
  useEffect(() => {
    console.log(`🔍 HeatmapDataService: Loading ${dataType} data...`);
    if (dataType === 'healthcare') {
      loadDSSData();
    } else if (dataType === 'demographics') {
      loadDemographicsData();
    } else if (dataType === 'economics') {
      loadEconomicData();
    } else if (dataType === 'health-statistics') {
      loadHealthStatsData();
    }
  }, [dataType]);

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
        
        // Use Supabase URL instead of local path
        const supabaseUrl = getMapDataUrl('SA2.geojson');
        const response = await fetch(supabaseUrl);
        
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
    console.log('🔄 HeatmapDataService: Processing data change:', {
      selectedCategory,
      selectedSubcategory,
      dataType,
      hasData: (dataType === 'healthcare' && dssData.length > 0) || 
               (dataType === 'demographics' && demographicsData.length > 0) ||
               (dataType === 'economics' && economicStatsData.length > 0) ||
               (dataType === 'health-statistics' && healthStatsData.length > 0)
    });

    const hasDataForType = (dataType === 'healthcare' && dssData.length > 0) || 
                          (dataType === 'demographics' && demographicsData.length > 0) ||
                          (dataType === 'economics' && economicStatsData.length > 0) ||
                          (dataType === 'health-statistics' && healthStatsData.length > 0);

    if (selectedCategory && selectedSubcategory && hasDataForType) {
      console.log('✅ HeatmapDataService: Processing data...');
      
      // 🔧 FLICKERING FIX: Report to coordinator only once
      if (!shouldSkipCoordinator()) {
        console.log('📡 HeatmapDataService: Reporting to coordinator (first time only)');
        globalLoadingCoordinator.reportHeatmapRendering(10);
        setHasEverReportedToCoordinator(true);
      }
      
      const processedData = getProcessedData(selectedCategory, selectedSubcategory);
      const label = `${selectedCategory} - ${selectedSubcategory}`;
      
      if (!shouldSkipCoordinator()) {
        globalLoadingCoordinator.reportHeatmapRendering(50);
      }
      
      console.log('📊 HeatmapDataService: Calling onDataProcessed with', Object.keys(processedData).length, 'regions');
      
      // Call heatmap callback
      onDataProcessed(processedData, label);
      
      if (!shouldSkipCoordinator()) {
        globalLoadingCoordinator.reportHeatmapRendering(80);
      }
      
      // Calculate rankings if callback available
      if (onRankedDataCalculated) {
        console.log('📊 HeatmapDataService: Calculating ranked data...');
        const rankedData = calculateRankedData(processedData, label);
        onRankedDataCalculated(rankedData);
      }
      
      if (!shouldSkipCoordinator()) {
        globalLoadingCoordinator.reportHeatmapRendering(100);
      }
      
    } else {
      console.log('❌ HeatmapDataService: Clearing data - no selection or data unavailable');
      // Clear callbacks when no selection or data
      onDataProcessed(null, '');
      if (onRankedDataCalculated) {
        onRankedDataCalculated(null);
      }
    }
  }, [selectedCategory, selectedSubcategory, dataType, dssData, demographicsData, economicStatsData, healthStatsData, onDataProcessed, onRankedDataCalculated, hasEverReportedToCoordinator, getProcessedData, shouldSkipCoordinator, calculateRankedData]);

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
      {/* ✅ REMOVED: Black loading indicator that caused top-left flash (Option A) */}
      {/* Loading feedback is already provided by MapLoadingCoordinator */}

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