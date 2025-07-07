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

interface RankingData {
  metricName: string;
  currentValue: number;
  statistics: SA2Statistics;
  rank: number;
  percentile: number;
  totalRegions: number;
}

interface SA2RankingChartProps {
  title: string;
  rankings: RankingData[];
  width?: number;
  height?: number;
  comparisonLevel?: 'national' | 'state' | 'sa4' | 'sa3';
  sa2Info?: {
    stateName?: string;
    sa4Name?: string;
    sa3Name?: string;
  };
}

const SA2RankingChart: React.FC<SA2RankingChartProps> = ({
  title,
  rankings,
  width = 500,
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
    if (!chartRef.current || rankings.length === 0) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current);

    // Prepare data for horizontal bar chart
    const categories = rankings.map(r => r.metricName.length > 20 ? 
      r.metricName.substring(0, 20) + '...' : r.metricName);
    const percentiles = rankings.map(r => r.percentile);
    const ranks = rankings.map(r => r.rank);

    // Color coding based on percentile performance
    const getColor = (percentile: number) => {
      if (percentile >= 75) return '#10b981'; // Green - Top 25%
      if (percentile >= 50) return '#3b82f6'; // Blue - Above median
      if (percentile >= 25) return '#f59e0b'; // Yellow - Below median
      return '#ef4444'; // Red - Bottom 25%
    };

    const colors = percentiles.map(p => getColor(p));

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
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: any) => {
          const index = params[0].dataIndex;
          const ranking = rankings[index];
          return `
            <div style="font-size: 12px;">
              <strong>${ranking.metricName}</strong><br/>
              <div style="margin: 8px 0;">
                <div>Current Value: <strong>${ranking.currentValue.toLocaleString()}</strong></div>
                <div>Rank: <strong>#${ranking.rank}</strong> out of ${ranking.totalRegions}</div>
                <div>Percentile: <strong>${ranking.percentile.toFixed(1)}%</strong></div>
              </div>
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                <div>National Statistics:</div>
                <div>• Median: ${ranking.statistics.median.toLocaleString()}</div>
                <div>• Range: ${ranking.statistics.min.toLocaleString()} - ${ranking.statistics.max.toLocaleString()}</div>
              </div>
            </div>
          `;
        }
      },
      grid: {
        left: '25%',
        right: '10%',
        top: '15%',
        bottom: '10%'
      },
      xAxis: {
        type: 'value',
        max: 100,
        min: 0,
        axisLabel: {
          formatter: '{value}%'
        },
        splitLine: {
          lineStyle: {
            color: '#e5e7eb'
          }
        }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          fontSize: 11,
          interval: 0
        }
      },
      series: [
        {
          name: 'Percentile Rank',
          type: 'bar',
          data: percentiles.map((percentile, index) => ({
            value: percentile,
            itemStyle: {
              color: colors[index]
            }
          })),
          barWidth: '60%',
          label: {
            show: true,
            position: 'right',
            formatter: (params: any) => {
              const index = params.dataIndex;
              return `#${ranks[index]} (${params.value.toFixed(1)}%)`;
            },
            fontSize: 10,
            color: '#374151'
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
  }, [title, rankings, width, height]);

  // Calculate overall performance summary
  const averagePercentile = rankings.length > 0 ? 
    rankings.reduce((sum, r) => sum + r.percentile, 0) / rankings.length : 0;

  const topQuartileCount = rankings.filter(r => r.percentile >= 75).length;
  const bottomQuartileCount = rankings.filter(r => r.percentile <= 25).length;

  if (rankings.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center" style={{ width, height }}>
        <div className="text-gray-500 text-sm">No ranking data available</div>
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
      
      {/* Performance Summary */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm font-medium text-gray-900 mb-2">Performance Summary</div>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{averagePercentile.toFixed(1)}%</div>
            <div className="text-gray-600">Avg Percentile</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{topQuartileCount}</div>
            <div className="text-gray-600">Top 25% Metrics</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{bottomQuartileCount}</div>
            <div className="text-gray-600">Bottom 25% Metrics</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SA2RankingChart; 