'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { InsightsDataService } from '../../components/insights/InsightsDataService';
import DashboardCanvas from './components/DashboardCanvas';

export default function NewDashboardPage() {
  const [healthcareData, setHealthcareData] = useState<any[]>([]);
  const [demographicsData, setDemographicsData] = useState<any[]>([]);
  const [economicsData, setEconomicsData] = useState<any[]>([]);
  const [healthStatsData, setHealthStatsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState('Initializing...');
  
  // Use ref to prevent multiple data loading attempts
  const dataLoadingRef = useRef(false);
  const dataLoadedRef = useRef(false);
  
  // Available variables for chart axes
  const [availableVariables, setAvailableVariables] = useState<{
    healthcare: string[];
    demographics: string[];
    economics: string[];
    healthStats: string[];
  }>({
    healthcare: [],
    demographics: [],
    economics: [],
    healthStats: []
  });

  // Add median calculations state
  const [medianCalculations, setMedianCalculations] = useState<{
    healthcare: any[];
    demographics: any[];
    economics: any[];
    healthStats: any[];
  } | null>(null);

  // Extract available variables for chart configuration
  const extractAvailableVariables = useCallback((datasets: {
    healthcare: any[];
    demographics: any[];
    economics: any[];
    healthStats: any[];
  }) => {
    const getNumericFields = (data: any[]) => {
      if (!data || data.length === 0) return [];
      
      const sampleRecord = data[0];
      return Object.keys(sampleRecord).filter(key => {
        // Exclude SA2 ID and Name fields, focus on numeric data
        if (key.includes('SA2') || key.includes('Name') || key.includes('Type') || key.includes('Category')) return false;
        
        // Check if most values in this field are numeric
        const numericCount = data.slice(0, 100).reduce((count, record) => {
          const value = record[key];
          return count + (typeof value === 'number' && !isNaN(value) && value > 0 ? 1 : 0);
        }, 0);
        return numericCount > data.length * 0.1; // At least 10% numeric values
      });
    };

    return {
      healthcare: getNumericFields(datasets.healthcare),
      demographics: getNumericFields(datasets.demographics),
      economics: getNumericFields(datasets.economics),
      healthStats: getNumericFields(datasets.healthStats)
    };
  }, []);

  // Median calculation function
  const calculateMedianValues = useCallback((datasets: {
    healthcare: any[];
    demographics: any[];
    economics: any[];
    healthStats: any[];
  }) => {
    console.log('🧮 Calculating median values for all variables across SA2 regions...');
    
    const calculateMedian = (values: number[]): number => {
      const sorted = values.filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
      if (sorted.length === 0) return 0;
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
    };

    const processDataset = (data: any[], datasetName: string) => {
      if (!data || data.length === 0) return [];
      
      console.log(`📊 Processing ${datasetName} dataset with ${data.length} records`);
      
      // Get all numeric fields from the dataset
      const sampleRecord = data[0];
      const numericFields = Object.keys(sampleRecord).filter(key => {
        // Check if most values in this field are numeric
        const numericCount = data.slice(0, 100).reduce((count, record) => {
          const value = record[key];
          return count + (typeof value === 'number' && !isNaN(value) ? 1 : 0);
        }, 0);
        return numericCount > data.length * 0.1; // At least 10% numeric values
      });

      console.log(`🔢 Found ${numericFields.length} numeric fields in ${datasetName}:`, numericFields);

      // Calculate median for each numeric field
      const medians = numericFields.map(field => {
        const values = data.map(record => record[field]).filter(v => typeof v === 'number' && !isNaN(v));
        const median = calculateMedian(values);
        const count = values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        
        return {
          field,
          median,
          count,
          min,
          max,
          average: avg,
          hasData: count > 0
        };
      }).filter(result => result.hasData);

      console.log(`✅ Calculated medians for ${medians.length} fields in ${datasetName}`);
      return medians;
    };

    const results = {
      healthcare: processDataset(datasets.healthcare, 'Healthcare'),
      demographics: processDataset(datasets.demographics, 'Demographics'),
      economics: processDataset(datasets.economics, 'Economics'),
      healthStats: processDataset(datasets.healthStats, 'Health Stats')
    };

    // Log summary
    const totalFields = Object.values(results).reduce((sum, dataset) => sum + dataset.length, 0);
    console.log(`🎯 Total median calculations completed: ${totalFields} variables across all datasets`);
    
    return results;
  }, []);

  const loadDashboardData = useCallback(async () => {
    // Prevent multiple simultaneous loading attempts
    if (dataLoadingRef.current || dataLoadedRef.current) {
      console.log('🔄 Data loading already in progress or completed, skipping...');
      return;
    }
    
    dataLoadingRef.current = true;
    
    try {
      setLoading(true);
      setError(null);
      setLoadingStep('Initializing data service...');
      
      const dataService = InsightsDataService.getInstance();
      
      // Load all data using the existing service with timeout
      console.log('📥 Loading data using InsightsDataService...');
      setLoadingStep('Loading healthcare data...');
      
      // Set a timeout for data loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Data loading timeout after 30 seconds')), 30000);
      });
      
      await Promise.race([dataService.loadAllData(), timeoutPromise]);
      setLoadingStep('Processing loaded data...');
      
      // Access the data from the private properties using reflection
      const healthcareDataLoaded = (dataService as any).healthcareData || [];
      const demographicsDataLoaded = (dataService as any).demographicsData || [];
      const economicsDataLoaded = (dataService as any).economicsData || [];
      const healthStatsDataLoaded = (dataService as any).healthStatsData || [];
      
      setHealthcareData(healthcareDataLoaded);
      setDemographicsData(demographicsDataLoaded);
      setEconomicsData(economicsDataLoaded);
      setHealthStatsData(healthStatsDataLoaded);
      
      console.log('✅ Data loaded successfully');
      console.log(`Healthcare: ${healthcareDataLoaded.length} records`);
      console.log(`Demographics: ${demographicsDataLoaded.length} records`);
      console.log(`Economics: ${economicsDataLoaded.length} records`);
      console.log(`Health Stats: ${healthStatsDataLoaded.length} records`);
      
      setLoadingStep('Extracting variables...');
      
      // Extract available variables for chart configuration
      const variables = extractAvailableVariables({
        healthcare: healthcareDataLoaded,
        demographics: demographicsDataLoaded,
        economics: economicsDataLoaded,
        healthStats: healthStatsDataLoaded
      });
      setAvailableVariables(variables);

      // Calculate median values for all variables across SA2 regions
      setLoadingStep('Calculating median values...');
      const medianResults = calculateMedianValues({
        healthcare: healthcareDataLoaded,
        demographics: demographicsDataLoaded,
        economics: economicsDataLoaded,
        healthStats: healthStatsDataLoaded
      });
      setMedianCalculations(medianResults);
      
      setLoadingStep('Complete!');
      dataLoadedRef.current = true;
      
    } catch (err) {
      console.error('❌ Data loading failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      
      // Set fallback data for testing
      console.log('🔄 Using fallback sample data for testing...');
      setLoadingStep('Using sample data...');
      
      const sampleData = Array.from({ length: 100 }, (_, i) => ({
        'SA2 ID': `${10000 + i}`,
        'SA2 Name': `Sample Region ${i + 1}`,
        'Healthcare Participants': Math.floor(Math.random() * 1000),
        'Population 65+': Math.floor(Math.random() * 5000),
        'Median Income': Math.floor(Math.random() * 50000) + 30000,
        'Employment Rate': Math.random() * 0.3 + 0.6,
        'Health Score': Math.random() * 100
      }));
      
      setHealthcareData(sampleData);
      setDemographicsData(sampleData);
      setEconomicsData(sampleData);
      setHealthStatsData(sampleData);
      
      const fallbackVariables = {
        healthcare: ['Healthcare Participants'],
        demographics: ['Population 65+', 'Median Income', 'Employment Rate'],
        economics: ['Median Income', 'Employment Rate'],
        healthStats: ['Health Score']
      };
      setAvailableVariables(fallbackVariables);
      
      const fallbackMedians = {
        healthcare: [{ field: 'Healthcare Participants', median: 500, count: 100, min: 0, max: 1000, average: 500, hasData: true }],
        demographics: [
          { field: 'Population 65+', median: 2500, count: 100, min: 0, max: 5000, average: 2500, hasData: true },
          { field: 'Median Income', median: 55000, count: 100, min: 30000, max: 80000, average: 55000, hasData: true }
        ],
        economics: [
          { field: 'Median Income', median: 55000, count: 100, min: 30000, max: 80000, average: 55000, hasData: true },
          { field: 'Employment Rate', median: 0.75, count: 100, min: 0.6, max: 0.9, average: 0.75, hasData: true }
        ],
        healthStats: [{ field: 'Health Score', median: 50, count: 100, min: 0, max: 100, average: 50, hasData: true }]
      };
      setMedianCalculations(fallbackMedians);
      dataLoadedRef.current = true;
    } finally {
      setLoading(false);
      dataLoadingRef.current = false;
    }
  }, [extractAvailableVariables, calculateMedianValues]);

  // Use useEffect with proper dependencies
  useEffect(() => {
    if (!dataLoadedRef.current && !dataLoadingRef.current) {
      loadDashboardData();
    }
  }, []); // Empty dependency array - only run once on mount

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
          <p className="text-sm text-gray-500 mt-2">{loadingStep}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 m-4">
          <div className="flex items-center">
            <div className="text-amber-600 mr-2">⚠️</div>
            <div>
              <h3 className="text-amber-800 font-semibold">Data Loading Issue</h3>
              <p className="text-amber-700 text-sm">Using sample data for demonstration. {error}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Interactive Scatter Plot Dashboard
        </h1>
        <p className="text-gray-600">
          Create scatter plots with quadrants to explore relationships between variables across SA2 regions
        </p>
        {error && (
          <p className="text-sm text-amber-600 mt-2">
            Currently using sample data - full dataset loading failed
          </p>
        )}
      </div>

      {/* Dashboard Canvas */}
      <DashboardCanvas
        healthcareData={healthcareData}
        demographicsData={demographicsData}
        economicsData={economicsData}
        healthStatsData={healthStatsData}
        availableVariables={availableVariables}
        medianCalculations={medianCalculations}
      />
    </div>
  );
} 