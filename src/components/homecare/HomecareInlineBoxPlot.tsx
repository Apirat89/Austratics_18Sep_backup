'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';

interface BoxPlotStats {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  mean: number;
  count?: number;
}

interface HomecareInlineBoxPlotProps {
  fieldName: string;
  currentValue: number;
  statistics: BoxPlotStats | null;
  scope: 'nationwide' | 'state' | 'locality' | 'service_region';
  width?: number;
  height?: number;
}

const HomecareInlineBoxPlot: React.FC<HomecareInlineBoxPlotProps> = ({
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
    // Format as currency for financial fields
    if (
      fieldName.toLowerCase().includes('cost') || 
      fieldName.toLowerCase().includes('budget') ||
      fieldName.toLowerCase().includes('income') || 
      fieldName.toLowerCase().includes('expenditure') ||
      fieldName.toLowerCase().includes('surplus') ||
      fieldName.toLowerCase().includes('deficit') ||
      fieldName.toLowerCase().includes('financial') ||
      fieldName.toLowerCase().includes('pay') ||
      fieldName.toLowerCase().includes('rate') ||
      fieldName.toLowerCase().includes('hourly')
    ) {
      // Large amounts (over 1000) don't need decimal places
      // Smaller amounts (under 1000) like daily rates need decimal places
      const minimumFractionDigits = value >= 1000 ? 0 : 2;
      const maximumFractionDigits = value >= 1000 ? 0 : 2;
      
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits,
        maximumFractionDigits
      }).format(value);
    }
    
    // Format percentages
    if (fieldName.toLowerCase().includes('%') || fieldName.toLowerCase().includes('percent')) {
      return `${value.toFixed(1)}%`;
    }
    
    return value.toLocaleString();
  };

  const getScopeLabel = (scope: string) => {
    switch (scope) {
      case 'nationwide': return 'Nationwide';
      case 'state': return 'State';
      case 'locality': return 'Locality'; 
      case 'service_region': return 'Service Region';
      default: return 'Nationwide';
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
          <div className="font-semibold mb-2">{getScopeLabel(scope)} Comparison</div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span>Your provider:</span>
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
            {statistics.count && (
              <div className="flex justify-between gap-4">
                <span>Sample size:</span>
                <span>{statistics.count} providers</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomecareInlineBoxPlot; 