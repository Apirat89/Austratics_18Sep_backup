'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, ChevronDown, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

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

interface RankedRegion {
  sa2Id: string;
  sa2Name: string;
  value: number;
}

interface RankedSA2Data {
  topRegions: RankedRegion[];
  bottomRegions: RankedRegion[];
  totalRegions: number;
  selectedVariable: string;
}

interface InsightsLandingRankingsProps {
  allSA2Data: Record<string, SA2Data>;
  availableMetrics: string[];
  sa2Statistics: Record<string, SA2Statistics>;
  isLoading?: boolean;
  onSelectSA2?: (sa2: SA2Data) => void;
}

export default function InsightsLandingRankings({
  allSA2Data,
  availableMetrics,
  sa2Statistics,
  isLoading = false,
  onSelectSA2
}: InsightsLandingRankingsProps) {
  const router = useRouter();
  const [selectedVariable, setSelectedVariable] = useState<string>('');
  const [rankedData, setRankedData] = useState<RankedSA2Data | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate rankings for selected variable
  const calculateRankings = (variableName: string): RankedSA2Data | null => {
    if (!variableName || !allSA2Data) return null;

    console.log('🔢 InsightsLandingRankings: Calculating rankings for:', variableName);
    
    // Convert SA2 data to array with values
    const regionsWithValues = Object.entries(allSA2Data)
      .map(([sa2Id, data]) => ({
        sa2Id,
        sa2Name: data.sa2Name || `Unknown Region`,
        value: data[variableName]
      }))
      .filter(region => 
        region.sa2Name !== 'Unknown Region' && 
        typeof region.value === 'number' && 
        !isNaN(region.value)
      );

    if (regionsWithValues.length === 0) {
      console.log('⚠️ InsightsLandingRankings: No valid data found for variable:', variableName);
      return null;
    }

    // Sort by value (descending for top, ascending for bottom)
    const sortedByValue = [...regionsWithValues].sort((a, b) => b.value - a.value);
    
    // Get top 5 and bottom 5
    const topRegions = sortedByValue.slice(0, 5);
    const bottomRegions = sortedByValue.slice(-5).reverse(); // Reverse to show lowest first

    const rankedData: RankedSA2Data = {
      topRegions,
      bottomRegions,
      totalRegions: regionsWithValues.length,
      selectedVariable: variableName
    };

    console.log('✅ InsightsLandingRankings: Rankings calculated');
    console.log('🔝 Top 5 regions:', topRegions.map(r => `${r.sa2Name}: ${r.value.toLocaleString()}`));
    console.log('🔻 Bottom 5 regions:', bottomRegions.map(r => `${r.sa2Name}: ${r.value.toLocaleString()}`));

    return rankedData;
  };

  // Handle variable selection
  const handleVariableChange = (variableName: string) => {
    setSelectedVariable(variableName);
    setIsCalculating(true);
    
    // Calculate rankings with a slight delay for UX
    setTimeout(() => {
      const rankings = calculateRankings(variableName);
      setRankedData(rankings);
      setIsCalculating(false);
    }, 100);
  };

  // Handle SA2 region click - navigate to detailed page
  const handleRegionClick = (sa2Id: string, sa2Name: string) => {
    console.log('🎯 InsightsLandingRankings: Selecting SA2:', { sa2Id, sa2Name });
    
    // Find the full SA2 data object
    const sa2Data = allSA2Data[sa2Id];
    if (sa2Data && onSelectSA2) {
      onSelectSA2(sa2Data);
    } else {
      console.error('❌ InsightsLandingRankings: SA2 data not found or onSelectSA2 not provided:', { sa2Id, hasData: !!sa2Data, hasCallback: !!onSelectSA2 });
    }
  };

  // Set default variable on component mount
  useEffect(() => {
    if (availableMetrics.length > 0 && !selectedVariable) {
      // Default to population metric if available
      const defaultMetric = availableMetrics.find(m => 
        m.includes('population') || m.includes('Population')
      ) || availableMetrics[0];
      
      handleVariableChange(defaultMetric);
    }
  }, [availableMetrics, selectedVariable]);

  // Filter metrics for display (clean up names)
  const getDisplayName = (metric: string) => {
    return metric.replace(/^[^|]*\|\s*/, ''); // Remove category prefix
  };

  const getCategoryIcon = (metric: string) => {
    if (metric.includes('Economics')) return '💰';
    if (metric.includes('Demographics')) return '👥';
    if (metric.includes('Healthcare') || metric.includes('Health Sector')) return '🏥';
    if (metric.includes('Health Statistics')) return '📊';
    return '📈';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
            Regional Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-2">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
          Regional Rankings
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Explore top and bottom performing SA2 regions across Australia
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Variable Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Variable to Rank
          </label>
          <div className="relative">
            <select
              value={selectedVariable}
              onChange={(e) => handleVariableChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white pr-10"
            >
              <option value="">Choose a variable...</option>
              {availableMetrics.map((metric) => (
                <option key={metric} value={metric}>
                  {getCategoryIcon(metric)} {getDisplayName(metric)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Rankings Display */}
        {isCalculating && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Calculating rankings...</p>
          </div>
        )}

        {rankedData && !isCalculating && (
          <div className="space-y-6">
            {/* Variable Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Currently Showing</h4>
              <p className="text-sm text-blue-700">{getDisplayName(rankedData.selectedVariable)}</p>
              <p className="text-xs text-blue-600 mt-1">
                Ranked across {rankedData.totalRegions.toLocaleString()} SA2 regions
              </p>
            </div>

            {/* Top 5 Regions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-900">Top 5 Performers</span>
              </div>
              <div className="space-y-2">
                {rankedData.topRegions.map((region, index) => (
                  <button
                    key={region.sa2Id}
                    onClick={() => handleRegionClick(region.sa2Id, region.sa2Name)}
                    className="w-full bg-green-50 border border-green-200 rounded-lg p-3 hover:bg-green-100 hover:border-green-300 transition-all duration-200 cursor-pointer text-left"
                    title={`Click to analyze ${region.sa2Name}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 break-words leading-tight">
                            {region.sa2Name}
                          </div>
                          <div className="text-xs text-gray-500">
                            SA2 ID: {region.sa2Id}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-green-700 flex-shrink-0">
                        {region.value.toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom 5 Regions */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-gray-900">Bottom 5 Performers</span>
              </div>
              <div className="space-y-2">
                {rankedData.bottomRegions.map((region, index) => (
                  <button
                    key={region.sa2Id}
                    onClick={() => handleRegionClick(region.sa2Id, region.sa2Name)}
                    className="w-full bg-red-50 border border-red-200 rounded-lg p-3 hover:bg-red-100 hover:border-red-300 transition-all duration-200 cursor-pointer text-left"
                    title={`Click to analyze ${region.sa2Name}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 break-words leading-tight">
                            {region.sa2Name}
                          </div>
                          <div className="text-xs text-gray-500">
                            SA2 ID: {region.sa2Id}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-red-700 flex-shrink-0">
                        {region.value.toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedVariable && !rankedData && !isCalculating && (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No ranking data available for this variable</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 