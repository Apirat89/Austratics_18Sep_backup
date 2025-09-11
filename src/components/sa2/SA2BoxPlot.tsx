'use client';

import React, { useEffect, useRef, useState } from 'react';
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

interface HierarchicalStatistics {
  national: SA2Statistics;
  state?: SA2Statistics;
  sa4?: SA2Statistics;
  sa3?: SA2Statistics;
}

interface SA2BoxPlotProps {
  metricName: string;
  currentValue: number;
  statistics: SA2Statistics;
  hierarchicalStats?: HierarchicalStatistics;
  comparisonLevel?: 'national' | 'state' | 'sa4' | 'sa3';
  sa2Info?: {
    stateName?: string;
    sa4Name?: string;
    sa3Name?: string;
  };
  width?: number;
  height?: number;
  showPerformanceIndicator?: boolean;
}

const SA2BoxPlot: React.FC<SA2BoxPlotProps> = ({
  metricName,
  currentValue,
  statistics,
  hierarchicalStats,
  comparisonLevel = 'national',
  sa2Info,
  width = 300,
  height = 200,
  showPerformanceIndicator = true
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [performanceLevel, setPerformanceLevel] = useState<'low' | 'medium' | 'high'>('medium');
  
  // Extract category and subcategory from metric name
  const [category, subcategory] = metricName.split(' | ');

  // Get the appropriate statistics based on comparison level
  const getActiveStatistics = (): SA2Statistics => {
    if (hierarchicalStats) {
      switch (comparisonLevel) {
        case 'state': return hierarchicalStats.state || hierarchicalStats.national;
        case 'sa4': return hierarchicalStats.sa4 || hierarchicalStats.national;
        case 'sa3': return hierarchicalStats.sa3 || hierarchicalStats.national;
        default: return hierarchicalStats.national;
      }
    }
    return statistics;
  };

  const activeStats = getActiveStatistics();

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

  // Calculate performance level based on quartiles
  useEffect(() => {
    if (currentValue <= activeStats.q1) {
      setPerformanceLevel('low');
    } else if (currentValue >= activeStats.q3) {
      setPerformanceLevel('high');
    } else {
      setPerformanceLevel('medium');
    }
  }, [currentValue, activeStats]);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current);

    // Box plot data: [min, Q1, median, Q3, max]
    const boxData = [activeStats.min, activeStats.q1, activeStats.median, activeStats.q3, activeStats.max];

    const option: echarts.EChartsOption = {
      title: [
        {
          // Use only subcategory as the main title if available, otherwise use the full metricName
          text: subcategory || metricName,
          left: 'center',
          top: '5%',
          textStyle: {
            fontSize: 12, // Reduced from 14
            fontWeight: 'bold'
          }
        },
        {
          // Add a smaller subtitle showing the full "Category - Subcategory" format when both are available
          text: category && subcategory ? `${category} - ${subcategory}` : '',
          left: 'center',
          top: '15%',
          textStyle: {
            fontSize: 9, // Reduced from 10
            fontWeight: 'normal',
            color: '#666'
          }
        }
      ],
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.seriesType === 'boxplot') {
            return `
              <div style="font-size: 12px;">
                <strong>${category && subcategory ? `${category} - ${subcategory}` : metricName}</strong><br/>
                <div style="color: #666; font-size: 11px; margin-bottom: 8px;">Compared to: ${comparisonName}</div>
                <div style="margin: 8px 0;">
                  <div>Min: <strong>${activeStats.min.toLocaleString()}</strong></div>
                  <div>Q1: <strong>${activeStats.q1.toLocaleString()}</strong></div>
                  <div>Median: <strong>${activeStats.median.toLocaleString()}</strong></div>
                  <div>Q3: <strong>${activeStats.q3.toLocaleString()}</strong></div>
                  <div>Max: <strong>${activeStats.max.toLocaleString()}</strong></div>
                  <div>Mean: <strong>${activeStats.mean.toLocaleString()}</strong></div>
                  <div>Count: <strong>${activeStats.count}</strong></div>
                </div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                  Current Value: <strong style="color: ${
                    performanceLevel === 'high' ? '#10b981' : 
                    performanceLevel === 'low' ? '#ef4444' : '#f59e0b'
                  }">${currentValue.toLocaleString()}</strong>
                </div>
              </div>
            `;
          } else if (params.seriesType === 'scatter') {
            return `
              <div style="font-size: 12px;">
                <strong>This SA2 Region</strong><br/>
                <strong>${category && subcategory ? `${category} - ${subcategory}` : metricName}</strong>
                <div>Value: <strong style="color: ${
                  performanceLevel === 'high' ? '#10b981' : 
                  performanceLevel === 'low' ? '#ef4444' : '#f59e0b'
                }">${currentValue.toLocaleString()}</strong></div>
                <div>Performance: <strong>${performanceLevel.toUpperCase()}</strong></div>
              </div>
            `;
          }
          return '';
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '28%', // Increased from 25% to make more space for titles
        bottom: '15%'
      },
      xAxis: {
        type: 'category',
        data: ['Distribution'],
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          formatter: (value: number) => {
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'K';
            }
            return value.toString();
          }
        }
      },
      series: [
        {
          name: 'Box Plot',
          type: 'boxplot',
          data: [boxData],
          itemStyle: {
            color: '#3b82f6',
            borderColor: '#1d4ed8'
          },
          emphasis: {
            itemStyle: {
              color: '#2563eb',
              borderColor: '#1e40af'
            }
          }
        } as any,
        {
          name: 'Current Value',
          type: 'scatter',
          data: [[0, currentValue]],
          symbolSize: 8,
          itemStyle: {
            color: performanceLevel === 'high' ? '#10b981' : 
                   performanceLevel === 'low' ? '#ef4444' : '#f59e0b',
            borderColor: '#ffffff',
            borderWidth: 2
          },
          emphasis: {
            itemStyle: {
              color: performanceLevel === 'high' ? '#059669' : 
                     performanceLevel === 'low' ? '#dc2626' : '#d97706'
            }
          },
          z: 10
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
  }, [metricName, currentValue, activeStats, performanceLevel, comparisonName, subcategory, category]);

  const getPerformanceColor = () => {
    switch (performanceLevel) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'low': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getPerformanceText = () => {
    switch (performanceLevel) {
      case 'high': return 'Top 25%';
      case 'low': return 'Bottom 25%';
      default: return 'Middle 50%';
    }
  };

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
      
      {showPerformanceIndicator && (
        <div className="mt-2 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{currentValue.toLocaleString()}</span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getPerformanceColor()}`}>
            {getPerformanceText()}
          </div>
        </div>
      )}
    </div>
  );
};

export default SA2BoxPlot; 