'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { EnhancedChartConfiguration, InsightsDataService } from './InsightsDataService';
import QuadrantScatterRenderer from './QuadrantScatterRenderer';

interface ChartRendererProps {
  config: EnhancedChartConfiguration;
  height?: string;
  width?: string;
}

export default function ChartRenderer({ config, height = '500px', width = '100%' }: ChartRendererProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataService] = useState(() => InsightsDataService.getInstance());
  const [medians, setMedians] = useState<Record<string, number>>({});

  useEffect(() => {
    // Load medians for scatter plots
    if (config.chartType === 'scatter' as any) {
      loadMedians();
    } else if (!chartRef.current) {
      return;
    } else {
      // Initialize chart instance for non-scatter charts
      chartInstance.current = echarts.init(chartRef.current);

      // Load and render chart data
      loadChartData();

      // Cleanup on unmount
      return () => {
        if (chartInstance.current) {
          chartInstance.current.dispose();
        }
      };
    }
  }, [config]);

  useEffect(() => {
    // Handle window resize
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadMedians = async () => {
    try {
      const response = await fetch('/api/sa2');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.metadata?.medians) {
          setMedians(result.metadata.medians);
        }
      }
    } catch (error) {
      console.error('Error loading medians:', error);
    }
  };

  // For scatter plots, use the QuadrantScatterRenderer which handles real SA2 data
  if (config.chartType === 'scatter' as any) {
    return (
      <div style={{ height, width }}>
        <QuadrantScatterRenderer 
          config={config}
          data={[]} // Will be loaded by QuadrantScatterRenderer
          medianCalculations={medians}
        />
      </div>
    );
  }

  const loadChartData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate configuration
      if (!config.selectedVariables || config.selectedVariables.length === 0) {
        throw new Error('No variables selected for chart');
      }

      // Generate basic chart options based on configuration
      const chartOptions = generateChartOptions(config);
      
      if (chartInstance.current) {
        chartInstance.current.setOption(chartOptions, true);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  };

  const generateChartOptions = (config: EnhancedChartConfiguration): echarts.EChartsOption => {
    // Basic chart options - this is a placeholder implementation
    // In a full implementation, this would process actual data
    const baseOptions: echarts.EChartsOption = {
      title: {
        text: config.name,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        bottom: 10,
        left: 'center'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      }
    };

    // Generate sample data based on chart type and selected variables
    switch (config.chartType) {
      case 'bar':
        return {
          ...baseOptions,
          xAxis: {
            type: 'category',
            data: ['Region A', 'Region B', 'Region C', 'Region D', 'Region E']
          },
          yAxis: {
            type: 'value',
            name: config.selectedVariables[0]?.name || 'Value'
          },
          series: [{
            name: config.selectedVariables[0]?.name || 'Data',
            type: 'bar',
            data: [120, 200, 150, 80, 70],
            itemStyle: {
              color: '#3B82F6'
            }
          }]
        };

      case 'scatter':
        return {
          ...baseOptions,
          xAxis: {
            type: 'value',
            name: config.selectedVariables[0]?.name || 'X-Axis'
          },
          yAxis: {
            type: 'value',
            name: config.selectedVariables[1]?.name || 'Y-Axis'
          },
          series: [{
            name: 'Data Points',
            type: 'scatter',
            data: [
              [10, 12], [23, 15], [45, 23], [67, 34], [89, 45],
              [12, 67], [34, 78], [56, 89], [78, 90], [90, 123]
            ],
            itemStyle: {
              color: '#10B981'
            }
          }]
        };

      case 'bubble':
        return {
          ...baseOptions,
          xAxis: {
            type: 'value',
            name: config.selectedVariables[0]?.name || 'X-Axis'
          },
          yAxis: {
            type: 'value',
            name: config.selectedVariables[1]?.name || 'Y-Axis'
          },
          series: [{
            name: 'Bubble Data',
            type: 'scatter',
            symbolSize: (data: number[]) => Math.sqrt(data[2]) * 5,
            data: [
              [10, 12, 25], [23, 15, 45], [45, 23, 35], [67, 34, 55], [89, 45, 65]
            ],
            itemStyle: {
              color: '#8B5CF6',
              opacity: 0.7
            }
          }]
        };

      case 'pie':
        return {
          ...baseOptions,
          series: [{
            name: config.selectedVariables[0]?.name || 'Data',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '50%'],
            data: [
              { value: 335, name: 'Type A' },
              { value: 310, name: 'Type B' },
              { value: 274, name: 'Type C' },
              { value: 235, name: 'Type D' },
              { value: 400, name: 'Type E' }
            ],
            itemStyle: {
              borderRadius: 5,
              borderColor: '#fff',
              borderWidth: 2
            }
          }]
        };

      case 'histogram':
        return {
          ...baseOptions,
          xAxis: {
            type: 'category',
            data: ['0-20', '20-40', '40-60', '60-80', '80-100']
          },
          yAxis: {
            type: 'value',
            name: 'Frequency'
          },
          series: [{
            name: 'Distribution',
            type: 'bar',
            data: [15, 35, 50, 25, 10],
            itemStyle: {
              color: '#F59E0B'
            }
          }]
        };

      case 'choropleth':
        return {
          ...baseOptions,
          geo: {
            map: 'australia',
            roam: true,
            itemStyle: {
              areaColor: '#E5E7EB',
              borderColor: '#9CA3AF'
            },
            emphasis: {
              itemStyle: {
                areaColor: '#3B82F6'
              }
            }
          },
          visualMap: {
            min: 0,
            max: 100,
            left: 'left',
            top: 'bottom',
            text: ['High', 'Low'],
            calculable: true,
            inRange: {
              color: ['#EBF8FF', '#1E40AF']
            }
          },
          series: [{
            name: config.selectedVariables[0]?.name || 'Data',
            type: 'map',
            map: 'australia',
            data: [
              { name: 'NSW', value: 75 },
              { name: 'VIC', value: 65 },
              { name: 'QLD', value: 85 },
              { name: 'WA', value: 55 },
              { name: 'SA', value: 45 }
            ]
          }]
        };

      default:
        return baseOptions;
    }
  };

  if (isLoading) {
    return (
      <div 
        style={{ height, width }} 
        className="flex items-center justify-center bg-gray-50 rounded-lg"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        style={{ height, width }} 
        className="flex items-center justify-center bg-red-50 rounded-lg border border-red-200"
      >
        <div className="text-center">
          <p className="text-red-600 font-medium">Error loading chart</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={loadChartData}
            className="mt-2 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Special handling for scatter plot (now includes quadrant functionality)
  if (config.chartType === 'scatter') {
    // Get unified SA2 data from global window object (loaded by insights page)
    const unifiedSA2Data = (window as any).unifiedSA2Data || {};
    const unifiedSA2Medians = (window as any).unifiedSA2Medians || {};
    
    console.log('🔍 ChartRenderer - SA2 data check:', {
      dataKeys: Object.keys(unifiedSA2Data).length,
      medianKeys: Object.keys(unifiedSA2Medians).length,
      selectedVariables: config.selectedVariables?.map(v => v.name)
    });
    
    // Convert unified data to array format for QuadrantScatterRenderer
    const sa2DataArray = Object.keys(unifiedSA2Data).map(sa2Id => ({
      sa2Id,
      sa2Name: unifiedSA2Data[sa2Id].sa2Name,
      ...unifiedSA2Data[sa2Id]
    }));
    
    // If no data available, show loading state
    if (sa2DataArray.length === 0) {
      return (
        <div 
          style={{ height, width }} 
          className="flex items-center justify-center bg-gray-50 rounded-lg"
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading SA2 data for scatter plot...</p>
            <p className="text-xs text-gray-500 mt-1">Waiting for unified dataset to load</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="relative" style={{ height, width }}>
        <QuadrantScatterRenderer
          config={config}
          data={sa2DataArray}
          medianCalculations={unifiedSA2Medians}
          onInteraction={(event) => {
            console.log('Chart interaction:', event);
          }}
        />
        
        {/* Chart overlay info */}
        <div className="absolute -top-4 -right-1 bg-white bg-opacity-95 rounded px-2 py-1 text-xs text-gray-600 shadow-sm border border-gray-200">
          <div className="font-medium">{config.chartType} • {config.selectedVariables.length} variables • {sa2DataArray.length} SA2 regions</div>
          <div className="text-xs text-gray-500 mt-1">
            {config.selectedVariables.map(v => v.name).join(', ')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={chartRef}
        style={{ height, width }}
        className="rounded-lg"
      />
      
      {/* Chart overlay info */}
      <div className="absolute top-2 right-2 bg-white bg-opacity-90 rounded px-2 py-1 text-xs text-gray-600 shadow-sm">
        <div>{config.chartType} • {config.selectedVariables.length} variables</div>
        <div className="text-xs text-gray-500 mt-1">
          {config.selectedVariables.map(v => v.name).join(', ')}
        </div>
      </div>
    </div>
  );
} 