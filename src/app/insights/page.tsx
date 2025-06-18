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
  const [searchResults, setSearchResults] = useState<SA2Data[]>([]);
  const [selectedSA2, setSelectedSA2] = useState<SA2Data | null>(null);
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

  // Smart SA2 search with population priority
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const results: SA2Data[] = [];

    // Search through all SA2 data
    Object.values(allSA2Data).forEach((sa2: SA2Data) => {
      const name = sa2.sa2Name?.toLowerCase() || '';
      const id = sa2.sa2Id?.toLowerCase() || '';
      
      // Direct name match (highest priority)
      if (name.includes(searchTerm)) {
        results.push(sa2);
      }
      // SA2 ID match
      else if (id.includes(searchTerm)) {
        results.push(sa2);
      }
      // Postcode match (extract from SA2 name if possible)
      else if (searchTerm.match(/^\d{4}$/) && name.includes(searchTerm)) {
        results.push(sa2);
      }
    });

    // Sort by population (largest first) if population data is available
    results.sort((a, b) => {
      const popA = a['Demographics | Estimated resident population (no.)'] || 0;
      const popB = b['Demographics | Estimated resident population (no.)'] || 0;
      return popB - popA;
    });

    // Limit to top 10 results
    setSearchResults(results.slice(0, 10));
  }, [allSA2Data]);

  // Select SA2 for detailed analysis
  const handleSelectSA2 = (sa2: SA2Data) => {
    setSelectedSA2(sa2);
    setSearchQuery(sa2.sa2Name);
    setSearchResults([]);
  };

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
                 placeholder="Search SA2 region, postcode, or locality..."
                 value={searchQuery}
                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
               />
               <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                  {searchResults.map((sa2) => (
                    <button
                      key={sa2.sa2Id}
                      onClick={() => handleSelectSA2(sa2)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-gray-50 focus:outline-none"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{sa2.sa2Name}</p>
                          <p className="text-sm text-gray-500">SA2 ID: {sa2.sa2Id}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-700">
                            Pop: {(sa2['Demographics | Estimated resident population (no.)'] || 0).toLocaleString()}
                          </p>
                          <MapPin className="h-4 w-4 text-gray-400 ml-auto" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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