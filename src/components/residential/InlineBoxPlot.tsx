'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

interface BoxPlotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  count: number;
  mean: number;
}

interface InlineBoxPlotProps {
  fieldName: string;
  currentValue: number;
  statistics: BoxPlotStats | null;
  scope: 'nationwide' | 'state' | 'postcode' | 'locality';
  width?: number;
  height?: number;
}

const InlineBoxPlot: React.FC<InlineBoxPlotProps> = ({
  fieldName,
  currentValue,
  statistics,
  scope,
  width = 120,
  height = 32
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    if (!chartRef.current || !statistics) return;

    // Initialize chart
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    const chart = chartInstance.current;
    
    // Box plot data: [min, Q1, median, Q3, max]
    const boxData = [statistics.min, statistics.q1, statistics.median, statistics.q3, statistics.max];
    
    const option = {
      grid: {
        left: 5,
        right: 5,
        top: 3,
        bottom: 3,
        containLabel: false
      },
      xAxis: {
        type: 'value',
        show: false,
        min: statistics.min * 0.9,
        max: statistics.max * 1.1
      },
      yAxis: {
        type: 'category',
        show: false,
        data: ['']
      },
      series: [
        {
          type: 'boxplot',
          data: [boxData],
          itemStyle: {
            borderColor: '#4F46E5',
            borderWidth: 1,
            color: 'rgba(79, 70, 229, 0.1)'
          },
          boxWidth: ['60%', '80%']
        },
        {
          type: 'scatter',
          data: [[currentValue, 0]],
          symbolSize: 8,
          itemStyle: {
            color: '#DC2626',
            borderColor: '#FFFFFF',
            borderWidth: 1
          },
          z: 10
        }
      ],
      animation: false,
      silent: false
    };

    chart.setOption(option);

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [statistics, currentValue]);

  if (!statistics) {
    return null;
  }

  const formatValue = (value: number) => {
    if (fieldName.toLowerCase().includes('rating') || fieldName.toLowerCase().includes('star')) {
      return value.toFixed(1);
    }
    if (fieldName.toLowerCase().includes('cost') || fieldName.toLowerCase().includes('income') || fieldName.toLowerCase().includes('expenditure')) {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    if (fieldName.toLowerCase().includes('%') || fieldName.toLowerCase().includes('percent')) {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  const getScopeLabel = () => {
    switch (scope) {
      case 'nationwide': return 'Australia-wide';
      case 'state': return 'State-wide';
      case 'postcode': return 'Postcode area';
      case 'locality': return 'Local area';
      default: return 'Comparison';
    }
  };

  return (
    <div className="relative inline-block ml-2">
      <div
        ref={chartRef}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="cursor-help border border-gray-200 rounded bg-transparent"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      />
      
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap">
          <div className="font-semibold mb-2">{getScopeLabel()} Comparison</div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span>Your facility:</span>
              <span className="font-medium text-red-300">{formatValue(currentValue)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Minimum:</span>
              <span>{formatValue(statistics.min)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>25th percentile:</span>
              <span>{formatValue(statistics.q1)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Median:</span>
              <span className="font-medium">{formatValue(statistics.median)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>75th percentile:</span>
              <span>{formatValue(statistics.q3)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Maximum:</span>
              <span>{formatValue(statistics.max)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Average:</span>
              <span>{formatValue(statistics.mean)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Sample size:</span>
              <span>{statistics.count.toLocaleString()} facilities</span>
            </div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

export default InlineBoxPlot; 