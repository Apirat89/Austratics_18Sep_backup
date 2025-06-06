'use client';

import React, { useState, useEffect } from 'react';

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

// Props interface
interface HeatmapDataServiceProps {
  selectedCategory?: string;
  selectedSubcategory?: string;
  onDataProcessed: (data: SA2HeatmapData | null, selectedOption: string) => void;
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
  onDataProcessed
}: HeatmapDataServiceProps) {
  const [dssData, setDssData] = useState<DSSData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load DSS data
  const loadDSSData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 HeatmapDataService: Loading DSS data from /DSS_Cleaned_2024_Compressed.json');
      
      const response = await fetch('/DSS_Cleaned_2024_Compressed.json');
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

  // Load data on component mount
  useEffect(() => {
    loadDSSData();
  }, []);

  // Process data when selection changes
  useEffect(() => {
    if (selectedCategory && selectedSubcategory && dssData.length > 0) {
      const processedData = processData(selectedCategory, selectedSubcategory);
      const label = `${selectedCategory} - ${selectedSubcategory}`;
      onDataProcessed(processedData, label);
    } else {
      onDataProcessed(null, '');
    }
  }, [selectedCategory, selectedSubcategory, dssData, onDataProcessed]);

  // Return loading/error state
  return (
    <>
      {/* Loading Status */}
      {loading && (
        <div className="absolute top-4 left-4 bg-blue-50 border border-blue-200 rounded-lg p-3 z-20">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-blue-700">Loading healthcare data...</span>
          </div>
        </div>
      )}

      {/* Error Status */}
      {error && (
        <div className="absolute top-4 left-4 bg-red-50 border border-red-200 rounded-lg p-3 z-20 max-w-sm">
          <h4 className="text-sm font-medium text-red-900">Data Loading Error</h4>
          <p className="text-sm text-red-700 mt-1">{error}</p>
          <button
            onClick={loadDSSData}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}
    </>
  );
} 