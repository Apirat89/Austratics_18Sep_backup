'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Layers, Eye, EyeOff, ChevronDown } from 'lucide-react';

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
interface SA2DataLayerProps {
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

export default function SA2DataLayer({ onDataChange }: SA2DataLayerProps) {
  // Component state
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [dssData, setDssData] = useState<DSSData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single dropdown for combined selection (like HeatmapDataSelector)
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Refs for click outside detection
  const panelRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Create flattened options list (like HeatmapDataSelector)
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
      console.log('🔍 SA2DataLayer: Loading DSS data from Supabase Storage');
      
      const response = await fetch('https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public/json_data/sa2/DSS_Cleaned_2024.json');
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
      console.error('❌ SA2DataLayer: Error loading DSS data:', errorMessage);
      setError(`Failed to load DSS data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Process data for selected category and subcategory
  const processData = (category: string, subcategory: string): SA2HeatmapData => {
    console.log('🔄 SA2DataLayer: Processing data for:', category, '-', subcategory);
    
    const filteredData = dssData.filter(item => 
      item.Type === category && item.Category === subcategory
    );
    
    console.log('📊 SA2DataLayer: Filtered data:', filteredData.length, 'records');
    
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
    
    console.log('✅ SA2DataLayer: Processed SA2 data:', Object.keys(result).length, 'regions with data');
    console.log('🎯 SA2DataLayer: SA2 105021098 in result:', result['105021098'] || 'NOT FOUND');
    console.log('📋 SA2DataLayer: Sample processed data:', Object.entries(result).slice(0, 5));
    return result;
  };

  // Load data on component mount
  useEffect(() => {
    loadDSSData();
  }, []);

  // Handle click outside to close panel and dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update data when selection changes (like HeatmapDataSelector)
  useEffect(() => {
    console.log('🔄 SA2DataLayer: Selection changed:', {
      selectedOption,
      isVisible,
      dataLoaded: dssData.length > 0
    });
    
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

  // Handle option selection (like HeatmapDataSelector)
  const handleOptionSelect = (optionValue: string) => {
    console.log('🎯 SA2DataLayer: Option selected:', optionValue);
    setSelectedOption(optionValue);
    setShowDropdown(false);
  };

  // Toggle visibility
  const toggleVisibility = () => {
    console.log('👁️ SA2DataLayer: Toggling visibility:', !isVisible);
    setIsVisible(!isVisible);
  };

  // Get current selection display text
  const getSelectionText = () => {
    if (!selectedOption) return 'Select data to display...';
    const selectedItem = flattenedOptions.find(option => option.value === selectedOption);
    return selectedItem ? selectedItem.label : 'Select data to display...';
  };

  return (
    <div ref={panelRef} className="absolute bottom-16 left-4 z-40">
      {/* Floating Layer Button */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors whitespace-nowrap min-w-[120px]"
        >
          <Layers size={16} />
          Data Layers
        </button>

        {/* Expanded Panel */}
        {isOpen && (
          <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 min-w-[280px]">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800">Data Layers (SA2 Only)</h3>
                <button
                  onClick={toggleVisibility}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                  title="Toggle data layer visibility"
                >
                  {isVisible ? (
                    <Eye size={16} className="text-blue-600" />
                  ) : (
                    <EyeOff size={16} className="text-gray-400" />
                  )}
                </button>
              </div>

              {loading && (
                <div className="text-xs text-gray-600 mb-3">Loading data...</div>
              )}

              {error && (
                <div className="text-xs text-red-600 mb-3 p-2 bg-red-50 rounded">
                  {error}
                  <button
                    onClick={loadDSSData}
                    className="ml-2 underline hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Single Combined Selection (Fixed Logic with Original UI) */}
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Data Type
                </label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="w-full px-2 py-1.5 text-xs text-left border border-gray-300 rounded bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
                    disabled={loading || !!error}
                  >
                    <span className="truncate">
                      {getSelectionText()}
                    </span>
                    <ChevronDown size={12} />
                  </button>

                  {showDropdown && !loading && !error && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-32 overflow-y-auto">
                      {flattenedOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleOptionSelect(option.value)}
                          className="w-full px-2 py-1.5 text-xs text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-800">{option.category}</div>
                          <div className="text-gray-600">{option.subcategory}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Status Text */}
              {selectedOption && (
                <div className="text-xs text-gray-600">
                  {isVisible ? (
                    <span className="text-blue-600">● Layer visible</span>
                  ) : (
                    <span className="text-gray-400">○ Layer hidden</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 