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

interface RadarMetric {
  name: string;
  currentValue: number;
  statistics: SA2Statistics;
  unit?: string;
}

interface SA2RadarChartProps {
  title: string;
  metrics: RadarMetric[];
  width?: number;
  height?: number;
  comparisonLevel?: 'national' | 'state' | 'sa4' | 'sa3';
  sa2Info?: {
    stateName?: string;
    sa4Name?: string;
    sa3Name?: string;
  };
}

const SA2RadarChart: React.FC<SA2RadarChartProps> = ({
  title,
  metrics,
  width = 400,
  height = 300,
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
    if (!chartRef.current || metrics.length === 0) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current);

    // Normalize values to 0-100 scale for radar chart
    const normalizeValue = (value: number, stats: SA2Statistics) => {
      const range = stats.max - stats.min;
      if (range === 0) return 50; // If no variation, put at middle
      return ((value - stats.min) / range) * 100;
    };

    // Prepare radar indicators
    const indicators = metrics.map(metric => ({
      name: metric.name.length > 15 ? metric.name.substring(0, 15) + '...' : metric.name,
      max: 100,
      min: 0
    }));

    // Prepare data series
    const currentData = metrics.map(metric => 
      normalizeValue(metric.currentValue, metric.statistics)
    );

    const medianData = metrics.map(() => 50); // Median is always at 50% on normalized scale

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
        trigger: 'item',
        formatter: (params: any) => {
          if (params.seriesIndex === 0) {
            const metricIndex = params.dataIndex;
            const metric = metrics[metricIndex];
            return `
              <div style="font-size: 12px;">
                <strong>${metric.name}</strong><br/>
                <div style="margin: 8px 0;">
                  <div>Current: <strong>${metric.currentValue.toLocaleString()}${metric.unit || ''}</strong></div>
                  <div>Median: <strong>${metric.statistics.median.toLocaleString()}${metric.unit || ''}</strong></div>
                  <div>Range: ${metric.statistics.min.toLocaleString()} - ${metric.statistics.max.toLocaleString()}${metric.unit || ''}</div>
                </div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                  Performance: <strong>${Array.isArray(params.value) ? params.value[metricIndex]?.toFixed(1) || 'N/A' : (typeof params.value === 'number' ? params.value.toFixed(1) : params.value)}%</strong> of range
                </div>
              </div>
            `;
          }
          return '';
        }
      },
      legend: {
        data: ['This SA2', 'National Median'],
        bottom: 10,
        textStyle: {
          fontSize: 12
        }
      },
      radar: {
        indicator: indicators,
        radius: '65%',
        center: ['50%', '45%'],
        axisName: {
          fontSize: 10,
          color: '#666'
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(59, 130, 246, 0.05)', 'rgba(59, 130, 246, 0.1)']
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(59, 130, 246, 0.2)'
          }
        }
      },
      series: [
        {
          name: 'Performance Comparison',
          type: 'radar',
          data: [
            {
              value: currentData,
              name: 'This SA2',
              itemStyle: {
                color: '#3b82f6'
              },
              areaStyle: {
                color: 'rgba(59, 130, 246, 0.2)'
              },
              lineStyle: {
                color: '#3b82f6',
                width: 2
              }
            },
            {
              value: medianData,
              name: 'National Median',
              itemStyle: {
                color: '#6b7280'
              },
              areaStyle: {
                color: 'rgba(107, 114, 128, 0.1)'
              },
              lineStyle: {
                color: '#6b7280',
                width: 1,
                type: 'dashed'
              }
            }
          ]
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
  }, [title, metrics, width, height]);

  if (metrics.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center" style={{ width, height }}>
        <div className="text-gray-500 text-sm">No metrics available for radar chart</div>
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
          <span>Metrics: {metrics.length}</span>
          <span>Scale: 0-100% of range</span>
        </div>
      </div>
    </div>
  );
};

export default SA2RadarChart; 