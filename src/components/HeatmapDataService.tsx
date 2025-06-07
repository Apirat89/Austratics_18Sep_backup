'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
        value: `${category}|||${subcategory}`,
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
        value: `${category}|||${subcategory}`,
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
        value: `${category}|||${subcategory}`,
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
        value: `${category}|||${subcategory}`,
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

export default function HeatmapDataService({ 
  selectedCategory,
  selectedSubcategory,
  dataType = 'healthcare', // Default to healthcare for backward compatibility
  onDataProcessed,
  onRankedDataCalculated
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

  // Load DSS healthcare data
  const loadDSSData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 HeatmapDataService: Loading DSS healthcare data from /DSS_Cleaned_2024.json');
      globalLoadingCoordinator.reportDataLoading('healthcare', 10);
      
      const response = await fetch('/DSS_Cleaned_2024.json');
      console.log('📡 HeatmapDataService: Response status:', response.status);
      globalLoadingCoordinator.reportDataLoading('healthcare', 60);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ HeatmapDataService: DSS healthcare data loaded successfully:', data.length, 'records');
      console.log('✅ HeatmapDataService: Sample DSS record:', data[0]);
      
      setDssData(data);
      globalLoadingCoordinator.reportDataLoading('healthcare', 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ HeatmapDataService: Error loading DSS healthcare data:', errorMessage);
      setError(`Failed to load DSS healthcare data: ${errorMessage}`);
      globalLoadingCoordinator.reportDataLoading('healthcare', 100);
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
      globalLoadingCoordinator.reportDataLoading('demographics', 10);
      
      const response = await fetch('/Maps_ABS_CSV/Demographics_2023.json');
      console.log('📡 HeatmapDataService: Response status:', response.status);
      globalLoadingCoordinator.reportDataLoading('demographics', 60);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ HeatmapDataService: Demographics data loaded successfully:', data.length, 'records');
      console.log('✅ HeatmapDataService: Sample demographics record:', data[0]);
      
      setDemographicsData(data);
      globalLoadingCoordinator.reportDataLoading('demographics', 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ HeatmapDataService: Error loading demographics data:', errorMessage);
      setError(`Failed to load demographics data: ${errorMessage}`);
      globalLoadingCoordinator.reportDataLoading('demographics', 100);
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
      globalLoadingCoordinator.reportDataLoading('economics', 10);
      
      const response = await fetch('/Maps_ABS_CSV/econ_stats.json');
      console.log('📡 HeatmapDataService: Response status:', response.status);
      globalLoadingCoordinator.reportDataLoading('economics', 60);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ HeatmapDataService: Economic statistics data loaded successfully:', data.length, 'records');
      console.log('✅ HeatmapDataService: Sample economic statistics record:', data[0]);
      
      setEconomicStatsData(data);
      globalLoadingCoordinator.reportDataLoading('economics', 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ HeatmapDataService: Error loading economic statistics data:', errorMessage);
      setError(`Failed to load economic statistics data: ${errorMessage}`);
      globalLoadingCoordinator.reportDataLoading('economics', 100);
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
      globalLoadingCoordinator.reportDataLoading('health-stats', 10);
      
      const response = await fetch('/Maps_ABS_CSV/health_stats.json');
      console.log('📡 HeatmapDataService: Response status:', response.status);
      globalLoadingCoordinator.reportDataLoading('health-stats', 60);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ HeatmapDataService: Health statistics data loaded successfully:', data.length, 'records');
      console.log('✅ HeatmapDataService: Sample health statistics record:', data[0]);
      
      setHealthStatsData(data);
      globalLoadingCoordinator.reportDataLoading('health-stats', 100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ HeatmapDataService: Error loading health statistics data:', errorMessage);
      setError(`Failed to load health statistics data: ${errorMessage}`);
      globalLoadingCoordinator.reportDataLoading('health-stats', 100);
    } finally {
      setLoading(false);
    }
  };

  // Process healthcare data for selected category and subcategory
  const processHealthcareData = useCallback((category: string, subcategory: string): SA2HeatmapData => {
    console.log('🔄 HeatmapDataService: Processing healthcare data for:', category, '-', subcategory);
    
    const filteredData = dssData.filter(item => 
      item.Type === category && item.Category === subcategory
    );
    
    console.log('📊 HeatmapDataService: Filtered healthcare data:', filteredData.length, 'records');
    
    const result: SA2HeatmapData = {};
    filteredData.forEach(item => {
      if (item['SA2 ID'] && item.Amount) {
        // Clean the amount string and convert to number
        const cleanAmount = typeof item.Amount === 'string' 
          ? parseFloat(item.Amount.replace(/[,\s]/g, ''))
          : item.Amount;
        
        if (!isNaN(cleanAmount)) {
          result[item['SA2 ID']] = cleanAmount;
        }
      }
    });
    
    console.log('✅ HeatmapDataService: Processed healthcare SA2 data:', Object.keys(result).length, 'regions with data');
    return result;
  }, [dssData]);

  // Process demographics data for selected category and subcategory  
  const processDemographicsData = useCallback((category: string, subcategory: string): SA2HeatmapData => {
    console.log('🔄 HeatmapDataService: Processing demographics data for:', category, '-', subcategory);
    
    const filteredData = demographicsData.filter(item => 
      item.Description === subcategory
    );
    
    console.log('📊 HeatmapDataService: Filtered demographics data:', filteredData.length, 'records');
    
    const result: SA2HeatmapData = {};
    filteredData.forEach(item => {
      if (item['SA2 ID'] && item.Amount !== undefined && item.Amount !== null) {
        const sa2Id = item['SA2 ID'].toString(); // Convert number to string for consistency
        result[sa2Id] = item.Amount;
      }
    });
    
    console.log('✅ HeatmapDataService: Processed demographics SA2 data:', Object.keys(result).length, 'regions with data');
    return result;
  }, [demographicsData]);

  // Process economic statistics data for selected category and subcategory
  const processEconomicData = useCallback((category: string, subcategory: string): SA2HeatmapData => {
    console.log('🔄 HeatmapDataService: Processing economic statistics data for:', category, '-', subcategory);
    
    const filteredData = economicStatsData.filter(item => 
      item.Description === subcategory
    );
    
    console.log('📊 HeatmapDataService: Filtered economic statistics data:', filteredData.length, 'records');
    
    const result: SA2HeatmapData = {};
    filteredData.forEach(item => {
      if (item['SA2 ID'] && item.Amount !== undefined && item.Amount !== null) {
        const sa2Id = item['SA2 ID'].toString(); // Convert number to string for consistency
        result[sa2Id] = item.Amount;
      }
    });
    
    console.log('✅ HeatmapDataService: Processed economic statistics SA2 data:', Object.keys(result).length, 'regions with data');
    return result;
  }, [economicStatsData]);

  // Process health statistics data for selected category and subcategory
  const processHealthStatsData = useCallback((category: string, subcategory: string): SA2HeatmapData => {
    console.log('🔄 HeatmapDataService: Processing health statistics data for:', category, '-', subcategory);
    
    const filteredData = healthStatsData.filter(item => 
      item.Description === subcategory
    );
    
    console.log('📊 HeatmapDataService: Filtered health statistics data:', filteredData.length, 'records');
    
    const result: SA2HeatmapData = {};
    filteredData.forEach(item => {
      if (item['SA2 ID'] && item.Amount !== undefined && item.Amount !== null) {
        const sa2Id = item['SA2 ID'].toString(); // Convert number to string for consistency
        result[sa2Id] = item.Amount;
      }
    });
    
    console.log('✅ HeatmapDataService: Processed health statistics SA2 data:', Object.keys(result).length, 'regions with data');
    return result;
  }, [healthStatsData]);

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
    globalLoadingCoordinator.reportDataProcessing(10);
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
      
      globalLoadingCoordinator.reportDataProcessing(30);
      
      // Process each option and cache the result
      for (let i = 0; i < allOptions.length; i++) {
        const option = allOptions[i];
        const cacheKey = `${dataType}-${option.category}-${option.subcategory}`;
        const processedData = processData(option.category, option.subcategory, dataType);
        preloadedData[cacheKey] = processedData;
        
        // Report progress during processing
        const progress = 30 + Math.floor((i / allOptions.length) * 60);
        globalLoadingCoordinator.reportDataProcessing(progress);
      }
      
      setPreloadedHeatmapData(preloadedData);
      globalLoadingCoordinator.reportDataProcessing(100);
      
      const loadTime = (Date.now() - startTime) / 1000;
      console.log(`⚡ HeatmapDataService: Preloaded ${allOptions.length} ${dataType} variables in ${loadTime.toFixed(1)}s`);
      console.log('🎯 HeatmapDataService: Preload cache keys:', Object.keys(preloadedData));
      
    } catch (err) {
      console.error(`❌ HeatmapDataService: Error during ${dataType} heatmap preloading:`, err);
      globalLoadingCoordinator.reportDataProcessing(100);
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
    globalLoadingCoordinator.reportNameMapping(10);
    setLoadingSA2Names(true);
    setSa2NameError(null);

    try {
      // Check cache first
      let geojsonData = boundaryDataCache.current.get('sa2-names');
      
      if (geojsonData) {
        console.log('📦 HeatmapDataService: Using cached SA2 boundary data for names');
        globalLoadingCoordinator.reportNameMapping(60);
      } else {
        console.log('📡 HeatmapDataService: Fetching SA2.geojson for name lookup...');
        const startTime = Date.now();
        
        const response = await fetch('/maps/SA2.geojson');
        if (!response.ok) {
          throw new Error(`Failed to load SA2 boundaries: ${response.status} ${response.statusText}`);
        }
        globalLoadingCoordinator.reportNameMapping(40);
        
        geojsonData = await response.json();
        boundaryDataCache.current.set('sa2-names', geojsonData);
        globalLoadingCoordinator.reportNameMapping(60);
        
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
      globalLoadingCoordinator.reportNameMapping(90);
      
      console.log(`✅ HeatmapDataService: Extracted ${Object.keys(nameMapping).length} SA2 name mappings`);
      console.log('🎯 HeatmapDataService: Sample SA2 name mapping:', Object.entries(nameMapping).slice(0, 3));
      
      setSa2NameCache(nameMapping);
      globalLoadingCoordinator.reportNameMapping(100);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ HeatmapDataService: Error loading SA2 names:', errorMessage);
      setSa2NameError(`Failed to load SA2 names: ${errorMessage}`);
      globalLoadingCoordinator.reportNameMapping(100);
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
    console.log('🔄 HeatmapDataService: useEffect triggered:', {
      selectedCategory,
      selectedSubcategory,
      dataType,
      dssDataLength: dssData.length,
      demographicsDataLength: demographicsData.length,
      economicStatsDataLength: economicStatsData.length,
      healthStatsDataLength: healthStatsData.length,
      hasOnDataProcessed: !!onDataProcessed,
      hasOnRankedDataCalculated: !!onRankedDataCalculated
    });

    const hasDataForType = (dataType === 'healthcare' && dssData.length > 0) || 
                          (dataType === 'demographics' && demographicsData.length > 0) ||
                          (dataType === 'economics' && economicStatsData.length > 0) ||
                          (dataType === 'health-statistics' && healthStatsData.length > 0);

    if (selectedCategory && selectedSubcategory && hasDataForType) {
      console.log('✅ HeatmapDataService: All conditions met, processing data...');
      globalLoadingCoordinator.reportHeatmapRendering(10);
      
      const processedData = getProcessedData(selectedCategory, selectedSubcategory);
      const label = `${selectedCategory} - ${selectedSubcategory}`;
      globalLoadingCoordinator.reportHeatmapRendering(50);
      
      console.log('📊 HeatmapDataService: About to call onDataProcessed with:', {
        dataKeys: Object.keys(processedData).length,
        label,
        sampleData: Object.entries(processedData).slice(0, 3)
      });
      
      // Call existing heatmap callback
      onDataProcessed(processedData, label);
      globalLoadingCoordinator.reportHeatmapRendering(80);
      
      // Calculate and call ranking callback if available
      if (onRankedDataCalculated) {
        console.log('📊 HeatmapDataService: Calculating ranked data...');
        const rankedData = calculateRankedData(processedData, label);
        console.log('📊 HeatmapDataService: About to call onRankedDataCalculated with:', rankedData);
        onRankedDataCalculated(rankedData);
      }
      globalLoadingCoordinator.reportHeatmapRendering(100);
    } else {
      console.log('❌ HeatmapDataService: Conditions not met, clearing data:', {
        selectedCategory,
        selectedSubcategory,
        dataType,
        dssDataLength: dssData.length,
        demographicsDataLength: demographicsData.length,
        economicStatsDataLength: economicStatsData.length,
        healthStatsDataLength: healthStatsData.length
      });
      // Clear both callbacks when no selection
      onDataProcessed(null, '');
      if (onRankedDataCalculated) {
        onRankedDataCalculated(null);
      }
    }
  }, [selectedCategory, selectedSubcategory, dataType, dssData, demographicsData, economicStatsData, healthStatsData, onDataProcessed, onRankedDataCalculated]);

  // Combined loading state for user feedback
  const isPreloading = loading || loadingSA2Names || preloadingHeatmaps;
  const preloadStatus = loading ? `Loading ${dataType} data...` : 
                       loadingSA2Names ? 'Loading region names...' : 
                       preloadingHeatmaps ? `Preloading ${dataType} heatmap data...` : 
                       'Ready';

  // Return loading/error state
  return (
    <>
      {/* Loading Status */}
      {isPreloading && (
        <div className="absolute top-4 left-4 bg-blue-50 border border-blue-200 rounded-lg p-3 z-20">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-700">{preloadStatus}</span>
          </div>
        </div>
      )}

      {/* Error Status */}
      {(error || sa2NameError) && (
        <div className="absolute top-4 left-4 bg-red-50 border border-red-200 rounded-lg p-3 z-20 max-w-xs">
          <h4 className="text-sm font-medium text-red-900">Data Loading Error</h4>
          <p className="text-sm text-red-700 mt-1">
            {error || sa2NameError}
          </p>
          <button
            onClick={() => {
              if (error) {
                setError(null);
                loadDSSData();
              }
              if (sa2NameError) {
                setSa2NameError(null);
                loadSA2Names();
              }
            }}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}
    </>
  );
} 