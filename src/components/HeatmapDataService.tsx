'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Define the structure of our DSS data
interface DSSData {
  'SA2 Name': string;
  'SA2 ID': string;
  'Category': string;
  'Type': string;
  'Amount': number | string;
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
  onDataProcessed: (data: SA2HeatmapData | null, selectedOption: string) => void;
  onRankedDataCalculated?: (rankedData: RankedSA2Data | null) => void;
}

// Define program types and their data categories (18 total options)
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

// Create flattened options list for easy access
export const getFlattenedOptions = () => {
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

export default function HeatmapDataService({ 
  selectedCategory,
  selectedSubcategory,
  onDataProcessed,
  onRankedDataCalculated
}: HeatmapDataServiceProps) {
  const [dssData, setDssData] = useState<DSSData[]>([]);
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

  // Load DSS data
  const loadDSSData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 HeatmapDataService: Loading DSS data from /DSS_Cleaned_2024.json');
      
      const response = await fetch('/DSS_Cleaned_2024.json');
      console.log('📡 HeatmapDataService: Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ HeatmapDataService: DSS data loaded successfully:', data.length, 'records');
      console.log('✅ HeatmapDataService: Sample DSS record:', data[0]);
      
      setDssData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ HeatmapDataService: Error loading DSS data:', errorMessage);
      setError(`Failed to load DSS data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Process data for selected category and subcategory
  const processData = (category: string, subcategory: string): SA2HeatmapData => {
    console.log('🔄 HeatmapDataService: Processing data for:', category, '-', subcategory);
    
    const filteredData = dssData.filter(item => 
      item.Type === category && item.Category === subcategory
    );
    
    console.log('📊 HeatmapDataService: Filtered data:', filteredData.length, 'records');
    
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
    
    console.log('✅ HeatmapDataService: Processed SA2 data:', Object.keys(result).length, 'regions with data');
    console.log('🎯 HeatmapDataService: SA2 105021098 in result:', result['105021098'] || 'NOT FOUND');
    console.log('📋 HeatmapDataService: Sample processed data:', Object.entries(result).slice(0, 5));
    return result;
  };

  // Preload all healthcare variable combinations for faster access
  const preloadAllHeatmapData = useCallback(async () => {
    if (dssData.length === 0 || preloadingHeatmaps) return;

    console.log('⚡ HeatmapDataService: Starting preload of all healthcare variable combinations...');
    setPreloadingHeatmaps(true);

    try {
      const startTime = Date.now();
      const preloadedData: { [key: string]: SA2HeatmapData } = {};
      
      // Get all available options from the flattened list
      const allOptions = getFlattenedOptions();
      
      // Process each option and cache the result
      for (const option of allOptions) {
        const cacheKey = `${option.category}-${option.subcategory}`;
        const processedData = processData(option.category, option.subcategory);
        preloadedData[cacheKey] = processedData;
      }
      
      setPreloadedHeatmapData(preloadedData);
      
      const loadTime = (Date.now() - startTime) / 1000;
      console.log(`⚡ HeatmapDataService: Preloaded ${allOptions.length} healthcare variables in ${loadTime.toFixed(1)}s`);
      console.log('🎯 HeatmapDataService: Preload cache keys:', Object.keys(preloadedData));
      
    } catch (err) {
      console.error('❌ HeatmapDataService: Error during heatmap preloading:', err);
    } finally {
      setPreloadingHeatmaps(false);
    }
  }, [dssData, preloadingHeatmaps]);

  // Get processed data from cache or process on demand
  const getProcessedData = useCallback((category: string, subcategory: string): SA2HeatmapData => {
    const cacheKey = `${category}-${subcategory}`;
    
    // Try to get from preloaded cache first
    if (preloadedHeatmapData[cacheKey]) {
      console.log('⚡ HeatmapDataService: Using preloaded data for:', cacheKey);
      return preloadedHeatmapData[cacheKey];
    }
    
    // Fallback to processing on demand
    console.log('🔄 HeatmapDataService: Processing on demand for:', cacheKey);
    return processData(category, subcategory);
  }, [preloadedHeatmapData]);

  // Load data on component mount
  useEffect(() => {
    loadDSSData();
  }, []);

  // Load SA2 names from boundary data for ranking display
  const loadSA2Names = useCallback(async () => {
    if (sa2NameCache || loadingSA2Names) return; // Already loaded or loading

    console.log('🗺️ HeatmapDataService: Loading SA2 names for ranking...');
    setLoadingSA2Names(true);
    setSa2NameError(null);

    try {
      // Check cache first
      let geojsonData = boundaryDataCache.current.get('sa2-names');
      
      if (geojsonData) {
        console.log('📦 HeatmapDataService: Using cached SA2 boundary data for names');
      } else {
        console.log('📡 HeatmapDataService: Fetching SA2.geojson for name lookup...');
        const startTime = Date.now();
        
        const response = await fetch('/maps/SA2.geojson');
        if (!response.ok) {
          throw new Error(`Failed to load SA2 boundaries: ${response.status} ${response.statusText}`);
        }
        
        geojsonData = await response.json();
        boundaryDataCache.current.set('sa2-names', geojsonData);
        
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
      
      console.log(`✅ HeatmapDataService: Extracted ${Object.keys(nameMapping).length} SA2 name mappings`);
      console.log('🎯 HeatmapDataService: Sample SA2 name mapping:', Object.entries(nameMapping).slice(0, 3));
      
      setSa2NameCache(nameMapping);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ HeatmapDataService: Error loading SA2 names:', errorMessage);
      setSa2NameError(`Failed to load SA2 names: ${errorMessage}`);
    } finally {
      setLoadingSA2Names(false);
    }
  }, [sa2NameCache, loadingSA2Names]);

  // Load SA2 names when component mounts
  useEffect(() => {
    loadSA2Names();
  }, [loadSA2Names]);

  // Load and preload data when DSS data becomes available
  useEffect(() => {
    if (dssData.length > 0) {
      console.log('✅ HeatmapDataService: DSS data loaded, starting preload operations...');
      // Preload all heatmap data combinations
      preloadAllHeatmapData();
    }
  }, [dssData, preloadAllHeatmapData]);

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
      dssDataLength: dssData.length,
      hasOnDataProcessed: !!onDataProcessed,
      hasOnRankedDataCalculated: !!onRankedDataCalculated
    });

    if (selectedCategory && selectedSubcategory && dssData.length > 0) {
      console.log('✅ HeatmapDataService: All conditions met, processing data...');
      const processedData = getProcessedData(selectedCategory, selectedSubcategory);
      const label = `${selectedCategory} - ${selectedSubcategory}`;
      
      console.log('📊 HeatmapDataService: About to call onDataProcessed with:', {
        dataKeys: Object.keys(processedData).length,
        label,
        sampleData: Object.entries(processedData).slice(0, 3)
      });
      
      // Call existing heatmap callback
      onDataProcessed(processedData, label);
      
      // Calculate and call ranking callback if available
      if (onRankedDataCalculated) {
        console.log('📊 HeatmapDataService: Calculating ranked data...');
        const rankedData = calculateRankedData(processedData, label);
        console.log('📊 HeatmapDataService: About to call onRankedDataCalculated with:', rankedData);
        onRankedDataCalculated(rankedData);
      }
    } else {
      console.log('❌ HeatmapDataService: Conditions not met, clearing data:', {
        selectedCategory,
        selectedSubcategory,
        dssDataLength: dssData.length
      });
      // Clear both callbacks when no selection
      onDataProcessed(null, '');
      if (onRankedDataCalculated) {
        onRankedDataCalculated(null);
      }
    }
  }, [selectedCategory, selectedSubcategory, dssData, onDataProcessed, onRankedDataCalculated, calculateRankedData, getProcessedData]);

  // Combined loading state for user feedback
  const isPreloading = loading || loadingSA2Names || preloadingHeatmaps;
  const preloadStatus = loading ? 'Loading healthcare data...' : 
                       loadingSA2Names ? 'Loading region names...' : 
                       preloadingHeatmaps ? 'Preloading heatmap data...' : 
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