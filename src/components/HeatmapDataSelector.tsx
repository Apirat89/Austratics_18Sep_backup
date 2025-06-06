'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';

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
interface HeatmapDataSelectorProps {
  onDataChange: (data: SA2HeatmapData | null, visible: boolean, selectedOption: string) => void;
}

// Define program types and their data categories
const PROGRAM_TYPES = {
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

export default function HeatmapDataSelector({ onDataChange }: HeatmapDataSelectorProps) {
  // Component state
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [dssData, setDssData] = useState<DSSData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single dropdown for combined selection
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Refs for click outside detection
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Create flattened options list
  const flattenedOptions = React.useMemo(() => {
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
  }, []);

  // Load DSS data
  const loadDSSData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 HeatmapDataSelector: Loading DSS data from /DSS_Cleaned_2024_Compressed.json');
      
      const response = await fetch('/DSS_Cleaned_2024_Compressed.json');
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ DSS data loaded successfully:', data.length, 'records');
      console.log('✅ Sample DSS record:', data[0]);
      
      setDssData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ HeatmapDataSelector: Error loading DSS data:', errorMessage);
      setError(`Failed to load DSS data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Process data for selected category and subcategory
  const processData = (category: string, subcategory: string): SA2HeatmapData => {
    console.log('🔄 Processing data for:', category, '-', subcategory);
    
    const filteredData = dssData.filter(item => 
      item.Type === category && item.Category === subcategory
    );
    
    console.log('📊 Filtered data:', filteredData.length, 'records');
    
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
    
    console.log('✅ Processed SA2 data:', Object.keys(result).length, 'regions with data');
    console.log('🎯 SA2 105021098 in result:', result['105021098'] || 'NOT FOUND');
    console.log('📋 Sample processed data:', Object.entries(result).slice(0, 5));
    return result;
  };

  // Load data on component mount
  useEffect(() => {
    loadDSSData();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update data when selection changes
  useEffect(() => {
    if (selectedOption && dssData.length > 0) {
      const selectedItem = flattenedOptions.find(option => option.value === selectedOption);
      if (selectedItem) {
        const processedData = processData(selectedItem.category, selectedItem.subcategory);
        onDataChange(processedData, isVisible, selectedItem.label);
      }
    } else {
      onDataChange(null, isVisible, '');
    }
  }, [selectedOption, isVisible, dssData, onDataChange, flattenedOptions]);

  // Handle option selection
  const handleOptionSelect = (optionValue: string) => {
    setSelectedOption(optionValue);
    setShowDropdown(false);
  };

  // Toggle visibility
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  // Get current selection display text
  const getSelectionText = () => {
    if (!selectedOption) return 'Select data to display...';
    const selectedItem = flattenedOptions.find(option => option.value === selectedOption);
    return selectedItem ? selectedItem.label : 'Select data to display...';
  };

  return (
    <div className="space-y-3">
      {/* Debug Table for SA2 Data-GeoJSON Matching */}
      {dssData.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-2">🔍 Debug: Data-GeoJSON Matching Analysis</h4>
          <div className="text-xs text-blue-700 space-y-2">
            <div>📊 Total DSS records loaded: {dssData.length.toLocaleString()}</div>
            <div>🗺️ <strong>Testing SA2 Tile Shading:</strong> Looking for SA2 "105021098" in both DSS data and map tiles</div>
            {(() => {
              // Test with SA2 ID that user specified  
              const testSA2 = '105021098'; // User specified SA2 region
              const matchingRecords = dssData.filter(item => item['SA2 ID'] === testSA2);
                              console.log('🔍 Debug - Records for SA2 105021098:', matchingRecords);
              
              if (matchingRecords.length === 0) {
                // Sample some SA2 IDs to see the format
                const sampleIds = dssData.slice(0, 10).map(item => item['SA2 ID']);
                
                return (
                  <div className="space-y-1">
                    <div>❌ No matches found for SA2 ID "105021098"</div>
                    <div>🔢 Sample SA2 IDs from data: {sampleIds.join(', ')}</div>
                    <div className="text-red-600">Check if SA2 ID format is correct</div>
                  </div>
                );
              }
              
              return (
                <div className="space-y-2">
                  <div className="font-medium">✅ Found {matchingRecords.length} records for SA2 105021098:</div>
                  <div className="space-y-1">
                    {matchingRecords.map((record, idx) => (
                      <div key={idx} className="pl-4 py-1 bg-blue-100 rounded text-blue-800">
                        <div className="font-medium">{record.Type}</div>
                        <div className="text-xs">{record.Category}: <span className="font-mono">{record.Amount}</span></div>
                      </div>
                    ))}
                  </div>
                  
                  {selectedOption && (() => {
                    const selectedItem = flattenedOptions.find(option => option.value === selectedOption);
                    if (!selectedItem) return null;
                    
                    const specificRecord = matchingRecords.find(item => 
                      item.Type === selectedItem.category && item.Category === selectedItem.subcategory
                    );
                    
                    if (specificRecord) {
                      return (
                        <div className="mt-2 p-2 bg-green-100 rounded border border-green-300">
                          <div className="text-green-800 font-medium">🎯 Current Selection:</div>
                          <div className="text-green-700 text-xs font-mono">
                            {selectedItem.category} - {selectedItem.subcategory}: {specificRecord.Amount}
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="mt-2 p-2 bg-orange-100 rounded border border-orange-300">
                          <div className="text-orange-800 font-medium">⚠️ No data for current selection:</div>
                          <div className="text-orange-700 text-xs">
                            {selectedItem.category} - {selectedItem.subcategory}
                          </div>
                        </div>
                      );
                    }
                  })()}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Data Selection Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        >
          <span className={`truncate ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
            {getSelectionText()}
          </span>
          <ChevronDown className={`ml-2 h-4 w-4 text-gray-400 transition-transform ${
            showDropdown ? 'rotate-180' : ''
          }`} />
        </button>

        {showDropdown && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {flattenedOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleOptionSelect(option.value)}
                className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                  selectedOption === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                }`}
              >
                <div className="font-medium">{option.category}</div>
                <div className="text-xs text-gray-500 mt-0.5">{option.subcategory}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current Selection Debug */}
      {selectedOption && dssData.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Current Selection Data</h4>
          <div className="text-xs text-blue-700 space-y-1">
            {(() => {
              const selectedItem = flattenedOptions.find(option => option.value === selectedOption);
              if (!selectedItem) return <div>No selection</div>;
              
              const filteredData = dssData.filter(item => 
                item.Type === selectedItem.category && item.Category === selectedItem.subcategory
              );
              
              const testSA2Data = filteredData.filter(item => item['SA2 ID'] === '105021098');
              
              return (
                <div>
                  <div>📊 Total records for "{selectedItem.label}": {filteredData.length}</div>
                  <div>🎯 Records for SA2 105021098: {testSA2Data.length}</div>
                  {testSA2Data.length > 0 && (
                    <div>💰 Value: {testSA2Data[0].Amount}</div>
                  )}
                  <div>🗺️ Unique SA2s with data: {new Set(filteredData.map(item => item['SA2 ID'])).size}</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Visibility Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Show heatmap</span>
        <button
          onClick={toggleVisibility}
          className={`p-1 rounded-md transition-colors ${
            isVisible 
              ? 'text-blue-600 hover:bg-blue-50' 
              : 'text-gray-400 hover:bg-gray-50'
          }`}
          title={isVisible ? 'Hide heatmap' : 'Show heatmap'}
        >
          {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Loading data...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
          {error}
        </div>
      )}

      {/* Data Status */}
      {dssData.length > 0 && !loading && (
        <div className="text-xs text-gray-500">
          {dssData.length.toLocaleString()} data records loaded
        </div>
      )}
    </div>
  );
} 