'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import BackToMainButton from '../../components/BackToMainButton';
import { Search, MapPin, BarChart3, TrendingUp, Users, DollarSign, Heart, Activity, AlertTriangle, CheckCircle, Loader2, Target, Radar, Award, Grid3X3, Cross, Bookmark, BookmarkCheck, Trash2, History, ArrowLeft, Globe, Building, Home, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import SA2BoxPlot from '../../components/sa2/SA2BoxPlot';
import SA2RadarChart from '../../components/sa2/SA2RadarChart';
import SA2RankingChart from '../../components/sa2/SA2RankingChart';
import SA2HeatmapChart from '../../components/sa2/SA2HeatmapChart';
import InsightsLandingRankings from '../../components/insights/InsightsLandingRankings';
import { searchLocations } from '../../lib/mapSearchService';
import { 
  saveSA2Search, 
  getUserSavedSA2Searches, 
  deleteSavedSA2Search, 
  deleteSavedSA2SearchBySA2Id,
  isSA2SearchSaved,
  clearUserSavedSA2Searches,
  type SavedSA2Search 
} from '../../lib/savedSA2Searches';

interface UserData {
  email: string;
  name: string;
  id: string;
}

interface SA2Data {
  sa2Id: string;
  sa2Name: string;
  [key: string]: any;
}

interface SearchResult {
  id: string;
  name: string;
  area: string;
  code?: string;
  type: 'lga' | 'sa2' | 'sa3' | 'sa4' | 'postcode' | 'locality' | 'facility';
  state?: string;
  bounds?: [number, number, number, number];
  center?: [number, number];
  score: number;
  address?: string;
  careType?: string;
  facilityType?: 'residential' | 'mps' | 'home' | 'retirement';
  // Enhanced fields for analytics
  analyticsData?: SA2Data;
  population?: number;
  medianAge?: number;
  medianIncome?: number;
  // Proximity suggestion fields
  isProximitySuggestion?: boolean;
  proximityTo?: string;
  proximityDistance?: number;
  // Simple search fields
  matchedField?: string;
}

interface SA2Statistics {
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
  mean: number;
  count: number;
}

interface HierarchicalStatistics {
  national: SA2Statistics;
  state?: SA2Statistics;
  sa4?: SA2Statistics;
  sa3?: SA2Statistics;
}

interface DataLoadingStatus {
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
  loadingStep: string;
  isUsingFallbackData: boolean;
  statisticsCalculated: boolean;
}

export default function SA2AnalyticsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedSA2, setSelectedSA2] = useState<SA2Data | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [allSA2Data, setAllSA2Data] = useState<Record<string, SA2Data>>({});
  const [sa2Statistics, setSA2Statistics] = useState<Record<string, SA2Statistics>>({});
  const [hierarchicalStatistics, setHierarchicalStatistics] = useState<Record<string, HierarchicalStatistics>>({});
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);
  const [comparisonLevel, setComparisonLevel] = useState<'national' | 'state' | 'sa4' | 'sa3'>('national');
  const [dataLoadingStatus, setDataLoadingStatus] = useState<DataLoadingStatus>({
    isLoading: true,
    hasError: false,
    errorMessage: '',
    loadingStep: 'Initializing SA2 analytics platform...',
    isUsingFallbackData: false,
    statisticsCalculated: false
  });
  
  // Saved SA2 searches state
  const [savedSA2Searches, setSavedSA2Searches] = useState<SavedSA2Search[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentSA2SavedStatus, setCurrentSA2SavedStatus] = useState<boolean>(false);
  
  const router = useRouter();
  const dataLoadingRef = useRef(false);
  const dataLoadedRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load SA2 data and calculate enhanced statistics
  const loadSA2Data = useCallback(async () => {
    if (dataLoadingRef.current || dataLoadedRef.current) {
      console.log('📊 SA2 data loading already in progress or completed');
      return;
    }

    dataLoadingRef.current = true;
    
    try {
      setDataLoadingStatus(prev => ({
        ...prev,
        isLoading: true,
        loadingStep: 'Loading unified SA2 dataset...',
        hasError: false,
        errorMessage: ''
      }));

      // Load data from SA2 API
      const response = await fetch('/api/sa2');
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const apiData = await response.json();
      if (!apiData.success) {
        throw new Error(apiData.error || 'API returned error');
      }

      setDataLoadingStatus(prev => ({ ...prev, loadingStep: 'Processing SA2 data structure...' }));
      
      // Transform the API data to include sa2Id in each SA2 object
      const rawSA2Data = apiData.data;
      const transformedSA2Data: Record<string, SA2Data> = {};
      
      Object.entries(rawSA2Data).forEach(([sa2Id, sa2Info]: [string, any]) => {
        transformedSA2Data[sa2Id] = {
          sa2Id,
          sa2Name: sa2Info.sa2Name,
          ...sa2Info
        };
      });
      
      setAllSA2Data(transformedSA2Data);

      // Get available metrics
      const metricsResponse = await fetch('/api/sa2?metrics=true');
      const metricsData = await metricsResponse.json();
      setAvailableMetrics(metricsData.metrics || []);

      setDataLoadingStatus(prev => ({ ...prev, loadingStep: 'Calculating enhanced statistics (min, max, Q1, Q3, percentiles)...' }));
      
      // Calculate enhanced statistics for all metrics
      await calculateEnhancedStatistics(transformedSA2Data, metricsData.metrics || []);

      setDataLoadingStatus(prev => ({ ...prev, loadingStep: 'Calculating hierarchical statistics (state, SA4, SA3 levels)...' }));
      
      // Calculate hierarchical statistics for all levels
      await calculateHierarchicalStatistics(transformedSA2Data, metricsData.metrics || []);

      setDataLoadingStatus(prev => ({
        ...prev,
        isLoading: false,
        loadingStep: 'SA2 Analytics Platform Ready',
        statisticsCalculated: true
      }));

      dataLoadedRef.current = true;
      console.log('✅ SA2 Analytics Platform loaded successfully');
      console.log(`📊 Dataset: ${Object.keys(transformedSA2Data).length} regions, ${metricsData.metrics?.length || 0} metrics`);
      
    } catch (error) {
      console.warn('⚠️ SA2 data loading failed:', error);
      
      setDataLoadingStatus(prev => ({
        ...prev,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'SA2 data loading failed',
        loadingStep: 'Error loading SA2 data',
        isUsingFallbackData: false
      }));
    } finally {
      dataLoadingRef.current = false;
    }
  }, []);

  // Helper function to get hierarchical statistics for a specific SA2 and metric
  const getHierarchicalStatsForSA2 = (sa2: SA2Data, metric: string): HierarchicalStatistics | undefined => {
    const sa2Key = `${sa2.sa2Id}_${metric}`;
    return hierarchicalStatistics[sa2Key];
  };

  // Helper function to get SA2 info for comparison level display
  const getSA2Info = (sa2: SA2Data) => ({
    stateName: sa2.STATE_NAME_2021,
    sa4Name: sa2.SA4_NAME_2021,
    sa3Name: sa2.SA3_NAME_2021
  });

  // Helper function to shorten long metric names for display
  const getDisplayName = (metric: string): string => {
    const shortNames: { [key: string]: string } = {
      "Socio-economic indexes for areas (SEIFA) - rank within Australia - Census | SEIFA Index of relative socio-economic advantage and disadvantage (IRSAD) - rank within Australia (decile)": "SEIFA Advantage/Disadvantage Index (IRSAD) - Decile",
      "Socio-economic indexes for areas (SEIFA) - rank within Australia - Census | SEIFA Index of relative socio-economic disadvantage (IRSD) - rank within Australia (decile)": "SEIFA Disadvantage Index (IRSD) - Decile",
      "Personal income in Australia - year ended 30 June | Median employee income ($)": "Median Employee Income ($)",
      "Personal income in Australia - year ended 30 June | Median superannuation and annuity income ($)": "Median Superannuation Income ($)",
      "Residential property transfers - year ended 30 June | Median price of attached dwelling transfers ($)": "Median Attached Dwelling Price ($)",
      "Rent and mortgage payments - Occupied private dwellings - Census | Median weekly household rental payment ($)": "Median Weekly Rent ($)",
      "Tenure type - Occupied private dwellings - Census | Owned outright (%)": "Owned Outright (%)",
      "Tenure type - Occupied private dwellings - Census | Owned outright (no.)": "Owned Outright (no.)",
      "Labour force status - Census | % of total Census responding population employed": "Employment Rate (%)",
      "Labour force status - Persons aged 15 years and over - Census | Unemployment rate (%)": "Unemployment Rate (%)",
      "Core activity need for assistance - Census | Persons who have need for assistance with core activities (%)": "Need Core Activity Assistance (%)",
      "Core activity need for assistance - Census | Persons who have need for assistance with core activities (no.)": "Need Core Activity Assistance (no.)",
      "Household composition - Occupied private dwellings - Census | Lone person households (no.)": "Lone Person Households (no.)",
      "Unpaid assistance to a person with a disability - Census | Provided unpaid assistance (%)": "Provided Unpaid Assistance (%)",
      "Long-term health conditions - Census | Mental health condition (including depression or anxiety) (%)": "Mental Health Conditions (%)",
      "Long-term health conditions - Census | Heart disease (including heart attack or angina) (%)": "Heart Disease (%)",
      "Long-term health conditions - Census | Diabetes (excluding gestational diabetes) (%)": "Diabetes (%)",
      "Long-term health conditions - Census | Cancer (including remission) (%)": "Cancer (%)",
      "Long-term health conditions - Census | Dementia (including Alzheimer's) (%)": "Dementia (%)",
      "Long-term health conditions - Census | Lung condition (including COPD or emphysema) (%)": "Lung Conditions (%)",
      "Long-term health conditions - Census | No long-term health condition(s) (%)": "No Long-term Conditions (%)",
      "Long-term health conditions - Census | Other long-term health condition(s) (%)": "Other Long-term Conditions (%)"
    };
    
    // If we have a short name, use it
    if (shortNames[metric]) {
      return shortNames[metric];
    }
    
    // Otherwise, remove the prefix and return the metric name
    return metric.replace(/^[^|]*\|\s*/, '');
  };

  // Calculate hierarchical statistics for all levels (national, state, SA4, SA3)
  const calculateHierarchicalStatistics = async (sa2Data: Record<string, SA2Data>, metrics: string[]) => {
    try {
      console.log('📊 Calculating hierarchical statistics for all levels...');
      
      const hierarchicalStats: Record<string, HierarchicalStatistics> = {};
      
      // Group SA2s by hierarchy levels
      const sa2Array = Object.values(sa2Data);
      const stateGroups: Record<string, SA2Data[]> = {};
      const sa4Groups: Record<string, SA2Data[]> = {};
      const sa3Groups: Record<string, SA2Data[]> = {};
      
      // Group SA2s by their hierarchical levels
      sa2Array.forEach(sa2 => {
        const stateCode = sa2.STATE_CODE_2021;
        const sa4Code = sa2.SA4_CODE_2021;
        const sa3Code = sa2.SA3_CODE_2021;
        
        if (stateCode) {
          if (!stateGroups[stateCode]) stateGroups[stateCode] = [];
          stateGroups[stateCode].push(sa2);
        }
        
        if (sa4Code) {
          if (!sa4Groups[sa4Code]) sa4Groups[sa4Code] = [];
          sa4Groups[sa4Code].push(sa2);
        }
        
        if (sa3Code) {
          if (!sa3Groups[sa3Code]) sa3Groups[sa3Code] = [];
          sa3Groups[sa3Code].push(sa2);
        }
      });
      
      console.log(`📊 Grouped SA2s: ${Object.keys(stateGroups).length} states, ${Object.keys(sa4Groups).length} SA4s, ${Object.keys(sa3Groups).length} SA3s`);
      
      // Calculate statistics for each metric
      metrics.forEach(metric => {
        const stats: HierarchicalStatistics = {
          national: calculateStatsForGroup(sa2Array, metric)
        };
        
        // For each SA2, calculate its hierarchical statistics
        sa2Array.forEach(sa2 => {
          const stateCode = sa2.STATE_CODE_2021;
          const sa4Code = sa2.SA4_CODE_2021;
          const sa3Code = sa2.SA3_CODE_2021;
          
          // Use SA2 ID as the key for hierarchical stats
          const sa2Key = `${sa2.sa2Id}_${metric}`;
          
          if (!hierarchicalStats[sa2Key]) {
            hierarchicalStats[sa2Key] = {
              national: stats.national
            };
          }
          
          // Add state-level stats
          if (stateCode && stateGroups[stateCode]) {
            hierarchicalStats[sa2Key].state = calculateStatsForGroup(stateGroups[stateCode], metric);
          }
          
          // Add SA4-level stats
          if (sa4Code && sa4Groups[sa4Code]) {
            hierarchicalStats[sa2Key].sa4 = calculateStatsForGroup(sa4Groups[sa4Code], metric);
          }
          
          // Add SA3-level stats
          if (sa3Code && sa3Groups[sa3Code]) {
            hierarchicalStats[sa2Key].sa3 = calculateStatsForGroup(sa3Groups[sa3Code], metric);
          }
        });
      });
      
      setHierarchicalStatistics(hierarchicalStats);
      console.log(`✅ Hierarchical statistics calculated for ${Object.keys(hierarchicalStats).length} SA2-metric combinations`);
      
    } catch (error) {
      console.warn('⚠️ Hierarchical statistics calculation failed:', error);
    }
  };
  
  // Helper function to calculate statistics for a group of SA2s
  const calculateStatsForGroup = (sa2Group: SA2Data[], metric: string): SA2Statistics => {
    const values: number[] = [];
    
    sa2Group.forEach((sa2: SA2Data) => {
      const value = sa2[metric];
      if (typeof value === 'number' && !isNaN(value)) {
        values.push(value);
      }
    });

    if (values.length === 0) {
      return { min: 0, max: 0, q1: 0, median: 0, q3: 0, mean: 0, count: 0 };
    }

    // Sort values for quartile calculations
    const sortedValues = values.sort((a, b) => a - b);
    const count = sortedValues.length;
    
    // Calculate statistics
    const min = sortedValues[0];
    const max = sortedValues[count - 1];
    const mean = values.reduce((sum, val) => sum + val, 0) / count;
    
    // Calculate quartiles
    const q1Index = Math.floor(count * 0.25);
    const medianIndex = Math.floor(count * 0.5);
    const q3Index = Math.floor(count * 0.75);
    
    const q1 = count % 4 === 0 ? 
      (sortedValues[q1Index - 1] + sortedValues[q1Index]) / 2 : 
      sortedValues[q1Index];
    
    const median = count % 2 === 0 ? 
      (sortedValues[medianIndex - 1] + sortedValues[medianIndex]) / 2 : 
      sortedValues[medianIndex];
    
    const q3 = count % 4 === 0 ? 
      (sortedValues[q3Index - 1] + sortedValues[q3Index]) / 2 : 
      sortedValues[q3Index];

    return { min, max, q1, median, q3, mean, count };
  };

  // Calculate enhanced statistics (min, max, Q1, Q3, percentiles) - keeping for backward compatibility
  const calculateEnhancedStatistics = async (sa2Data: Record<string, SA2Data>, metrics: string[]) => {
    try {
      console.log('📊 Calculating enhanced statistics for all metrics...');
      
      const statistics: Record<string, SA2Statistics> = {};
      
      metrics.forEach(metric => {
        const values: number[] = [];
        
        // Extract all values for this metric
        Object.values(sa2Data).forEach((sa2: SA2Data) => {
          const value = sa2[metric];
          if (typeof value === 'number' && !isNaN(value)) {
            values.push(value);
          }
        });

        if (values.length > 0) {
          // Sort values for quartile calculations
          const sortedValues = values.sort((a, b) => a - b);
          const count = sortedValues.length;
          
          // Calculate statistics
          const min = sortedValues[0];
          const max = sortedValues[count - 1];
          const mean = values.reduce((sum, val) => sum + val, 0) / count;
          
          // Calculate quartiles
          const q1Index = Math.floor(count * 0.25);
          const medianIndex = Math.floor(count * 0.5);
          const q3Index = Math.floor(count * 0.75);
          
          const q1 = count % 4 === 0 ? 
            (sortedValues[q1Index - 1] + sortedValues[q1Index]) / 2 : 
            sortedValues[q1Index];
          
          const median = count % 2 === 0 ? 
            (sortedValues[medianIndex - 1] + sortedValues[medianIndex]) / 2 : 
            sortedValues[medianIndex];
          
          const q3 = count % 4 === 0 ? 
            (sortedValues[q3Index - 1] + sortedValues[q3Index]) / 2 : 
            sortedValues[q3Index];

          statistics[metric] = {
            min,
            max,
            q1,
            median,
            q3,
            mean,
            count
          };
        }
      });

      setSA2Statistics(statistics);
      console.log(`✅ Enhanced statistics calculated for ${Object.keys(statistics).length} metrics`);
      
    } catch (error) {
      console.warn('⚠️ Enhanced statistics calculation failed:', error);
    }
  };

  // Calculate rankings and percentiles for selected SA2
  const calculateRankings = useCallback((sa2: SA2Data, metrics: string[]) => {
    const rankings = metrics.map(metric => {
      const currentValue = sa2[metric];
      const stats = sa2Statistics[metric];
      
      if (typeof currentValue !== 'number' || !stats) {
        return null;
      }

      // Calculate percentile based on value position in distribution
      const percentile = ((currentValue - stats.min) / (stats.max - stats.min)) * 100;
      
      // Estimate rank (simplified calculation)
      const rank = Math.round((100 - percentile) * stats.count / 100) + 1;

      return {
        metricName: metric,
        currentValue,
        statistics: stats,
        rank: Math.max(1, rank),
        percentile: Math.max(0, Math.min(100, percentile)),
        totalRegions: stats.count
      };
    }).filter(Boolean);

    return rankings;
  }, [sa2Statistics]);

  // Prepare radar chart data
  const prepareRadarData = useCallback((sa2: SA2Data, metrics: string[]) => {
    return metrics.map(metric => {
      const currentValue = sa2[metric];
      const stats = sa2Statistics[metric];
      
      if (typeof currentValue !== 'number' || !stats) {
        return null;
      }

      // Determine unit based on metric name
      let unit = '';
      if (metric.includes('Income') || metric.includes('income') || metric.includes('$')) {
        unit = '$';
      } else if (metric.includes('%') || metric.includes('Rate') || metric.includes('Percentage')) {
        unit = '%';
      }

      return {
        name: metric.replace(/^[^|]*\|\s*/, ''), // Remove category prefix
        currentValue,
        statistics: stats,
        unit
      };
    }).filter(Boolean);
  }, [sa2Statistics]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Find closest SA2 regions to a given location
  const findClosestSA2Regions = useCallback(async (location: SearchResult, maxResults: number = 3): Promise<SearchResult[]> => {
    console.log('🔍 Finding closest SA2 regions for:', location.name, 'at coordinates:', location.center);
    
    if (!location.center) {
      console.log('❌ No center coordinates available for location');
      return [];
    }

    const [targetLng, targetLat] = location.center;
    const sa2Candidates: Array<SearchResult & { distance: number }> = [];

    // Get all SA2 regions from search service (optimized)
    try {
      const { getSA2Coordinates } = await import('../../lib/mapSearchService');
      const allSA2Coordinates = await getSA2Coordinates(); // Get SA2 coordinates efficiently
      const sa2Results = allSA2Coordinates.map(coord => ({
        id: coord.id,
        name: coord.name,
        code: coord.code,
        center: coord.center,
        type: 'sa2' as const,
        area: coord.name,
        score: 1.0
      })).filter(result => result.center);
      
      console.log(`📊 Found ${sa2Results.length} SA2 regions with coordinates`);
      console.log(`📊 Total SA2 data entries: ${Object.keys(allSA2Data).length}`);

      // Calculate distances to all SA2 regions
      sa2Results.forEach(sa2 => {
        if (sa2.center) {
          const [sa2Lng, sa2Lat] = sa2.center;
          const distance = calculateDistance(targetLat, targetLng, sa2Lat, sa2Lng);
          
                     // Enrich with analytics data if available
           let enrichedSA2: SearchResult & { distance: number } = { ...sa2, distance } as SearchResult & { distance: number };
           if (sa2.code && allSA2Data[sa2.code]) {
             const sa2Data = allSA2Data[sa2.code];
             enrichedSA2 = {
               ...enrichedSA2,
               analyticsData: sa2Data,
               population: sa2Data['Demographics | Estimated resident population (no.)'] || 0,
               medianAge: sa2Data['Demographics | Median age - persons (years)'] || 0,
               medianIncome: sa2Data['Economics | Median employee income ($)'] || 0
             };
           }
          
          sa2Candidates.push(enrichedSA2);
        }
      });

      // Sort by distance and return closest ones
      const closestSA2s = sa2Candidates
        .sort((a, b) => a.distance - b.distance)
        .slice(0, maxResults)
        .map(({ distance, ...result }) => ({ ...result, proximityDistance: distance }));
      
      console.log('🎯 Closest SA2 regions:', closestSA2s.map(sa2 => ({ 
        name: sa2.name, 
        code: sa2.code, 
        distance: sa2.proximityDistance?.toFixed(1) + ' km',
        hasAnalytics: !!sa2.analyticsData 
      })));

      return closestSA2s;

    } catch (error) {
      console.error('Error finding closest SA2 regions:', error);
      return [];
    }
  }, [allSA2Data, calculateDistance]);

  // ✅ NEW: Simple SA2 search function (searches only SA2 data fields)
  const performSimpleSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      const queryLower = query.toLowerCase();
      const searchResults: SearchResult[] = [];
      
      // Search through SA2 data fields: ID, name, SA3_CODE_2021, SA3_NAME_2021, SA4_CODE_2021, SA4_NAME_2021, Locality, Post_Code
      Object.entries(allSA2Data).forEach(([id, sa2Data]) => {
        const searchableFields = [
          { field: 'ID', value: id },
          { field: 'name', value: sa2Data.sa2Name },
          { field: 'SA3_CODE_2021', value: sa2Data.SA3_CODE_2021 },
          { field: 'SA3_NAME_2021', value: sa2Data.SA3_NAME_2021 },
          { field: 'SA4_CODE_2021', value: sa2Data.SA4_CODE_2021 },
          { field: 'SA4_NAME_2021', value: sa2Data.SA4_NAME_2021 }
        ];
        
        // Add postcode data fields (Locality and Post_Code)
        if (sa2Data.postcode_data && Array.isArray(sa2Data.postcode_data)) {
          sa2Data.postcode_data.forEach((postcodeItem: any) => {
            searchableFields.push(
              { field: 'Locality', value: postcodeItem.Locality },
              { field: 'Post_Code', value: postcodeItem.Post_Code }
            );
          });
        }
        
        // Check if any field matches the query (full text search - contains)
        const matchingField = searchableFields.find(({ value }) => 
          value && value.toString().toLowerCase().includes(queryLower)
        );
        
        if (matchingField) {
          searchResults.push({
            id: `sa2-${id}`,
            name: sa2Data.sa2Name,
            area: `${sa2Data.sa2Name} (SA2)`,
            code: id,
            type: 'sa2' as const,
            score: 100,
            analyticsData: sa2Data,
            population: sa2Data['Demographics | Estimated resident population (no.)'] || 0,
            medianAge: sa2Data['Demographics | Median age - persons (years)'] || 0,
            medianIncome: sa2Data['Economics | Median employee income ($)'] || 0,
            matchedField: matchingField.field // For debugging
          });
        }
      });
      
      console.log('🔍 Simple SA2 search results:', searchResults.length, 'results for query:', query);
      setSearchResults(searchResults); // Show all matching results
      setIsSearching(false);
      
    } catch (error) {
      console.error('Error in simple search:', error);
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [allSA2Data]);

  // Handle click outside search dropdown to close it
  const handleClickOutside = useCallback(() => {
    setSearchResults([]);
  }, []);

  /* 🚫 OLD: Complex multi-source search with debouncing and SA2 proximity suggestions (COMMENTED OUT FOR REFERENCE)
  const performSearch_OLD_COMPLEX = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      // Use the comprehensive search from mapSearchService
      const locationResults = await searchLocations(query, 10);
      console.log('🔍 Search service results:', locationResults.length, 'results for query:', query);
      
      // Also search through SA2 postcode/locality data if we have it (optimized)
      let postcodeLocalityResults: SearchResult[] = [];
      if (Object.keys(allSA2Data).length > 0) {
        const { getOptimizedPostcodeSearchResults } = await import('../../lib/mapSearchService');
        const allPostcodeResults = getOptimizedPostcodeSearchResults(allSA2Data);
        
        // Filter postcode results by query
        postcodeLocalityResults = allPostcodeResults
          .filter(result => {
            const name = result.name.toLowerCase();
            const queryLower = query.toLowerCase();
            return name.includes(queryLower) || name.startsWith(queryLower);
          })
          .slice(0, 10) // Limit to 10 results
          .map(result => {
            // Enrich with analytics data
            if (result.code && allSA2Data[result.code]) {
              const sa2Data = allSA2Data[result.code];
              return {
                ...result,
                analyticsData: sa2Data,
                population: sa2Data['Demographics | Estimated resident population (no.)'] || 0,
                medianAge: sa2Data['Demographics | Median age - persons (years)'] || 0,
                medianIncome: sa2Data['Economics | Median employee income ($)'] || 0
              };
            }
            return result;
          });
        
        console.log('🏘️ Postcode/locality results:', postcodeLocalityResults.length, 'results for query:', query);
      }
      
      // Combine regular search results with postcode/locality results
      let finalLocationResults = [...locationResults, ...postcodeLocalityResults];
      
      // If no results from any source, try direct SA2 name search
      if (finalLocationResults.length === 0) {
        console.log('🔍 No results from search service, trying direct SA2 name search...');
        
        // Search directly in SA2 analytics data
        const matchingSA2Data = Object.values(allSA2Data).filter(sa2 => 
          sa2.sa2Name.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 5);
        
        if (matchingSA2Data.length > 0) {
          console.log('✅ Found SA2 matches in analytics data:', matchingSA2Data.length);
          finalLocationResults = matchingSA2Data.map((sa2Data, index) => ({
            id: `sa2-direct-${index}`,
            name: sa2Data.sa2Name,
            area: `${sa2Data.sa2Name} (SA2)`,
            code: sa2Data.sa2Id || '',
            type: 'sa2' as const,
            score: 100,
            analyticsData: sa2Data,
            population: sa2Data['Demographics | Estimated resident population (no.)'] || 0,
            medianAge: sa2Data['Demographics | Median age - persons (years)'] || 0,
            medianIncome: sa2Data['Economics | Median employee income ($)'] || 0
          }));
        }
      }
      
      // Convert to our search result format and enrich SA2 results with analytics data
      const enrichedResults = await Promise.all(finalLocationResults.map(async result => {
        // If it's an SA2 result, try to enrich with analytics data
        if (result.type === 'sa2' && result.code && allSA2Data[result.code]) {
          const sa2Data = allSA2Data[result.code];
          return {
            ...result,
            analyticsData: sa2Data, // Store SA2 analytics data for later use
            population: sa2Data['Demographics | Estimated resident population (no.)'] || 0,
            medianAge: sa2Data['Demographics | Median age - persons (years)'] || 0,
            medianIncome: sa2Data['Economics | Median employee income ($)'] || 0
          };
        }
        return result;
      }));

      // Check if we have locality results - if so, show only SA2 proximity suggestions
      const localityResults = enrichedResults.filter(result => result.type === 'locality' && result.center);
      
      console.log('🔎 Locality results found:', localityResults.map(r => ({ name: r.name, type: r.type, center: r.center })));
      
      if (localityResults.length > 0) {
        console.log('🌍 Finding SA2 proximity suggestions for locality:', localityResults[0].name);
        
        const localityName = localityResults[0].name.toLowerCase();
        
        // For specific localities, provide known SA2 suggestions
        if (localityName.includes('kooralbyn')) {
          console.log('🎯 Using hardcoded SA2 suggestions for Kooralbyn area');
          
          // Get the known SA2 regions for Kooralbyn area - try simpler names first
          const knownSA2Names = ['Beaudesert', 'Boonah'];
          const sa2Suggestions: SearchResult[] = [];
          
          // Search for each known SA2 region
          for (const sa2Name of knownSA2Names) {
            console.log('🔍 Searching for SA2:', sa2Name);
            const sa2Results = await searchLocations(sa2Name, 5);
            console.log('🔍 Search results for', sa2Name, ':', sa2Results.map(r => ({ name: r.name, type: r.type, code: r.code })));
            
            // Try different matching strategies
            let matchingSA2 = sa2Results.find(result => 
              result.type === 'sa2' && 
              result.name.toLowerCase() === sa2Name.toLowerCase()
            );
            
            if (!matchingSA2) {
              matchingSA2 = sa2Results.find(result => 
                result.type === 'sa2' && 
                result.name.toLowerCase().includes(sa2Name.toLowerCase())
              );
            }
            
            if (!matchingSA2) {
              matchingSA2 = sa2Results.find(result => result.type === 'sa2');
            }
            
            console.log('🎯 Matching SA2 for', sa2Name, ':', matchingSA2 ? matchingSA2.name : 'NOT FOUND');
            
            if (matchingSA2) {
              // Try to find SA2 analytics data by name directly from allSA2Data
              const sa2DataByName = Object.values(allSA2Data).find(sa2 => 
                sa2.sa2Name.toLowerCase().includes(sa2Name.toLowerCase())
              );
              
              if (sa2DataByName) {
                console.log('📊 Found SA2 analytics data by name for:', sa2Name);
                const enrichedSA2 = {
                  ...matchingSA2,
                  analyticsData: sa2DataByName,
                  population: sa2DataByName['Demographics | Estimated resident population (no.)'] || 0,
                  medianAge: sa2DataByName['Demographics | Median age - persons (years)'] || 0,
                  medianIncome: sa2DataByName['Economics | Median employee income ($)'] || 0,
                  isProximitySuggestion: true,
                  proximityTo: localityResults[0].name
                };
                
                sa2Suggestions.push(enrichedSA2 as SearchResult);
              } else {
                console.log('❌ No SA2 analytics data found for:', sa2Name);
                // Add it anyway without analytics data
                sa2Suggestions.push({
                  ...matchingSA2,
                  isProximitySuggestion: true,
                  proximityTo: localityResults[0].name
                } as SearchResult);
              }
            }
          }
          
          console.log('✨ Found hardcoded SA2 suggestions:', sa2Suggestions.length);
          setSearchResults(sa2Suggestions);
        } else {
          // For other localities, use proximity calculation
          const closestSA2s = await findClosestSA2Regions(localityResults[0], 5);
          
          console.log('✨ Found SA2 proximity suggestions:', closestSA2s.length);
          
          const sa2Suggestions = closestSA2s.map(sa2 => ({
            ...sa2,
            isProximitySuggestion: true,
            proximityTo: localityResults[0].name
          } as SearchResult));
          
          setSearchResults(sa2Suggestions);
        }
      } else {
        // For other searches, show ALL results with SA2 proximity suggestions for non-SA2 types
        console.log('🔍 Regular search - all results:', enrichedResults.map(r => ({ name: r.name, type: r.type, code: r.code })));
        
        // Separate SA2 and non-SA2 results
        const sa2Results = enrichedResults.filter(result => result.type === 'sa2');
        const nonSA2Results = enrichedResults.filter(result => result.type !== 'sa2');
        
        console.log('🔍 SA2 results found:', sa2Results.length);
        console.log('🔍 Non-SA2 results found:', nonSA2Results.length, 'types:', nonSA2Results.map(r => r.type));
        
        // Enrich SA2 results with analytics data
        const enrichedSA2Results = sa2Results.map(sa2 => {
          // Try to find analytics data by name
          const sa2DataByName = Object.values(allSA2Data).find(data => 
            data.sa2Name.toLowerCase().includes(sa2.name.toLowerCase()) ||
            sa2.name.toLowerCase().includes(data.sa2Name.toLowerCase())
          );
          
          if (sa2DataByName) {
            console.log('📊 Found analytics data for SA2:', sa2.name);
            return {
              ...sa2,
              analyticsData: sa2DataByName,
              population: sa2DataByName['Demographics | Estimated resident population (no.)'] || 0,
              medianAge: sa2DataByName['Demographics | Median age - persons (years)'] || 0,
              medianIncome: sa2DataByName['Economics | Median employee income ($)'] || 0
            };
          }
          
          console.log('❌ No analytics data found for SA2:', sa2.name);
          return sa2;
        });

        // For non-SA2 results with coordinates, find proximity SA2 suggestions
        const proximitySuggestions: SearchResult[] = [];
        
        for (const nonSA2Result of nonSA2Results) {
          if (nonSA2Result.center && (nonSA2Result.type === 'sa3' || nonSA2Result.type === 'sa4' || nonSA2Result.type === 'lga')) {
            console.log('🌍 Finding SA2 proximity suggestions for', nonSA2Result.type, ':', nonSA2Result.name);
            
            try {
              const closestSA2s = await findClosestSA2Regions(nonSA2Result, 3); // Get top 3 closest SA2s
              
              console.log('✨ Found', closestSA2s.length, 'SA2 proximity suggestions for:', nonSA2Result.name);
              
              const sa2Suggestions = closestSA2s.map(sa2 => ({
                ...sa2,
                isProximitySuggestion: true,
                proximityTo: nonSA2Result.name,
                proximityDistance: sa2.proximityDistance
              } as SearchResult));
              
              proximitySuggestions.push(...sa2Suggestions);
            } catch (error) {
              console.error('Error finding SA2 proximity suggestions for:', nonSA2Result.name, error);
            }
          }
        }

        // Combine all results: original non-SA2 results first, then SA2 results, then proximity suggestions
        const allResults = [
          ...nonSA2Results, // Show original SA3, SA4, LGA results
          ...enrichedSA2Results, // Show SA2 results with analytics data
          ...proximitySuggestions // Show proximity SA2 suggestions
        ];
        
        console.log('📋 Final combined results:', allResults.length, 'total results');
        console.log('   - Original non-SA2:', nonSA2Results.length);
        console.log('   - SA2 with analytics:', enrichedSA2Results.length);
        console.log('   - Proximity suggestions:', proximitySuggestions.length);
        
        setSearchResults(allResults.slice(0, 10)); // Show up to 10 results total
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [allSA2Data, findClosestSA2Regions]);
  */

  // Debounced search handler - removed as we're using useEffect for debouncing instead

  // Handle location selection from search results
  const handleLocationSelect = (location: SearchResult) => {
    console.log('🎯 Location selected:', {
      name: location.name,
      type: location.type,
      code: location.code,
      hasAnalyticsData: !!location.analyticsData,
      isProximitySuggestion: location.isProximitySuggestion
    });
    
    setSelectedLocation(location);
    setSearchQuery(location.name);
    setSearchResults([]);
    
    // If it's an SA2 with analytics data, also set the SA2 selection
    if (location.type === 'sa2' && location.analyticsData) {
      console.log('✅ Setting SA2 analytics data for:', location.name);
      setSelectedSA2(location.analyticsData);
    } else if (location.type === 'sa2' && location.code) {
      // Try to find SA2 data by code if not already attached
      console.log('🔍 Trying to find SA2 data by code:', location.code);
      
      // Try different code formats (the boundary files might use different formats)
      const possibleKeys = [
        location.code,                    // Original code
        location.code.padStart(9, '0'),   // Zero-padded to 9 digits
        location.code.toString(),         // Ensure string
        String(parseInt(location.code))   // Remove leading zeros
      ];
      
      let sa2Data = null;
      let matchedKey = '';
      
      for (const key of possibleKeys) {
        if (allSA2Data[key]) {
          sa2Data = allSA2Data[key];
          matchedKey = key;
          break;
        }
      }
      
      if (sa2Data) {
        console.log('✅ Found SA2 data with key:', matchedKey, 'for:', location.name);
        setSelectedSA2(sa2Data);
      } else {
        console.log('❌ No SA2 data found for any key variation of:', location.code);
        console.log('Available SA2 keys sample:', Object.keys(allSA2Data).slice(0, 10));
        
        // Try to find by name as a last resort
        const sa2ByName = Object.values(allSA2Data).find(sa2 => 
          sa2.sa2Name.toLowerCase().includes(location.name.toLowerCase())
        );
        
        if (sa2ByName) {
          console.log('✅ Found SA2 data by name match for:', location.name);
          setSelectedSA2(sa2ByName);
        } else {
          console.log('❌ No SA2 data found by name either for:', location.name);
          setSelectedSA2(null);
        }
      }
    } else {
      console.log('❌ No SA2 analytics data available for:', location.name, '(type:', location.type, ', hasData:', !!location.analyticsData, ', code:', location.code, ')');
      // For non-SA2 or SA2 without analytics data, clear SA2 selection
      setSelectedSA2(null);
    }
  };

  // Legacy function for backward compatibility (if needed)
  const handleSelectSA2 = (sa2: SA2Data) => {
    setSelectedSA2(sa2);
    setSearchQuery(sa2.sa2Name);
    setSearchResults([]);
    setSelectedLocation(null);
  };

  // Load saved SA2 searches for the current user
  const loadSavedSA2Searches = useCallback(async () => {
    if (!user) return;
    
    try {
      const result = await getUserSavedSA2Searches(user.id);
      setSavedSA2Searches(result.searches);
    } catch (error) {
      console.error('Error loading saved SA2 searches:', error);
    }
  }, [user]);

  // Toggle save/unsave current SA2 search
  const toggleSA2SaveHandler = async (sa2: SA2Data) => {
    if (!user) {
      router.push('/auth/signin');
      return;
    }

    try {
      // Use the current state instead of making another database call to avoid race conditions
      if (currentSA2SavedStatus) {
        // Unsave the SA2
        const result = await deleteSavedSA2SearchBySA2Id(user.id, sa2.sa2Id);
        if (result.success) {
          setSaveMessage({ type: 'success', text: 'SA2 region removed from saved searches!' });
          setCurrentSA2SavedStatus(false);
          await loadSavedSA2Searches(); // Refresh the list
        } else {
          console.error('Failed to remove SA2 search:', result.message);
          setSaveMessage({ type: 'error', text: result.message });
        }
      } else {
        // Save the SA2
        const searchMetadata = {
          originalQuery: searchQuery,
          selectedLocation: selectedLocation,
          timestamp: new Date().toISOString()
        };

        const result = await saveSA2Search(
          user.id,
          sa2.sa2Id,
          sa2.sa2Name,
          sa2,
          searchMetadata
        );

        if (result.success) {
          console.log('SA2 search saved successfully');
          setSaveMessage({ type: 'success', text: 'SA2 region saved successfully!' });
          setCurrentSA2SavedStatus(true);
          await loadSavedSA2Searches(); // Refresh the list
        } else {
          console.error('Failed to save SA2 search:', result.message);
          setSaveMessage({ type: 'error', text: result.message });
        }
      }
      
      // Clear message after 5 seconds
      setTimeout(() => setSaveMessage(null), 5000);
    } catch (error) {
      console.error('Error toggling SA2 search save status:', error);
      setSaveMessage({ type: 'error', text: 'Failed to update SA2 search. Please try again.' });
      setTimeout(() => setSaveMessage(null), 5000);
    }
  };

  // Delete a saved SA2 search
  const deleteSavedSA2SearchHandler = async (searchId: number) => {
    if (!user) return;

    try {
      const result = await deleteSavedSA2Search(user.id, searchId);
      if (result.success) {
        console.log('SA2 search deleted successfully');
        await loadSavedSA2Searches(); // Refresh the list
      } else {
        console.error('Failed to delete SA2 search:', result.message);
      }
    } catch (error) {
      console.error('Error deleting SA2 search:', error);
    }
  };

  // Clear all saved SA2 searches
  const handleClearAllSavedSearches = async () => {
    if (!user) return;

    if (confirm('Are you sure you want to clear all saved SA2 searches? This action cannot be undone.')) {
      try {
        const result = await clearUserSavedSA2Searches(user.id);
        if (result.success) {
          console.log('All saved SA2 searches cleared successfully');
          await loadSavedSA2Searches(); // Refresh the list
        } else {
          console.error('Failed to clear saved SA2 searches:', result.message);
        }
      } catch (error) {
        console.error('Error clearing saved SA2 searches:', error);
      }
    }
  };

  // Load saved SA2 search
  const loadSavedSA2Search = (savedSearch: SavedSA2Search) => {
    setSelectedSA2(savedSearch.sa2_data);
    setSearchQuery(savedSearch.sa2_name);
    setSearchResults([]);
    setSelectedLocation(null);
    setShowSavedSearches(false);
  };

  // Navigate to residential page with SA2 filter
  const navigateToResidentialForSA2 = (savedSearch: SavedSA2Search) => {
    // Navigate to residential page with SA2 filter
    // The residential page will filter by SA2 name
    router.push(`/residential?sa2=${encodeURIComponent(savedSearch.sa2_name)}`);
  };

  // Check if current SA2 is saved
  const isCurrentSA2Saved = useCallback(async () => {
    if (!user || !selectedSA2) return false;
    
    try {
      return await isSA2SearchSaved(user.id, selectedSA2.sa2Id);
    } catch (error) {
      console.error('Error checking if SA2 is saved:', error);
      return false;
    }
  }, [user, selectedSA2]);

  // Cleanup timeout on unmount - removed as we're handling cleanup in the search useEffect

  // Load user and data on mount
  useEffect(() => {
    const initializePage = async () => {
      try {
        setCurrentUserLoading(true);
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser({
            email: currentUser.email || '',
            name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
            id: currentUser.id
          });
        }
        await loadSA2Data();
      } catch (error) {
        console.error('Error initializing SA2 analytics page:', error);
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
        setCurrentUserLoading(false);
      }
    };

    initializePage();
  }, [router, loadSA2Data]);

  // Load saved searches when user is available
  useEffect(() => {
    if (user && !currentUserLoading) {
      loadSavedSA2Searches();
    }
  }, [user, currentUserLoading, loadSavedSA2Searches]);

  // Check if current SA2 is saved when SA2 changes
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (user && selectedSA2) {
        try {
          const isSaved = await isSA2SearchSaved(user.id, selectedSA2.sa2Id);
          setCurrentSA2SavedStatus(isSaved);
        } catch (error) {
          console.error('Error checking SA2 saved status:', error);
          setCurrentSA2SavedStatus(false);
        }
      } else {
        setCurrentSA2SavedStatus(false);
      }
    };

    checkSavedStatus();
  }, [user, selectedSA2]);

  // Handle search input changes with proper debouncing
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        performSimpleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    // Cleanup on unmount or query change
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSimpleSearch]);

  // Handle click outside search dropdown to close it
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        handleClickOutside();
      }
    };

    // Only add event listener if there are search results to close
    if (searchResults.length > 0) {
      document.addEventListener('mousedown', handleDocumentClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [searchResults.length, handleClickOutside]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading SA2 Analytics Platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">SA2 Analytics Platform</h1>
            </div>
            
            {/* Back to Main Menu and Toggle buttons */}
            <div className="flex items-center gap-2">
              {/* Back to Main Menu Button */}
              <button
                onClick={() => router.push('/main')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Back to Main Menu"
              >
                <ArrowLeft className="w-4 h-4" />
                Main Menu
              </button>
              
              {/* Toggle between Search and Saved */}
              <button
                onClick={() => {
                  setShowSavedSearches(false);
                  // Navigate back to landing page - clear selected SA2 and location
                  setSelectedSA2(null);
                  setSelectedLocation(null);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  !showSavedSearches
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Search className="w-4 h-4" />
                Search SA2 Regions
              </button>
              <button
                onClick={() => setShowSavedSearches(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showSavedSearches
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <History className="w-4 h-4" />
                Saved Searches ({savedSA2Searches.length})
              </button>
            </div>
          </div>
          
          {!showSavedSearches && (
            <p className="text-gray-600">
              Comprehensive analysis of Statistical Area Level 2 regions across Australia
            </p>
          )}
          
          {showSavedSearches && (
            <p className="text-sm text-gray-600">
              {savedSA2Searches.length === 0 
                ? 'No saved SA2 searches yet. Search and save SA2 regions to view them here.'
                : `Viewing ${savedSA2Searches.length} saved SA2 searches`
              }
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Data Loading Status */}
        {dataLoadingStatus.isLoading && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Loader2 className="h-5 w-5 animate-spin mr-3 text-blue-600" />
                <span className="text-blue-800 font-medium">{dataLoadingStatus.loadingStep}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {dataLoadingStatus.hasError && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-3 text-red-600" />
                <span className="text-red-800 font-medium">
                  Error: {dataLoadingStatus.errorMessage}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {!dataLoadingStatus.isLoading && !dataLoadingStatus.hasError && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                <span className="text-green-800 font-medium">
                  SA2 Analytics Platform Ready • {Object.keys(allSA2Data).length} regions • {availableMetrics.length} metrics • Enhanced statistics calculated
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Message */}
        {saveMessage && (
          <Card className={`mb-6 ${saveMessage.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <CardContent className="p-4">
              <div className="flex items-center">
                {saveMessage.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 mr-3 text-red-600" />
                )}
                <span className={`font-medium ${saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                  {saveMessage.text}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {!showSavedSearches && (
          <>
            {/* Search Interface */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-5 w-5 mr-2" />
                  Search SA2 Regions
                </CardTitle>
                <CardDescription>
                  Search by SA2 name, postcode, or locality. Results prioritized by population size.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Save Current SA2 Button */}
                  {selectedSA2 && user && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          Currently viewing: {selectedSA2.sa2Name}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleSA2SaveHandler(selectedSA2)}
                        className={`flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                          currentSA2SavedStatus
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {currentSA2SavedStatus ? (
                          <>
                            <BookmarkCheck className="h-4 w-4 mr-1" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Bookmark className="h-4 w-4 mr-1" />
                            Save SA2
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  
                  <div className="relative" ref={searchContainerRef}>
                    <input
                      type="text"
                      placeholder="Search regions (SA2/SA3/SA4/LGA), postcodes, localities, or facilities..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      onClick={() => {
                        // Show existing results when clicking on search bar
                        if (searchQuery.trim()) {
                          performSimpleSearch(searchQuery);
                        }
                      }}
                      className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  
                  {/* Search Results Dropdown */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-80 overflow-y-auto">
                      {searchResults.map((result, index) => {
                        // Get type-specific icon and info
                        const getTypeInfo = (type: string) => {
                          switch (type) {
                            case 'sa2': return { icon: '📍', label: 'SA2' };
                            case 'sa3': return { icon: '🗺️', label: 'SA3' };
                            case 'sa4': return { icon: '🌏', label: 'SA4' };
                            case 'lga': return { icon: '🏛️', label: 'LGA' };
                            case 'postcode': return { icon: '📮', label: 'Postcode' };
                            case 'locality': return { icon: '🏘️', label: 'Locality' };
                            case 'facility': return { icon: '🏥', label: 'Facility' };
                            default: return { icon: '📍', label: 'Location' };
                          }
                        };
                        
                        const typeInfo = getTypeInfo(result.type);
                        const isPostcodeMatch = /^\d{4}$/.test(searchQuery.trim()) && result.type === 'postcode';
                        const isProximitySuggestion = result.isProximitySuggestion;
                        
                        return (
                          <button
                            key={`${result.id}-${index}`}
                            onClick={() => handleLocationSelect(result)}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-gray-50 focus:outline-none ${
                              isProximitySuggestion ? 'bg-blue-50 border-l-4 border-l-blue-400' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center">
                                  <span className="text-lg mr-2">{typeInfo.icon}</span>
                                  <div>
                                    <p className="font-medium text-gray-900 truncate">{result.name}</p>
                                    <div className="flex items-center space-x-3 text-sm text-gray-500">
                                      <span>{typeInfo.label} {result.code || result.id}</span>
                                      {result.area && <span>• {result.area}</span>}
                                      {result.state && <span>• {result.state}</span>}
                                      {isPostcodeMatch && (
                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                          Postcode Match
                                        </span>
                                      )}
                                      {result.type === 'sa2' && result.analyticsData && (
                                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                          Analytics Available
                                        </span>
                                      )}
                                      {result.type !== 'sa2' && !isProximitySuggestion && (
                                        <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                          No Direct Analytics
                                        </span>
                                      )}
                                      {isProximitySuggestion && (
                                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                          Near {result.proximityTo}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                {result.population && (
                                  <p className="text-sm font-medium text-gray-700">
                                    Pop: {result.population.toLocaleString()}
                                  </p>
                                )}
                                <div className="text-xs text-gray-500 space-y-0.5">
                                  {result.medianAge && result.medianAge > 0 && <div>Age: {result.medianAge.toFixed(1)}</div>}
                                  {result.medianIncome && result.medianIncome > 0 && <div>Income: ${(result.medianIncome/1000).toFixed(0)}k</div>}
                                  {result.address && <div className="truncate max-w-32">{result.address}</div>}
                                  {isProximitySuggestion && result.proximityDistance && (
                                    <div className="text-blue-600 font-medium">
                                      ~{result.proximityDistance.toFixed(1)} km away
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {showSavedSearches && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <History className="h-4 w-4 mr-2" />
                  Saved Searches ({savedSA2Searches.length})
                </div>
                {savedSA2Searches.length > 0 && (
                  <button
                    onClick={handleClearAllSavedSearches}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                    title="Clear all saved searches"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear All
                  </button>
                )}
              </CardTitle>
              <CardDescription>
                Search and save SA2 regions to access them quickly
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedSA2Searches.length === 0 ? (
                <div className="text-center py-12">
                  <Bookmark className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Saved SA2 Searches</h3>
                  <p className="text-gray-600 mb-4">
                    Search for SA2 regions and save them to access quickly later.
                  </p>
                  <p className="text-sm text-gray-500">
                    Switch to "Search SA2 Regions" to start exploring regions
                  </p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {savedSA2Searches.map((savedSearch) => (
                    <div key={savedSearch.id} className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => loadSavedSA2Search(savedSearch)}
                          className="flex-1 text-left"
                        >
                          <p className="font-medium text-gray-900 truncate">{savedSearch.sa2_name}</p>
                          <p className="text-sm text-gray-500">SA2 {savedSearch.sa2_id}</p>
                          <p className="text-xs text-gray-400">
                            Saved {new Date(savedSearch.created_at).toLocaleDateString()}
                          </p>
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigateToResidentialForSA2(savedSearch)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="View residential aged care facilities in this SA2 region"
                          >
                            <Building className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteSavedSA2SearchHandler(savedSearch.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete saved search"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Selected Location Information */}
        {selectedLocation && !selectedSA2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                {selectedLocation.name}
              </CardTitle>
              <CardDescription>
                {selectedLocation.type.toUpperCase()} {selectedLocation.code || selectedLocation.id} 
                {selectedLocation.area && ` • ${selectedLocation.area}`}
                {selectedLocation.state && ` • ${selectedLocation.state}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Analytics Not Available
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Detailed analytics are only available for SA2 regions. 
                      {selectedLocation.type !== 'sa2' && ' Try searching for an SA2 region within this area.'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selected SA2 Analysis */}
        {selectedSA2 && (
          <div className="space-y-6">
            {/* SA2 Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                    {selectedSA2.sa2Name}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSA2SaveHandler(selectedSA2)}
                      disabled={!user}
                      className={`rounded-lg p-1.5 transition-colors ${
                        currentSA2SavedStatus
                          ? 'text-green-600 hover:text-green-800 hover:bg-green-50'
                          : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                      title={
                        !user 
                          ? 'Sign in to save SA2 regions' 
                          : currentSA2SavedStatus 
                            ? 'Remove from saved searches' 
                            : 'Save this SA2 region to your searches'
                      }
                    >
                      {currentSA2SavedStatus ? (
                        <BookmarkCheck className="h-4 w-4" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        router.push(`/residential?sa2=${encodeURIComponent(selectedSA2.sa2Name)}`);
                      }}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg p-1.5 transition-colors"
                      title="View residential aged care facilities in this SA2 region"
                    >
                      <Building className="h-4 w-4" />
                    </button>
                  </div>
                </CardTitle>
                <CardDescription>
                  SA2 ID: {selectedSA2.sa2Id} • Comprehensive regional analysis with enhanced statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold text-blue-800">
                      {(selectedSA2['Demographics | Persons - 65 years and over (no.)'] || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-blue-600">Persons 65+ Years</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Heart className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold text-green-800">
                      {(selectedSA2['Number of Participants | Home Care'] || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600">Home Care</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Heart className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold text-purple-800">
                      {(selectedSA2['Number of Participants | Residential Care'] || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-purple-600">Residential Care</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <Heart className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                    <p className="text-2xl font-bold text-orange-800">
                      {(selectedSA2['Number of Participants | Commonwealth Home Support Program'] || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-orange-600">CHSP Participants</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comparison Level Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                    Comparison Level
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { key: 'national', label: 'National', icon: Globe, desc: 'vs All Australia' },
                      { key: 'state', label: 'State', icon: Building, desc: `vs ${selectedSA2.STATE_NAME_2021}` },
                      { key: 'sa4', label: 'SA4', icon: MapPin, desc: 'Regional Level' },
                      { key: 'sa3', label: 'SA3', icon: Home, desc: 'Local Level' }
                    ].map(({ key, label, icon: Icon, desc }) => (
                      <button
                        key={key}
                        onClick={() => setComparisonLevel(key as any)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          comparisonLevel === key
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        title={desc}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </CardTitle>
                <CardDescription>
                  Choose what level to compare this SA2 against in the box plots below
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Detailed Analysis Tabs */}
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="economics" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="economics" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span>Economics</span>
                    </TabsTrigger>
                    <TabsTrigger value="demographics" className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span>Demographics</span>
                    </TabsTrigger>
                    <TabsTrigger value="health-sector" className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-purple-600" />
                      <span>Health Sector</span>
                    </TabsTrigger>
                    <TabsTrigger value="health-stats" className="flex items-center gap-2">
                      <Cross className="h-4 w-4 text-red-600" />
                      <span>Health Stats</span>
                    </TabsTrigger>
                  </TabsList>
                  

                  {/* 🟢 Economics Tab */}
                  <TabsContent value="economics" className="mt-6">
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                        <h3 className="text-xl font-bold text-green-800 flex items-center gap-2 mb-2">
                          <TrendingUp className="h-6 w-6" />
                          Economics Metrics
                        </h3>
                        <p className="text-green-700">Employment rates, income levels, and economic indicators for regional prosperity assessment.</p>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {availableMetrics.filter(metric => [
                          "Labour force status - Census | % of total Census responding population employed",
                          "Personal income in Australia - year ended 30 June | Median employee income ($)",
                          "Residential property transfers - year ended 30 June | Median price of attached dwelling transfers ($)",
                          "Personal income in Australia - year ended 30 June | Median superannuation and annuity income ($)",
                          "Rent and mortgage payments - Occupied private dwellings - Census | Median weekly household rental payment ($)",
                          "Tenure type - Occupied private dwellings - Census | Owned outright (%)",
                          "Tenure type - Occupied private dwellings - Census | Owned outright (no.)",
                          "Socio-economic indexes for areas (SEIFA) - rank within Australia - Census | SEIFA Index of relative socio-economic advantage and disadvantage (IRSAD) - rank within Australia (decile)",
                          "Socio-economic indexes for areas (SEIFA) - rank within Australia - Census | SEIFA Index of relative socio-economic disadvantage (IRSD) - rank within Australia (decile)",
                          "Labour force status - Persons aged 15 years and over - Census | Unemployment rate (%)"
                        ].includes(metric)).map(metric => {
                          const currentValue = selectedSA2[metric];
                          const stats = sa2Statistics[metric];
                          
                          if (typeof currentValue !== 'number' || !stats) return null;
                          
                          const hierarchicalStats = getHierarchicalStatsForSA2(selectedSA2, metric);
                          const sa2Info = getSA2Info(selectedSA2);
                          
                          return (
                            <SA2BoxPlot
                              key={metric}
                              metricName={getDisplayName(metric)}
                              currentValue={currentValue}
                              statistics={stats}
                              hierarchicalStats={hierarchicalStats}
                              comparisonLevel={comparisonLevel}
                              sa2Info={sa2Info}
                              width={380}
                              height={140}
                              showPerformanceIndicator={true}
                            />
                          );
                        }).filter(Boolean)}
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* 🔵 Demographics Tab */}
                  <TabsContent value="demographics" className="mt-6">
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                        <h3 className="text-xl font-bold text-blue-800 flex items-center gap-2 mb-2">
                          <Users className="h-6 w-6" />
                          Demographics Metrics
                        </h3>
                        <p className="text-blue-700">Population statistics, age distribution, and demographic characteristics of the region.</p>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {availableMetrics.filter(metric => [
                          "Demographics | Estimated resident population (no.)",
                          "Demographics | Median age - persons (years)",
                          "Demographics | Persons - 55-64 years (%)",
                          "Demographics | Persons - 55-64 years (no.)",
                          "Demographics | Persons - 65 years and over (%)",
                          "Demographics | Persons - 65 years and over (no.)",
                          "Demographics | Population density (persons/km2)",
                          "Demographics | Working age population (aged 15-64 years) (%)",
                          "Demographics | Working age population (aged 15-64 years) (no.)"
                        ].includes(metric)).map(metric => {
                          const currentValue = selectedSA2[metric];
                          const stats = sa2Statistics[metric];
                          
                          if (typeof currentValue !== 'number' || !stats) return null;
                          
                          const hierarchicalStats = getHierarchicalStatsForSA2(selectedSA2, metric);
                          const sa2Info = getSA2Info(selectedSA2);
                          
                          return (
                            <SA2BoxPlot
                              key={metric}
                              metricName={getDisplayName(metric)}
                              currentValue={currentValue}
                              statistics={stats}
                              hierarchicalStats={hierarchicalStats}
                              comparisonLevel={comparisonLevel}
                              sa2Info={sa2Info}
                              width={380}
                              height={140}
                              showPerformanceIndicator={true}
                            />
                          );
                        }).filter(Boolean)}
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* 🟣 Health Sector Tab */}
                  <TabsContent value="health-sector" className="mt-6">
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-200">
                        <h3 className="text-xl font-bold text-purple-800 flex items-center gap-2 mb-2">
                          <Heart className="h-6 w-6" />
                          Health Sector Metrics
                        </h3>
                        <p className="text-purple-700">Healthcare infrastructure, service availability, and support programs in the region.</p>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {availableMetrics.filter(metric => [
                          "Number of Participants | Commonwealth Home Support Program",
                          "Number of Providers | Commonwealth Home Support Program",
                          "Participants per provider | Commonwealth Home Support Program",
                          "Spending | Commonwealth Home Support Program",
                          "Spending per participant | Commonwealth Home Support Program",
                          "Spending per provider | Commonwealth Home Support Program",
                          "Number of Participants | Home Care",
                          "Number of Providers | Home Care",
                          "Participants per provider | Home Care",
                          "Spending | Home Care",
                          "Spending per participant | Home Care",
                          "Spending per provider | Home Care",
                          "Number of Participants | Residential Care",
                          "Number of Providers | Residential Care",
                          "Participants per provider | Residential Care",
                          "Spending | Residential Care",
                          "Spending per participant | Residential Care",
                          "Spending per provider | Residential Care"
                        ].includes(metric)).map(metric => {
                          const currentValue = selectedSA2[metric];
                          const stats = sa2Statistics[metric];
                          
                          if (typeof currentValue !== 'number' || !stats) return null;
                          
                          const hierarchicalStats = getHierarchicalStatsForSA2(selectedSA2, metric);
                          const sa2Info = getSA2Info(selectedSA2);
                          
                          return (
                            <SA2BoxPlot
                              key={metric}
                              metricName={getDisplayName(metric)}
                              currentValue={currentValue}
                              statistics={stats}
                              hierarchicalStats={hierarchicalStats}
                              comparisonLevel={comparisonLevel}
                              sa2Info={sa2Info}
                              width={380}
                              height={140}
                              showPerformanceIndicator={true}
                            />
                          );
                        }).filter(Boolean)}
                      </div>
                    </div>
                  </TabsContent>
                  
                  {/* 🔴 Health Stats Tab */}
                  <TabsContent value="health-stats" className="mt-6">
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-lg p-4 border border-red-200">
                        <h3 className="text-xl font-bold text-red-800 flex items-center gap-2 mb-2">
                          <Cross className="h-6 w-6" />
                          Health Stats Metrics
                        </h3>
                        <p className="text-red-700">Health conditions, assistance needs, and wellness indicators for the region.</p>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {availableMetrics.filter(metric => [
                          "Long-term health conditions - Census | Arthritis (%)",
                          "Long-term health conditions - Census | Asthma (%)",
                          "Long-term health conditions - Census | Cancer (including remission) (%)",
                          "Long-term health conditions - Census | Dementia (including Alzheimer's) (%)",
                          "Long-term health conditions - Census | Diabetes (excluding gestational diabetes) (%)",
                          "Long-term health conditions - Census | Heart disease (including heart attack or angina) (%)",
                          "Long-term health conditions - Census | Kidney disease (%)",
                          "Household composition - Occupied private dwellings - Census | Lone person households (no.)",
                          "Long-term health conditions - Census | Lung condition (including COPD or emphysema) (%)",
                          "Long-term health conditions - Census | Mental health condition (including depression or anxiety) (%)",
                          "Long-term health conditions - Census | No long-term health condition(s) (%)",
                          "Long-term health conditions - Census | Other long-term health condition(s) (%)",
                          "Core activity need for assistance - Census | Persons who have need for assistance with core activities (%)",
                          "Core activity need for assistance - Census | Persons who have need for assistance with core activities (no.)",
                          "Unpaid assistance to a person with a disability - Census | Provided unpaid assistance (%)",
                          "Long-term health conditions - Census | Stroke (%)"
                        ].includes(metric)).map(metric => {
                          const currentValue = selectedSA2[metric];
                          const stats = sa2Statistics[metric];
                          
                          if (typeof currentValue !== 'number' || !stats) return null;
                          
                          const hierarchicalStats = getHierarchicalStatsForSA2(selectedSA2, metric);
                          const sa2Info = getSA2Info(selectedSA2);
                          
                          return (
                            <SA2BoxPlot
                              key={metric}
                              metricName={getDisplayName(metric)}
                              currentValue={currentValue}
                              statistics={stats}
                              hierarchicalStats={hierarchicalStats}
                              comparisonLevel={comparisonLevel}
                              sa2Info={sa2Info}
                              width={380}
                              height={140}
                              showPerformanceIndicator={true}
                            />
                          );
                        }).filter(Boolean)}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Regional Rankings - Landing Page Feature */}
        {!selectedSA2 && !dataLoadingStatus.isLoading && Object.keys(allSA2Data).length > 0 && (
          <InsightsLandingRankings
            allSA2Data={allSA2Data}
            availableMetrics={availableMetrics}
            sa2Statistics={sa2Statistics}
            isLoading={dataLoadingStatus.isLoading}
            onSelectSA2={handleSelectSA2}
          />
        )}

        {/* Empty State */}
        {!selectedSA2 && !dataLoadingStatus.isLoading && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Search className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold mb-2">Select an SA2 Region</h3>
                <p className="text-gray-600 mb-4">
                  Use the search bar above to find and analyze any SA2 region across Australia
                </p>
                <p className="text-sm text-gray-500">
                  {Object.keys(allSA2Data).length} regions available • {availableMetrics.length} metrics • Enhanced statistics ready
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 