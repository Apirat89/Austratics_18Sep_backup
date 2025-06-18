'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import BackToMainButton from '../../components/BackToMainButton';
import { Search, MapPin, BarChart3, TrendingUp, Users, DollarSign, Heart, Activity, AlertTriangle, CheckCircle, Loader2, Target, Radar, Award, Grid3X3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import SA2BoxPlot from '../../components/sa2/SA2BoxPlot';
import SA2RadarChart from '../../components/sa2/SA2RadarChart';
import SA2RankingChart from '../../components/sa2/SA2RankingChart';
import SA2HeatmapChart from '../../components/sa2/SA2HeatmapChart';
import { searchLocations } from '../../lib/mapSearchService';

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
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);
  const [dataLoadingStatus, setDataLoadingStatus] = useState<DataLoadingStatus>({
    isLoading: true,
    hasError: false,
    errorMessage: '',
    loadingStep: 'Initializing SA2 analytics platform...',
    isUsingFallbackData: false,
    statisticsCalculated: false
  });
  
  const router = useRouter();
  const dataLoadingRef = useRef(false);
  const dataLoadedRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      
      const sa2Data = apiData.data;
      setAllSA2Data(sa2Data);

      // Get available metrics
      const metricsResponse = await fetch('/api/sa2?metrics=true');
      const metricsData = await metricsResponse.json();
      setAvailableMetrics(metricsData.metrics || []);

      setDataLoadingStatus(prev => ({ ...prev, loadingStep: 'Calculating enhanced statistics (min, max, Q1, Q3, percentiles)...' }));
      
      // Calculate enhanced statistics for all metrics
      await calculateEnhancedStatistics(sa2Data, metricsData.metrics || []);

      setDataLoadingStatus(prev => ({
        ...prev,
        isLoading: false,
        loadingStep: 'SA2 Analytics Platform Ready',
        statisticsCalculated: true
      }));

      dataLoadedRef.current = true;
      console.log('✅ SA2 Analytics Platform loaded successfully');
      console.log(`📊 Dataset: ${Object.keys(sa2Data).length} regions, ${metricsData.metrics?.length || 0} metrics`);
      
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

  // Calculate enhanced statistics (min, max, Q1, Q3, percentiles)
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

    // Get all SA2 regions from search service
    try {
      const { searchLocations } = await import('../../lib/mapSearchService');
      const allSA2Results = await searchLocations('', 2000); // Get many results
      const sa2Results = allSA2Results.filter(result => result.type === 'sa2' && result.center);
      
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

  // Enhanced multi-source search with debouncing and SA2 proximity suggestions
  const performSearch = useCallback(async (query: string) => {
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
      
      // If no results from search service, try direct SA2 name search
      let finalLocationResults = locationResults;
      if (locationResults.length === 0) {
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
        // For other searches, show regular results (SA2s, postcodes, etc.)
        console.log('🔍 Regular search - all results:', enrichedResults.map(r => ({ name: r.name, type: r.type, code: r.code })));
        
        const sa2Results = enrichedResults.filter(result => result.type === 'sa2');
        console.log('🔍 SA2 results found:', sa2Results.length);
        
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
        
        setSearchResults(enrichedSA2Results.slice(0, 8));
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [allSA2Data, findClosestSA2Regions]);

  // Debounced search handler
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  }, [performSearch]);

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Load user and data on mount
  useEffect(() => {
    const initializePage = async () => {
      try {
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
      }
    };

    initializePage();
  }, [router, loadSA2Data]);

  // Handle search input changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, handleSearch]);

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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BarChart3 className="h-8 w-8 mr-3 text-blue-600" />
              SA2 Analytics Platform
            </h1>
            <p className="text-gray-600 mt-2">
              Comprehensive analysis of Statistical Area Level 2 regions across Australia
            </p>
          </div>
          <BackToMainButton />
        </div>

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
                                     <div className="relative">
              <input
                type="text"
                placeholder="Search regions (SA2/SA3/SA4/LGA), postcodes, localities, or facilities..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
              
              {/* Search Results Dropdown */}
              {!selectedSA2 && (searchResults.length > 0 || (searchQuery.length >= 2 && !isSearching && searchResults.length === 0)) && (
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
                  
                  {/* No Results State */}
                  {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                    <div className="px-4 py-8 text-center">
                      <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No locations found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Try searching for regions (SA2/SA3/SA4/LGA), postcodes, localities, or healthcare facilities
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                  {selectedSA2.sa2Name}
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
                      {(selectedSA2['Demographics | Estimated resident population (no.)'] || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-blue-600">Population</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold text-green-800">
                      ${(selectedSA2['Economics | Median employee income ($)'] || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-green-600">Median Income</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Heart className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold text-purple-800">
                      {(selectedSA2['Healthcare | Commonwealth Home Support Program_Number of Participants'] || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-purple-600">CHSP Participants</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                    <p className="text-2xl font-bold text-orange-800">
                      {(selectedSA2['Demographics | Median age - persons (years)'] || 0).toFixed(1)}
                    </p>
                    <p className="text-sm text-orange-600">Median Age</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Analysis Tabs */}
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="demographics">Demographics</TabsTrigger>
                    <TabsTrigger value="economics">Economics</TabsTrigger>
                    <TabsTrigger value="healthcare">Healthcare</TabsTrigger>
                    <TabsTrigger value="health">Health</TabsTrigger>
                    <TabsTrigger value="rankings">Rankings</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="mt-6">
                    <div className="space-y-6">
                      {/* Key Metrics Radar Chart */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-lg font-semibold mb-4 flex items-center">
                            <Radar className="h-5 w-5 mr-2 text-blue-600" />
                            Multi-Dimensional Performance
                          </h4>
                          {(() => {
                            const keyMetrics = [
                              'Demographics | Estimated resident population (no.)',
                              'Economics | Median employee income ($)',
                              'Demographics | Median age - persons (years)',
                              'Healthcare | Commonwealth Home Support Program_Number of Participants',
                              'Health Statistics | Core activity need for assistance - Total (no.)'
                            ].filter(metric => selectedSA2[metric] !== undefined && sa2Statistics[metric]);
                            
                                                         const radarData = prepareRadarData(selectedSA2, keyMetrics).filter(item => item !== null) as any[];
                            
                            return radarData.length > 0 ? (
                              <SA2RadarChart
                                title="Key Performance Indicators"
                                metrics={radarData}
                                width={380}
                                height={300}
                              />
                            ) : (
                              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <p className="text-gray-500">Insufficient data for radar chart</p>
                              </div>
                            );
                          })()}
                        </div>
                        
                        {/* Top Performance Box Plots */}
                        <div>
                          <h4 className="text-lg font-semibold mb-4 flex items-center">
                            <Target className="h-5 w-5 mr-2 text-green-600" />
                            Performance Distribution
                          </h4>
                          <div className="space-y-4">
                            {[
                              'Economics | Median employee income ($)',
                              'Demographics | Estimated resident population (no.)',
                              'Healthcare | Commonwealth Home Support Program_Number of Participants'
                            ].map(metric => {
                              const currentValue = selectedSA2[metric];
                              const stats = sa2Statistics[metric];
                              
                              if (typeof currentValue !== 'number' || !stats) return null;
                              
                              return (
                                <SA2BoxPlot
                                  key={metric}
                                  metricName={metric.replace(/^[^|]*\|\s*/, '')}
                                  currentValue={currentValue}
                                  statistics={stats}
                                  width={380}
                                  height={120}
                                  showPerformanceIndicator={true}
                                />
                              );
                            }).filter(Boolean)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="demographics" className="mt-6">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Demographics Box Plots */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold mb-4 flex items-center">
                            <Users className="h-5 w-5 mr-2 text-blue-600" />
                            Population Metrics
                          </h4>
                          {[
                            'Demographics | Estimated resident population (no.)',
                            'Demographics | Median age - persons (years)',
                            'Demographics | Population density (persons per sq km)'
                          ].map(metric => {
                            const currentValue = selectedSA2[metric];
                            const stats = sa2Statistics[metric];
                            
                            if (typeof currentValue !== 'number' || !stats) return null;
                            
                            return (
                              <SA2BoxPlot
                                key={metric}
                                metricName={metric.replace(/^[^|]*\|\s*/, '')}
                                currentValue={currentValue}
                                statistics={stats}
                                width={380}
                                height={150}
                                showPerformanceIndicator={true}
                              />
                            );
                          }).filter(Boolean)}
                        </div>
                        
                        {/* Demographics Radar Chart */}
                        <div>
                          <h4 className="text-lg font-semibold mb-4 flex items-center">
                            <Radar className="h-5 w-5 mr-2 text-purple-600" />
                            Age Distribution Profile
                          </h4>
                          {(() => {
                            const ageMetrics = availableMetrics.filter(metric => 
                              metric.includes('Demographics') && 
                              (metric.includes('age') || metric.includes('Age') || metric.includes('Population'))
                            ).slice(0, 6);
                            
                            const radarData = prepareRadarData(selectedSA2, ageMetrics).filter(item => item !== null) as any[];
                            
                            return radarData.length > 0 ? (
                              <SA2RadarChart
                                title="Demographics Profile"
                                metrics={radarData}
                                width={380}
                                height={300}
                              />
                            ) : (
                              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <p className="text-gray-500">Limited demographic data available</p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="economics" className="mt-6">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Economic Box Plots */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold mb-4 flex items-center">
                            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                            Economic Indicators
                          </h4>
                          {availableMetrics.filter(metric => 
                            metric.includes('Economics') || metric.includes('Income') || metric.includes('income')
                          ).slice(0, 4).map(metric => {
                            const currentValue = selectedSA2[metric];
                            const stats = sa2Statistics[metric];
                            
                            if (typeof currentValue !== 'number' || !stats) return null;
                            
                            return (
                              <SA2BoxPlot
                                key={metric}
                                metricName={metric.replace(/^[^|]*\|\s*/, '')}
                                currentValue={currentValue}
                                statistics={stats}
                                width={380}
                                height={150}
                                showPerformanceIndicator={true}
                              />
                            );
                          }).filter(Boolean)}
                        </div>
                        
                        {/* Economic Performance Radar */}
                        <div>
                          <h4 className="text-lg font-semibold mb-4 flex items-center">
                            <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                            Economic Performance Profile
                          </h4>
                          {(() => {
                            const economicMetrics = availableMetrics.filter(metric => 
                              metric.includes('Economics') || 
                              (metric.includes('Income') || metric.includes('income')) ||
                              metric.includes('Employment')
                            ).slice(0, 6);
                            
                            const radarData = prepareRadarData(selectedSA2, economicMetrics).filter(item => item !== null) as any[];
                            
                            return radarData.length > 0 ? (
                              <SA2RadarChart
                                title="Economic Performance"
                                metrics={radarData}
                                width={380}
                                height={300}
                              />
                            ) : (
                              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <p className="text-gray-500">Limited economic data available</p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="healthcare" className="mt-6">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Healthcare Services Box Plots */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold mb-4 flex items-center">
                            <Heart className="h-5 w-5 mr-2 text-red-600" />
                            Healthcare Services
                          </h4>
                          {availableMetrics.filter(metric => 
                            metric.includes('Healthcare') || metric.includes('Home Support') || metric.includes('Care')
                          ).slice(0, 4).map(metric => {
                            const currentValue = selectedSA2[metric];
                            const stats = sa2Statistics[metric];
                            
                            if (typeof currentValue !== 'number' || !stats) return null;
                            
                            return (
                              <SA2BoxPlot
                                key={metric}
                                metricName={metric.replace(/^[^|]*\|\s*/, '')}
                                currentValue={currentValue}
                                statistics={stats}
                                width={380}
                                height={150}
                                showPerformanceIndicator={true}
                              />
                            );
                          }).filter(Boolean)}
                        </div>
                        
                        {/* Healthcare Performance Radar */}
                        <div>
                          <h4 className="text-lg font-semibold mb-4 flex items-center">
                            <Radar className="h-5 w-5 mr-2 text-red-600" />
                            Healthcare Access Profile
                          </h4>
                          {(() => {
                            const healthcareMetrics = availableMetrics.filter(metric => 
                              metric.includes('Healthcare') || metric.includes('Home Support')
                            ).slice(0, 6);
                            
                            const radarData = prepareRadarData(selectedSA2, healthcareMetrics).filter(item => item !== null) as any[];
                            
                            return radarData.length > 0 ? (
                              <SA2RadarChart
                                title="Healthcare Services"
                                metrics={radarData}
                                width={380}
                                height={300}
                              />
                            ) : (
                              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <p className="text-gray-500">Limited healthcare data available</p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="health" className="mt-6">
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Health Conditions Box Plots */}
                        <div className="space-y-4">
                          <h4 className="text-lg font-semibold mb-4 flex items-center">
                            <Activity className="h-5 w-5 mr-2 text-purple-600" />
                            Health Conditions
                          </h4>
                          {availableMetrics.filter(metric => 
                            metric.includes('Health Statistics') || metric.includes('Core activity') || metric.includes('assistance')
                          ).slice(0, 4).map(metric => {
                            const currentValue = selectedSA2[metric];
                            const stats = sa2Statistics[metric];
                            
                            if (typeof currentValue !== 'number' || !stats) return null;
                            
                            return (
                              <SA2BoxPlot
                                key={metric}
                                metricName={metric.replace(/^[^|]*\|\s*/, '')}
                                currentValue={currentValue}
                                statistics={stats}
                                width={380}
                                height={150}
                                showPerformanceIndicator={true}
                              />
                            );
                          }).filter(Boolean)}
                        </div>
                        
                        {/* Health Risk Profile */}
                        <div>
                          <h4 className="text-lg font-semibold mb-4 flex items-center">
                            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                            Health Risk Profile
                          </h4>
                          {(() => {
                            const healthMetrics = availableMetrics.filter(metric => 
                              metric.includes('Health Statistics') || metric.includes('activity need')
                            ).slice(0, 6);
                            
                            const radarData = prepareRadarData(selectedSA2, healthMetrics).filter(item => item !== null) as any[];
                            
                            return radarData.length > 0 ? (
                              <SA2RadarChart
                                title="Health Risk Factors"
                                metrics={radarData}
                                width={380}
                                height={300}
                              />
                            ) : (
                              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                <p className="text-gray-500">Limited health condition data available</p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="rankings" className="mt-6">
                    <div className="space-y-6">
                      {/* Rankings Chart */}
                      <div>
                        <h4 className="text-lg font-semibold mb-4 flex items-center">
                          <Award className="h-5 w-5 mr-2 text-yellow-600" />
                          Performance Rankings
                        </h4>
                        {(() => {
                          const rankingMetrics = [
                            'Economics | Median employee income ($)',
                            'Demographics | Estimated resident population (no.)',
                            'Healthcare | Commonwealth Home Support Program_Number of Participants',
                            'Demographics | Median age - persons (years)',
                            'Health Statistics | Core activity need for assistance - Total (no.)'
                          ].filter(metric => selectedSA2[metric] !== undefined && sa2Statistics[metric]);
                          
                          const rankings = calculateRankings(selectedSA2, rankingMetrics).filter(item => item !== null) as any[];
                          
                          return rankings.length > 0 ? (
                            <SA2RankingChart
                              title="Percentile Rankings Across Key Metrics"
                              rankings={rankings}
                              width={800}
                              height={400}
                            />
                          ) : (
                            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                              <p className="text-gray-500">Insufficient data for rankings</p>
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* Additional Box Plots for Detailed Metrics */}
                      <div>
                        <h4 className="text-lg font-semibold mb-4 flex items-center">
                          <Target className="h-5 w-5 mr-2 text-blue-600" />
                          Detailed Performance Analysis
                        </h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {availableMetrics.slice(0, 6).map(metric => {
                            const currentValue = selectedSA2[metric];
                            const stats = sa2Statistics[metric];
                            
                            if (typeof currentValue !== 'number' || !stats) return null;
                            
                            return (
                              <SA2BoxPlot
                                key={metric}
                                metricName={metric.replace(/^[^|]*\|\s*/, '')}
                                currentValue={currentValue}
                                statistics={stats}
                                width={380}
                                height={150}
                                showPerformanceIndicator={true}
                              />
                            );
                          }).filter(Boolean)}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
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