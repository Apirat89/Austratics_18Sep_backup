'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface ChartConfiguration {
  id: string;
  name: string;
  chartType: 'scatter';
  dataset: 'healthcare' | 'demographics' | 'economics' | 'healthStats';
  xAxis: string;
  yAxis: string;
  colorPalette?: string;
  createdAt: Date;
}

interface QuadrantScatterPlotProps {
  config: ChartConfiguration;
  data: any[];
  medianCalculations: {
    healthcare: any[];
    demographics: any[];
    economics: any[];
    healthStats: any[];
  } | null;
}

const COLOR_PALETTES = {
  default: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
  healthcare: ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
  warm: ['#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#16a34a'],
  cool: ['#1e40af', '#0891b2', '#059669', '#7c3aed', '#c026d3'],
  earth: ['#92400e', '#a16207', '#166534', '#374151', '#6b7280']
};

export default function QuadrantScatterPlot({ config, data, medianCalculations }: QuadrantScatterPlotProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Initialize chart if not already created
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    const chart = chartInstanceRef.current;

    // Get color palette
    const colors = COLOR_PALETTES[config.colorPalette as keyof typeof COLOR_PALETTES] || COLOR_PALETTES.default;

    // Extract X and Y values from data
    const validData = data.filter(item => {
      const xValue = getValueFromItem(item, config.xAxis);
      const yValue = getValueFromItem(item, config.yAxis);
      return xValue !== null && yValue !== null && !isNaN(xValue) && !isNaN(yValue);
    });

    if (validData.length === 0) {
      // Show empty state
      const emptyOption = {
        title: {
          text: 'No Data Available',
          subtext: 'No valid data points found for the selected variables',
          left: 'center',
          top: 'center',
          textStyle: {
            fontSize: 16,
            color: '#666'
          },
          subtextStyle: {
            fontSize: 12,
            color: '#999'
          }
        },
        grid: { show: false },
        xAxis: { show: false },
        yAxis: { show: false }
      };
      chart.setOption(emptyOption);
      return;
    }

    // Calculate medians for quadrant lines
    const xValues = validData.map(item => getValueFromItem(item, config.xAxis)).sort((a, b) => a - b);
    const yValues = validData.map(item => getValueFromItem(item, config.yAxis)).sort((a, b) => a - b);
    const medianX = xValues[Math.floor(xValues.length / 2)];
    const medianY = yValues[Math.floor(yValues.length / 2)];

    // Prepare scatter data
    const scatterData = validData.map(item => {
      const xValue = getValueFromItem(item, config.xAxis);
      const yValue = getValueFromItem(item, config.yAxis);
      const sa2Name = item['SA2 Name'] || item['SA2_Name'] || item.Name || item.Region || 'Unknown';
      const sa2Id = item['SA2 ID'] || item['SA2_ID'] || item.SA2_Code || 'Unknown';
      
      return {
        value: [xValue, yValue],
        name: sa2Name,
        sa2Id: sa2Id,
        originalData: item
      };
    });

    // Create chart option
    const option = {
      title: {
        text: config.name,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const data = params.data;
          return `
            <div style="font-weight: bold; margin-bottom: 8px;">${data.name}</div>
            <div style="margin: 4px 0;"><strong>SA2 ID:</strong> ${data.sa2Id}</div>
            <div style="margin: 4px 0;"><strong>${config.xAxis}:</strong> ${formatValue(data.value[0])}</div>
            <div style="margin: 4px 0;"><strong>${config.yAxis}:</strong> ${formatValue(data.value[1])}</div>
          `;
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 4,
        padding: 12,
        textStyle: {
          fontSize: 12
        }
      },
      grid: {
        left: '12%',
        right: '8%',
        top: '15%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: config.xAxis,
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          fontSize: 12,
          color: '#666'
        },
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisTick: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 10
        },
        splitLine: {
          lineStyle: {
            color: '#e5e7eb',
            type: 'solid'
          }
        }
      },
      yAxis: {
        type: 'value',
        name: config.yAxis,
        nameLocation: 'middle',
        nameGap: 40,
        nameTextStyle: {
          fontSize: 12,
          color: '#666'
        },
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisTick: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 10
        },
        splitLine: {
          lineStyle: {
            color: '#e5e7eb',
            type: 'solid'
          }
        }
      },
      series: [
        {
          name: 'SA2 Regions',
          type: 'scatter',
          data: scatterData,
          symbolSize: 8,
          itemStyle: {
            color: colors[0],
            opacity: 0.7,
            borderColor: '#fff',
            borderWidth: 1
          },
          emphasis: {
            itemStyle: {
              opacity: 1,
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.3)'
            }
          },
          markLine: {
            silent: true,
            lineStyle: {
              color: '#999',
              type: 'dashed',
              width: 2,
              opacity: 0.8
            },
            data: [
              {
                name: `Median ${config.xAxis}`,
                xAxis: medianX,
                label: {
                  show: true,
                  position: 'insideEndTop',
                  formatter: `Median ${config.xAxis}`,
                  fontSize: 10,
                  color: '#666',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  padding: [2, 4],
                  borderRadius: 2
                }
              },
              {
                name: `Median ${config.yAxis}`,
                yAxis: medianY,
                label: {
                  show: true,
                  position: 'insideEndRight',
                  formatter: `Median ${config.yAxis}`,
                  fontSize: 10,
                  color: '#666',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  padding: [2, 4],
                  borderRadius: 2
                }
              }
            ]
          }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none'
        },
        {
          type: 'inside',
          yAxisIndex: 0,
          filterMode: 'none'
        }
      ]
    };

    chart.setOption(option, true);

    // Handle resize
    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [config, data, medianCalculations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-96">
      <div ref={chartRef} className="w-full h-full" />
    </div>
  );
}

// Helper function to extract value from data item
function getValueFromItem(item: any, fieldName: string): number {
  if (!item || !fieldName) return 0;
  
  // Try different field name variations
  const value = item[fieldName] || 
                item[fieldName.toLowerCase()] || 
                item[fieldName.toUpperCase()] ||
                item[fieldName.replace(/\s+/g, '_')] ||
                item[fieldName.replace(/_/g, ' ')];
  
  const numValue = parseFloat(value);
  return isNaN(numValue) ? 0 : numValue;
}

// Helper function to format values for display
function formatValue(value: number): string {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  
  // Format as currency if value is large (likely income)
  if (value > 1000) {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
  
  // Format as percentage if value is small (likely rate)
  if (value <= 1) {
    return new Intl.NumberFormat('en-AU', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value);
  }
  
  // Format as number with commas
  return new Intl.NumberFormat('en-AU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(value);
} 