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

interface SA2BoxPlotProps {
  metricName: string;
  currentValue: number;
  statistics: SA2Statistics;
  width?: number;
  height?: number;
  showPerformanceIndicator?: boolean;
}

const SA2BoxPlot: React.FC<SA2BoxPlotProps> = ({
  metricName,
  currentValue,
  statistics,
  width = 300,
  height = 200,
  showPerformanceIndicator = true
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [performanceLevel, setPerformanceLevel] = useState<'low' | 'medium' | 'high'>('medium');

  // Calculate performance level based on quartiles
  useEffect(() => {
    if (currentValue <= statistics.q1) {
      setPerformanceLevel('low');
    } else if (currentValue >= statistics.q3) {
      setPerformanceLevel('high');
    } else {
      setPerformanceLevel('medium');
    }
  }, [currentValue, statistics]);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current);

    // Box plot data: [min, Q1, median, Q3, max]
    const boxData = [statistics.min, statistics.q1, statistics.median, statistics.q3, statistics.max];

    const option: echarts.EChartsOption = {
      title: {
        text: metricName,
        left: 'center',
        textStyle: {
          fontSize: 12,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.seriesType === 'boxplot') {
            return `
              <div style="font-size: 12px;">
                <strong>${metricName}</strong><br/>
                <div style="margin: 8px 0;">
                  <div>Min: <strong>${statistics.min.toLocaleString()}</strong></div>
                  <div>Q1: <strong>${statistics.q1.toLocaleString()}</strong></div>
                  <div>Median: <strong>${statistics.median.toLocaleString()}</strong></div>
                  <div>Q3: <strong>${statistics.q3.toLocaleString()}</strong></div>
                  <div>Max: <strong>${statistics.max.toLocaleString()}</strong></div>
                  <div>Mean: <strong>${statistics.mean.toLocaleString()}</strong></div>
                  <div>Count: <strong>${statistics.count}</strong></div>
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
                Value: <strong style="color: ${
                  performanceLevel === 'high' ? '#10b981' : 
                  performanceLevel === 'low' ? '#ef4444' : '#f59e0b'
                }">${currentValue.toLocaleString()}</strong><br/>
                Performance: <strong>${performanceLevel.toUpperCase()}</strong>
              </div>
            `;
          }
          return '';
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '20%',
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
  }, [metricName, currentValue, statistics, performanceLevel]);

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
    <div className="bg-white border border-gray-200 rounded-lg p-4">
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