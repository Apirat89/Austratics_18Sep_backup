'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Globe, Building, MapPin, Home } from 'lucide-react';

interface StatisticalData {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
}

interface FieldStats {
  [fieldName: string]: StatisticalData;
}

interface StatisticsData {
  metadata: {
    generatedAt: string;
    totalRecords: number;
    numericFields: number;
    geographicLevels: {
      states: number;
      postcodes: number;
      localities: number;
    };
  };
  nationwide: {
    groupName: string;
    recordCount: number;
    fields: FieldStats;
  };
  byState: Array<{
    groupName: string;
    recordCount: number;
    fields: FieldStats;
  }>;
  byPostcode: Array<{
    groupName: string;
    recordCount: number;
    fields: FieldStats;
  }>;
  byLocality: Array<{
    groupName: string;
    recordCount: number;
    fields: FieldStats;
  }>;
}

interface ResidentialFacility {
  "Service Name": string;
  address_state?: string;
  address_postcode?: string;
  address_locality?: string;
  [key: string]: any;
}

type GeographicScope = 'nationwide' | 'state' | 'postcode' | 'locality';

interface TabBoxPlotsProps {
  selectedFacility: ResidentialFacility;
  fields: string[];
  title: string;
  className?: string;
}

export default function TabBoxPlots({ selectedFacility, fields, title, className = '' }: TabBoxPlotsProps) {
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<GeographicScope>('nationwide');
  const chartRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const chartInstances = useRef<{ [key: string]: echarts.ECharts }>({});

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const response = await fetch('/maps/abs_csv/Residential_Statistics_Analysis.json');
        if (!response.ok) {
          throw new Error('Failed to load statistics data');
        }
        const data = await response.json();
        setStatisticsData(data);
      } catch (error) {
        console.error('Error loading statistics:', error);
        setError('Failed to load statistical data');
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, []);

  const getStatisticsForScope = () => {
    if (!statisticsData) return null;
    
    switch (selectedScope) {
      case 'nationwide':
        return statisticsData.nationwide;
      case 'state':
        return statisticsData.byState.find(s => s.groupName === selectedFacility.address_state);
      case 'postcode':
        return statisticsData.byPostcode.find(p => p.groupName === selectedFacility.address_postcode);
      case 'locality':
        return statisticsData.byLocality.find(l => l.groupName === selectedFacility.address_locality);
      default:
        return statisticsData.nationwide;
    }
  };

  const createHorizontalBoxPlot = (fieldName: string, stats: StatisticalData | null, facilityValue: number | undefined, containerId: string) => {
    const container = chartRefs.current[containerId];
    if (!container || facilityValue === undefined) return;

    // Dispose existing chart if it exists
    if (chartInstances.current[containerId]) {
      chartInstances.current[containerId].dispose();
    }

    const chart = echarts.init(container);
    chartInstances.current[containerId] = chart;

    // Determine if we have comparison statistics
    const hasStats = stats && stats.count > 0;
    
    // Create series based on available data
    const series: any[] = [];
    
    // Add horizontal box plot if statistics are available
    if (hasStats) {
      const boxData = [stats.min, stats.q1, stats.median, stats.q3, stats.max];
      series.push({
        type: 'boxplot',
        data: [boxData],
        itemStyle: {
          borderColor: '#3b82f6',
          borderWidth: 2,
          color: 'rgba(59, 130, 246, 0.3)'
        },
        emphasis: {
          itemStyle: {
            borderColor: '#1d4ed8',
            borderWidth: 3,
            color: 'rgba(29, 78, 216, 0.5)'
          }
        }
      });
    }
    
    // Always add facility value as red dot
    series.push({
      type: 'scatter',
      data: [[facilityValue, 0]],
      symbolSize: 12,
      itemStyle: {
        color: '#ef4444'
      },
      markPoint: {
        data: [
          {
            coord: [facilityValue, 0],
            symbol: 'diamond',
            symbolSize: 12,
            itemStyle: {
              color: '#ef4444'
            },
            label: {
              show: true,
              position: 'top',
              formatter: `${facilityValue}`,
              fontSize: 11,
              fontWeight: 'bold'
            }
          }
        ]
      }
    });

    const option = {
      title: {
        text: fieldName.replace(/[_\[\]]/g, ' ').replace(/\*/g, '').replace(/star /g, ''),
        left: 'center',
        textStyle: {
          fontSize: 13,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: function(params: any) {
          if (params.componentType === 'boxplot' && hasStats) {
            return `
              <strong>${fieldName}</strong><br/>
              Min: ${stats.min}<br/>
              Q1: ${stats.q1}<br/>
              Median: ${stats.median}<br/>
              Q3: ${stats.q3}<br/>
              Max: ${stats.max}<br/>
              Mean: ${stats.mean}<br/>
              IQR: ${stats.iqr}<br/>
              Count: ${stats.count}<br/>
              <hr/>
              <strong>Facility Value: ${facilityValue}</strong>
            `;
          } else if (params.componentType === 'scatter') {
            return `
              <strong>${fieldName}</strong><br/>
              Facility Value: ${facilityValue}<br/>
              ${hasStats ? '' : '(No comparison data available)'}
            `;
          }
          return '';
        }
      },
      grid: {
        left: '15%',
        right: '15%',
        bottom: '20%',
        top: '25%'
      },
      xAxis: {
        type: 'value',
        name: 'Value',
        nameTextStyle: {
          fontSize: 11
        },
        axisLabel: {
          fontSize: 10
        }
      },
      yAxis: {
        type: 'category',
        data: ['Distribution'],
        axisLabel: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLine: {
          show: false
        }
      },
      series
    };

    chart.setOption(option);

    // Handle resize
    const handleResize = () => {
      chart.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  };

  useEffect(() => {
    if (statisticsData) {
      const currentStats = getStatisticsForScope();
      
      // Clear existing charts
      Object.values(chartInstances.current).forEach(chart => {
        if (chart) chart.dispose();
      });
      chartInstances.current = {};
      
      // Create horizontal box plots for specified fields
      fields.forEach(fieldName => {
        const stats = currentStats?.fields[fieldName];
        const facilityValue = selectedFacility[fieldName] as number;
        const containerId = `tab-${fieldName}`;
        
        // Create chart if facility has this value
        if (facilityValue !== undefined && facilityValue !== null) {
          setTimeout(() => createHorizontalBoxPlot(fieldName, stats || null, facilityValue, containerId), 100);
        }
      });
    }
  }, [statisticsData, selectedScope, selectedFacility, fields]);

  // Cleanup function
  useEffect(() => {
    return () => {
      Object.values(chartInstances.current).forEach(chart => {
        if (chart) chart.dispose();
      });
      chartInstances.current = {};
    };
  }, []);

  if (loading) {
    return (
      <div className={`${className} mt-4`}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm">Loading statistical analysis...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} mt-4`}>
        <Card>
          <CardContent className="p-4">
            <div className="text-center text-red-600 text-sm">
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statisticsData) {
    return null;
  }

  const currentStats = getStatisticsForScope();
  const scopeLabels = {
    nationwide: 'Nationwide',
    state: selectedFacility.address_state || 'State',
    postcode: selectedFacility.address_postcode || 'Postcode', 
    locality: selectedFacility.address_locality || 'Locality'
  };

  // Filter fields to only show those with data
  const fieldsWithData = fields.filter(fieldName => {
    const facilityValue = selectedFacility[fieldName] as number;
    return facilityValue !== undefined && facilityValue !== null;
  });

  if (fieldsWithData.length === 0) {
    return null;
  }

  return (
    <div className={`${className} mt-4`}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-4 h-4" />
            {title} - Statistical Comparison
          </CardTitle>
          <p className="text-xs text-gray-600">
            Compare facility values against statistical distributions
          </p>
          
          {/* Geographic Scope Toggle */}
          <div className="flex flex-wrap gap-1 mt-3">
            <span className="text-xs font-medium text-gray-700">Compare against:</span>
            {(['nationwide', 'state', 'postcode', 'locality'] as GeographicScope[]).map((scope) => {
              const isAvailable = scope === 'nationwide' || 
                (scope === 'state' && selectedFacility.address_state) ||
                (scope === 'postcode' && selectedFacility.address_postcode) ||
                (scope === 'locality' && selectedFacility.address_locality);
              
              const icons = {
                nationwide: Globe,
                state: Building,
                postcode: MapPin,
                locality: Home
              };
              const IconComponent = icons[scope];
              
              return (
                <button
                  key={scope}
                  onClick={() => setSelectedScope(scope)}
                  disabled={!isAvailable}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    selectedScope === scope
                      ? 'bg-blue-600 text-white'
                      : isAvailable
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <IconComponent className="w-3 h-3" />
                  {scopeLabels[scope]}
                </button>
              );
            })}
          </div>
          
          {currentStats && (
            <p className="text-xs text-gray-500 mt-1">
              Comparing against {currentStats.recordCount.toLocaleString()} facilities in {scopeLabels[selectedScope]}
            </p>
          )}
          {!currentStats && selectedScope !== 'nationwide' && (
            <p className="text-xs text-orange-600 mt-1">
              No comparison data available for {scopeLabels[selectedScope]}. Showing facility values only.
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fieldsWithData.map(fieldName => {
              const containerId = `tab-${fieldName}`;
              
              return (
                <Card key={fieldName} className="h-32">
                  <CardContent className="p-2 h-full">
                    <div 
                      ref={el => { chartRefs.current[containerId] = el; }}
                      className="w-full h-full"
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 