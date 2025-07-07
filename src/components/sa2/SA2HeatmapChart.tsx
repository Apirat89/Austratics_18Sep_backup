'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface SA2Statistics {
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
  mean: number;
  count: number;
}

interface HeatmapData {
  regionName: string;
  metrics: {
    [metricName: string]: {
      value: number;
      percentile: number;
      statistics: SA2Statistics;
    };
  };
}

interface SA2HeatmapChartProps {
  title: string;
  data: HeatmapData[];
  selectedMetrics: string[];
  width?: number;
  height?: number;
  comparisonLevel?: 'national' | 'state' | 'sa4' | 'sa3';
  sa2Info?: {
    stateName?: string;
    sa4Name?: string;
    sa3Name?: string;
  };
}

const SA2HeatmapChart: React.FC<SA2HeatmapChartProps> = ({
  title,
  data,
  selectedMetrics,
  width = 600,
  height = 400,
  comparisonLevel = 'national',
  sa2Info
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // Get comparison level display name
  const getComparisonLevelName = (): string => {
    switch (comparisonLevel) {
      case 'state': return sa2Info?.stateName ? `${sa2Info.stateName} (State)` : 'State Level';
      case 'sa4': return sa2Info?.sa4Name ? `${sa2Info.sa4Name} (SA4)` : 'SA4 Level';
      case 'sa3': return sa2Info?.sa3Name ? `${sa2Info.sa3Name} (SA3)` : 'SA3 Level';
      default: return 'National';
    }
  };

  const comparisonName = getComparisonLevelName();

  useEffect(() => {
    if (!chartRef.current || data.length === 0 || selectedMetrics.length === 0) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current);

    // Prepare data for heatmap
    const regions = data.map(d => d.regionName.length > 15 ? 
      d.regionName.substring(0, 15) + '...' : d.regionName);
    const metrics = selectedMetrics.map(m => m.length > 20 ? 
      m.substring(0, 20) + '...' : m);

    // Create heatmap data array [x, y, value]
    const heatmapData: number[][] = [];
    const tooltipData: any[][] = [];

    data.forEach((region, regionIndex) => {
      selectedMetrics.forEach((metric, metricIndex) => {
        const metricData = region.metrics[metric];
        if (metricData) {
          // Use percentile for color intensity (0-100)
          heatmapData.push([metricIndex, regionIndex, metricData.percentile]);
          tooltipData.push([metricIndex, regionIndex, {
            regionName: region.regionName,
            metricName: metric,
            value: metricData.value,
            percentile: metricData.percentile,
            statistics: metricData.statistics
          }]);
        } else {
          heatmapData.push([metricIndex, regionIndex, -1]); // No data
          tooltipData.push([metricIndex, regionIndex, null]);
        }
      });
    });

    const option: echarts.EChartsOption = {
      title: {
        text: title,
        left: 'center',
        textStyle: {
          fontSize: 14,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          const tooltipInfo = tooltipData.find(
            item => item[0] === params.data[0] && item[1] === params.data[1]
          );
          
          if (!tooltipInfo || !tooltipInfo[2]) {
            return '<div style="font-size: 12px;">No data available</div>';
          }

          const info = tooltipInfo[2];
          return `
            <div style="font-size: 12px;">
              <strong>${info.regionName}</strong><br/>
              <strong>${info.metricName}</strong><br/>
              <div style="margin: 8px 0;">
                <div>Value: <strong>${info.value.toLocaleString()}</strong></div>
                <div>Percentile: <strong>${info.percentile.toFixed(1)}%</strong></div>
              </div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                <div>National Statistics:</div>
                <div>• Median: ${info.statistics.median.toLocaleString()}</div>
                <div>• Range: ${info.statistics.min.toLocaleString()} - ${info.statistics.max.toLocaleString()}</div>
              </div>
            </div>
          `;
        }
      },
      grid: {
        height: '70%',
        top: '15%',
        left: '20%',
        right: '10%'
      },
      xAxis: {
        type: 'category',
        data: metrics,
        splitArea: {
          show: true
        },
        axisLabel: {
          fontSize: 10,
          rotate: 45,
          interval: 0
        }
      },
      yAxis: {
        type: 'category',
        data: regions,
        splitArea: {
          show: true
        },
        axisLabel: {
          fontSize: 10,
          interval: 0
        }
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '5%',
        text: ['High', 'Low'],
        textStyle: {
          fontSize: 10
        },
        inRange: {
          color: [
            '#ef4444', // Red - Low percentile
            '#f59e0b', // Yellow - Below median
            '#3b82f6', // Blue - Above median  
            '#10b981'  // Green - High percentile
          ]
        },
        formatter: ((value: any) => {
          if (typeof value === 'number') {
            if (value === -1) return 'No Data';
            return `${value.toFixed(0)}%`;
          }
          return String(value);
        }) as any
      },
      series: [
        {
          name: 'Performance Heatmap',
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: false
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1
          }
        } as any
      ]
    };

    chartInstance.current.setOption(option);

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
    };
  }, [title, data, selectedMetrics, width, height]);

  if (data.length === 0 || selectedMetrics.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center" style={{ width, height }}>
        <div className="text-gray-500 text-sm">
          {data.length === 0 ? 'No regions available' : 'No metrics selected for heatmap'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 relative">
      {/* Comparison Level Indicator - Top Right Corner */}
      <div className="absolute top-2 right-2 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-200">
        vs {comparisonName}
      </div>
      
      <div 
        ref={chartRef} 
        style={{ width: `${width}px`, height: `${height}px` }}
      />
      
      <div className="mt-2 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>Regions: {data.length}</span>
          <span>Metrics: {selectedMetrics.length}</span>
          <span>Scale: Percentile ranking (0-100%)</span>
        </div>
      </div>
    </div>
  );
};

export default SA2HeatmapChart; 