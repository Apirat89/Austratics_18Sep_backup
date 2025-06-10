'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { EnhancedChartConfiguration, SnapshotVariableOption } from './InsightsDataService';

interface QuadrantScatterRendererProps {
  config: EnhancedChartConfiguration;
  data: any[];
  medianCalculations?: Record<string, number>;
  onInteraction?: (event: any) => void;
}

const COLOR_PALETTES = {
  default: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
  healthcare: ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
  warm: ['#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#059669'],
  cool: ['#1e40af', '#0891b2', '#059669', '#7c3aed', '#be185d'],
  earth: ['#92400e', '#a16207', '#166534', '#0f766e', '#7c2d12']
};

export default function QuadrantScatterRenderer({ 
  config, 
  data, 
  medianCalculations = {},
  onInteraction 
}: QuadrantScatterRendererProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length || !config.measureX || !config.measureY) {
      return;
    }

    renderChart();

    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [config, data, medianCalculations]);

  const renderChart = () => {
    if (!chartRef.current) return;

    // Initialize or get chart instance
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }
    chartInstance.current = echarts.init(chartRef.current);

    // Prepare data for scatter plot
    const scatterData = prepareScatterData();
    const { xMedian, yMedian } = calculateMedians();
    const palette = COLOR_PALETTES[config.colorBy as keyof typeof COLOR_PALETTES] || COLOR_PALETTES.default;

    const option = {
      title: {
        text: config.name || 'Quadrant Scatter Plot',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#ddd',
        borderWidth: 1,
        textStyle: {
          color: '#333'
        },
        formatter: (params: any) => {
          const data = params.data;
          const xVar = getVariableName(config.measureX!);
          const yVar = getVariableName(config.measureY!);
          
          return `
            <div style="font-weight: bold; margin-bottom: 4px;">${data.sa2Name}</div>
            <div style="color: #666; font-size: 12px; margin-bottom: 8px;">SA2 ID: ${data.sa2Id}</div>
            <div><strong>${xVar}:</strong> ${formatValue(data.xValue)}</div>
            <div><strong>${yVar}:</strong> ${formatValue(data.yValue)}</div>
            ${data.size ? `<div><strong>Size:</strong> ${formatValue(data.size)}</div>` : ''}
          `;
        }
      },
      grid: {
        left: '12%',
        right: '10%',
        top: '15%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: getVariableName(config.measureX!),
        nameLocation: 'middle',
        nameGap: 35,
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f0f0f0'
          }
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#ddd'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: getVariableName(config.measureY!),
        nameLocation: 'middle',
        nameGap: 45,
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f0f0f0'
          }
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#ddd'
          }
        }
      },
      series: [
        {
          type: 'scatter',
          data: scatterData,
          symbolSize: (data: any) => {
            if (config.bubbleSize && data.size !== undefined) {
              return Math.max(6, Math.min(25, Math.sqrt(data.size) * 2));
            }
            return 8;
          },
          itemStyle: {
            color: (params: any) => {
              if (config.colorBy) {
                const colorIndex = params.dataIndex % palette.length;
                return palette[colorIndex];
              }
              return palette[0];
            },
            opacity: 0.7,
            borderColor: '#fff',
            borderWidth: 1
          },
          emphasis: {
            itemStyle: {
              opacity: 1,
              borderWidth: 2
            }
          }
        }
      ],
      // Add median lines as markLines
      ...(xMedian !== undefined && yMedian !== undefined ? {
        series: [{
          type: 'scatter',
          data: scatterData,
          symbolSize: (data: any) => {
            if (config.bubbleSize && data.size !== undefined) {
              return Math.max(6, Math.min(25, Math.sqrt(data.size) * 2));
            }
            return 8;
          },
          itemStyle: {
            color: (params: any) => {
              if (config.colorBy) {
                const colorIndex = params.dataIndex % palette.length;
                return palette[colorIndex];
              }
              return palette[0];
            },
            opacity: 0.7,
            borderColor: '#fff',
            borderWidth: 1
          },
          emphasis: {
            itemStyle: {
              opacity: 1,
              borderWidth: 2
            }
          },
          markLine: {
            silent: true,
            lineStyle: {
              color: '#999',
              width: 2,
              type: 'dashed'
            },
            data: [
              {
                type: 'average',
                name: 'X Median',
                xAxis: xMedian
              },
              {
                type: 'average', 
                name: 'Y Median',
                yAxis: yMedian
              }
            ]
          }
        }]
      } : {}),
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          yAxisIndex: 0
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          bottom: '5%',
          height: 20,
          fillerColor: 'rgba(30, 144, 255, 0.2)',
          borderColor: '#ccc'
        }
      ],
      brush: {
        toolbox: ['rect', 'polygon', 'clear'],
        xAxisIndex: 0,
        yAxisIndex: 0
      },
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut' as const
    };

    chartInstance.current?.setOption(option);

    // Add interaction handlers
    if (onInteraction) {
      chartInstance.current?.on('click', (params: any) => {
        onInteraction({
          type: 'click',
          data: params.data,
          seriesIndex: params.seriesIndex,
          dataIndex: params.dataIndex
        });
      });

      chartInstance.current?.on('brushselected', (params: any) => {
        onInteraction({
          type: 'brushselected',
          batch: params.batch
        });
      });
    }

    // Handle resize
    const handleResize = () => {
      chartInstance.current?.resize();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  };

  const prepareScatterData = () => {
    if (!config.measureX || !config.measureY) return [];

    return data.map((record, index) => {
      const xValue = getRecordValue(record, config.measureX!);
      const yValue = getRecordValue(record, config.measureY!);
      const sizeValue = config.bubbleSize ? getRecordValue(record, config.bubbleSize) : undefined;

      if (xValue === null || yValue === null) return null;

      return {
        value: [xValue, yValue],
        sa2Id: record['SA2 ID'] || record['SA2_ID'] || record.SA2_Code || `SA2_${index}`,
        sa2Name: record['SA2 Name'] || record['SA2_Name'] || record.Name || `Region ${index + 1}`,
        xValue,
        yValue,
        size: sizeValue,
        originalRecord: record
      };
    }).filter(Boolean);
  };

  const calculateMedians = () => {
    if (!config.measureX || !config.measureY) {
      return { xMedian: undefined, yMedian: undefined };
    }

    // Use pre-calculated medians if available
    const xMedian = medianCalculations[config.measureX] ?? calculateFieldMedian(config.measureX);
    const yMedian = medianCalculations[config.measureY] ?? calculateFieldMedian(config.measureY);

    return { xMedian, yMedian };
  };

  const calculateFieldMedian = (fieldName: string): number => {
    const values = data
      .map(record => getRecordValue(record, fieldName))
      .filter((val): val is number => val !== null && !isNaN(val))
      .sort((a, b) => a - b);

    if (values.length === 0) return 0;
    
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0 
      ? (values[mid - 1] + values[mid]) / 2 
      : values[mid];
  };

  const getRecordValue = (record: any, fieldName: string): number | null => {
    // Try different possible field name variations
    const possibleKeys = [
      fieldName,
      fieldName.replace(/\s+/g, '_'),
      fieldName.replace(/_/g, ' '),
      `${fieldName}_Amount`,
      `${fieldName}Amount`,
      fieldName.toLowerCase(),
      fieldName.toUpperCase()
    ];

    for (const key of possibleKeys) {
      if (record[key] !== undefined && record[key] !== null) {
        const value = Number(record[key]);
        return isNaN(value) ? null : value;
      }
    }

    return null;
  };

  const getVariableName = (fieldName: string): string => {
    // Convert technical field names to user-friendly names
    return fieldName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  };

  const formatValue = (value: number): string => {
    if (value === null || value === undefined) return 'N/A';
    
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    } else if (value % 1 === 0) {
      return value.toString();
    } else {
      return value.toFixed(2);
    }
  };

  return (
    <div 
      ref={chartRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '400px'
      }} 
    />
  );
} 