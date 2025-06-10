'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { EnhancedChartConfiguration, SnapshotVariableOption } from './InsightsDataService';

interface QuadrantScatterRendererProps {
  config: EnhancedChartConfiguration;
  data?: any[];
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
  data: propData, 
  medianCalculations = {},
  onInteraction 
}: QuadrantScatterRendererProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [data, setData] = useState<any[]>(propData || []);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load SA2 data if not provided
  useEffect(() => {
    if (propData && propData.length > 0) {
      setData(propData);
      setIsLoading(false);
    } else {
      loadSA2Data();
    }
  }, [propData]);

  const loadSA2Data = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 QuadrantScatterRenderer: Starting SA2 data load...');
      
      const response = await fetch('/api/sa2');
      console.log('📡 QuadrantScatterRenderer: API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ QuadrantScatterRenderer: API error response:', errorText);
        throw new Error(`Failed to load SA2 data (${response.status}): ${errorText}`);
      }
      
      const result = await response.json();
      console.log('📊 QuadrantScatterRenderer: API result structure:', {
        success: result.success,
        hasData: !!result.data,
        dataType: typeof result.data,
        dataKeys: result.data ? Object.keys(result.data).length : 0
      });
      
      if (result.success && result.data) {
        // Convert SA2 data to array format
        const sa2Array = Object.entries(result.data).map(([sa2Id, sa2Data]: [string, any]) => ({
          sa2Id,
          ...sa2Data
        }));
        console.log('✅ QuadrantScatterRenderer: Successfully converted SA2 data to array format:', sa2Array.length, 'regions');
        setData(sa2Array);
      } else {
        console.error('❌ QuadrantScatterRenderer: Invalid SA2 data format:', result);
        throw new Error('Invalid SA2 data format');
      }
    } catch (error) {
      console.error('❌ QuadrantScatterRenderer: Error loading SA2 data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!chartRef.current || !data.length || !config.measureX || !config.measureY || isLoading) {
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
        top: '2%',
        textStyle: {
          fontSize: 18,
          fontWeight: '500',
          color: '#1f2937'
        }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        borderRadius: 8,
        padding: [12, 16],
        textStyle: {
          color: '#374151',
          fontSize: 13,
          lineHeight: 20
        },
        formatter: (params: any) => {
          const data = params.data;
          const xVar = getVariableName(config.measureX!);
          const yVar = getVariableName(config.measureY!);
          
          return `
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 14px; color: #1f2937;">${data.sa2Name}</div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">SA2 ID: ${data.sa2Id}</div>
            <div style="margin-bottom: 3px;"><span style="color: #6b7280;">${xVar}:</span> <strong>${formatValue(data.xValue)}</strong></div>
            <div style="margin-bottom: 3px;"><span style="color: #6b7280;">${yVar}:</span> <strong>${formatValue(data.yValue)}</strong></div>
            ${data.size ? `<div><span style="color: #6b7280;">Size:</span> <strong>${formatValue(data.size)}</strong></div>` : ''}
          `;
        }
      },
      grid: {
        left: '15%',
        right: '8%',
        top: '12%',
        bottom: '30%',
        containLabel: false
      },
      xAxis: {
        type: 'value',
        name: getVariableName(config.measureX!),
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
          fontSize: 13,
          color: '#374151',
          fontWeight: '500',
          padding: [15, 0, 0, 0]
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f3f4f6',
            width: 1,
            type: 'solid'
          }
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#d1d5db',
            width: 1.5
          }
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: '#d1d5db',
            width: 1
          },
          length: 6
        },
        axisLabel: {
          fontSize: 12,
          color: '#6b7280',
          margin: 12,
          formatter: (value: number) => {
            if (Math.abs(value) >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M`;
            } else if (Math.abs(value) >= 1000) {
              return `${(value / 1000).toFixed(1)}K`;
            }
            return value.toString();
          }
        }
      },
      yAxis: {
        type: 'value',
        name: getVariableName(config.measureY!),
        nameLocation: 'middle',
        nameGap: 60,
        nameTextStyle: {
          fontSize: 13,
          color: '#374151',
          fontWeight: '500',
          padding: [0, 0, 0, 10]
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f3f4f6',
            width: 1,
            type: 'solid'
          }
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#d1d5db',
            width: 1.5
          }
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: '#d1d5db',
            width: 1
          },
          length: 6
        },
        axisLabel: {
          fontSize: 12,
          color: '#6b7280',
          margin: 12,
          formatter: (value: number) => {
            if (Math.abs(value) >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M`;
            } else if (Math.abs(value) >= 1000) {
              return `${(value / 1000).toFixed(1)}K`;
            }
            return value.toString();
          }
        }
      },
      series: [
        {
          type: 'scatter',
          data: scatterData,
          symbolSize: (data: any) => {
            if (config.bubbleSize && data.size !== undefined) {
              return Math.max(8, Math.min(30, Math.sqrt(data.size) * 2.5));
            }
            return 12;
          },
          itemStyle: {
            color: (params: any) => {
              if (config.colorBy) {
                const colorIndex = params.dataIndex % palette.length;
                return palette[colorIndex];
              }
              return palette[0];
            },
            opacity: 0.8,
            borderColor: '#ffffff',
            borderWidth: 2,
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            shadowBlur: 4,
            shadowOffsetY: 2
          },
          emphasis: {
            itemStyle: {
              opacity: 1,
              borderWidth: 3,
              shadowColor: 'rgba(0, 0, 0, 0.2)',
              shadowBlur: 8,
              shadowOffsetY: 4
            },
            scale: true,
            scaleSize: 1.2
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
              color: '#6366f1',
              width: 2,
              type: [5, 5],
              opacity: 0.7
            },
            data: [
              {
                type: 'average',
                name: 'X Median',
                xAxis: xMedian,
                label: {
                  show: true,
                  position: 'insideMiddleBottom',
                  formatter: 'X Median',
                  fontSize: 11,
                  color: '#6366f1',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  padding: [4, 8],
                  borderRadius: 4,
                  distance: 20
                }
              },
              {
                type: 'average', 
                name: 'Y Median',
                yAxis: yMedian,
                label: {
                  show: true,
                  position: 'insideMiddleTop',
                  formatter: 'Y Median',
                  fontSize: 11,
                  color: '#6366f1',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  padding: [4, 8],
                  borderRadius: 4,
                  distance: 20
                }
              }
            ]
          }
        }]
      } : {}),
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          yAxisIndex: 0,
          throttle: 50
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          bottom: '12%',
          height: 16,
          fillerColor: 'rgba(99, 102, 241, 0.15)',
          borderColor: '#d1d5db',
          dataBackground: {
            lineStyle: {
              color: '#e5e7eb',
              width: 1
            },
            areaStyle: {
              color: 'rgba(99, 102, 241, 0.05)'
            }
          },
          selectedDataBackground: {
            lineStyle: {
              color: '#6366f1',
              width: 1.5
            },
            areaStyle: {
              color: 'rgba(99, 102, 241, 0.1)'
            }
          },
          handleIcon: 'M10.7,11.9H9.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z',
          handleSize: '100%',
          handleStyle: {
            color: '#6366f1',
            borderColor: '#ffffff',
            borderWidth: 2,
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            shadowBlur: 4
          },
          textStyle: {
            color: '#6b7280',
            fontSize: 11
          }
        },
        {
          type: 'slider',
          yAxisIndex: 0,
          right: '3%',
          width: 16,
          orient: 'vertical',
          fillerColor: 'rgba(99, 102, 241, 0.15)',
          borderColor: '#d1d5db',
          dataBackground: {
            lineStyle: {
              color: '#e5e7eb',
              width: 1
            },
            areaStyle: {
              color: 'rgba(99, 102, 241, 0.05)'
            }
          },
          selectedDataBackground: {
            lineStyle: {
              color: '#6366f1',
              width: 1.5
            },
            areaStyle: {
              color: 'rgba(99, 102, 241, 0.1)'
            }
          },
          handleIcon: 'M10.7,11.9H9.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4h1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z',
          handleSize: '100%',
          handleStyle: {
            color: '#6366f1',
            borderColor: '#ffffff',
            borderWidth: 2,
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            shadowBlur: 4
          },
          textStyle: {
            color: '#6b7280',
            fontSize: 11
          }
        }
      ],

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

    // Debug logging enabled to diagnose data loading issue
    console.log('🔍 QuadrantScatterRenderer - prepareScatterData debug:', {
      measureX: config.measureX,
      measureY: config.measureY,
      dataLength: data.length,
      sampleRecord: data[0] ? Object.keys(data[0]).slice(0, 10) : 'No data',
      fullSampleRecord: data[0] || 'No data'
    });

    const scatterData = data.map((record, index) => {
      const xValue = getRecordValue(record, config.measureX!);
      const yValue = getRecordValue(record, config.measureY!);
      const sizeValue = config.bubbleSize ? getRecordValue(record, config.bubbleSize) : undefined;

      if (xValue === null || yValue === null) {
        return null;
      }

      return {
        value: [xValue, yValue],
        sa2Id: record.sa2Id || record['SA2 ID'] || record['SA2_ID'] || record.SA2_Code || `SA2_${index}`,
        sa2Name: record.sa2Name || record['SA2 Name'] || record['SA2_Name'] || record.Name || `Region ${index + 1}`,
        xValue,
        yValue,
        size: sizeValue,
        originalRecord: record
      };
    }).filter(Boolean);

    console.log('📊 Scatter data prepared:', {
      totalRecords: data.length,
      validDataPoints: scatterData.length,
      nullDataPoints: data.length - scatterData.length,
      sampleDataPoint: scatterData[0] || 'No valid data points',
      firstFewValidPoints: scatterData.slice(0, 3),
      measureXExists: data.filter(r => getRecordValue(r, config.measureX!) !== null).length,
      measureYExists: data.filter(r => getRecordValue(r, config.measureY!) !== null).length
    });

    return scatterData;
  };

  const calculateMedians = () => {
    if (!config.measureX || !config.measureY) {
      return { xMedian: undefined, yMedian: undefined };
    }

    // Use pre-calculated medians if available, with enhanced fallback
    let xMedian = medianCalculations[config.measureX];
    let yMedian = medianCalculations[config.measureY];
    
    // If pre-calculated median not found, try alternative field name formats
    if (xMedian === undefined) {
      const xVariations = [
        config.measureX,
        config.measureX.replace(/\s\|\s/g, '_'),
        config.measureX.replace(/_/g, ' | ')
      ];
      
      for (const variation of xVariations) {
        if (medianCalculations[variation] !== undefined) {
          xMedian = medianCalculations[variation];
          break;
        }
      }
      
      // If still not found, calculate from data
      if (xMedian === undefined) {
        xMedian = calculateFieldMedian(config.measureX);
      }
    }
    
    if (yMedian === undefined) {
      const yVariations = [
        config.measureY,
        config.measureY.replace(/\s\|\s/g, '_'),
        config.measureY.replace(/_/g, ' | ')
      ];
      
      for (const variation of yVariations) {
        if (medianCalculations[variation] !== undefined) {
          yMedian = medianCalculations[variation];
          break;
        }
      }
      
      // If still not found, calculate from data
      if (yMedian === undefined) {
        yMedian = calculateFieldMedian(config.measureY);
      }
    }

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
    // EXACT MATCHING ONLY - field names now match SA2 data format exactly
    
    // Try exact match first
    if (record[fieldName] !== undefined && record[fieldName] !== null) {
      const value = Number(record[fieldName]);
      if (!isNaN(value)) {
        return value;
      }
    }
    
    // Basic format variations for backward compatibility
    const basicVariations = [
      fieldName.replace(/\s\|\s/g, '_'), // "Category | Subcategory" -> "Category_Subcategory"
      fieldName.replace(/_/g, ' | ')     // "Category_Subcategory" -> "Category | Subcategory"
    ];

    for (const variation of basicVariations) {
      if (record[variation] !== undefined && record[variation] !== null) {
        const value = Number(record[variation]);
        if (!isNaN(value)) {
          return value;
        }
      }
    }
    
    // Log field mapping failures for debugging (rare now that field names match)
    if (Math.random() < 0.01) { // Only log 1% since this should be rare now
      console.warn('🔍 Field not found in QuadrantScatterRenderer:', {
        fieldName,
        availableKeys: Object.keys(record).filter(k => k !== 'sa2Id' && k !== 'sa2Name').slice(0, 10),
        recordId: record.sa2Id || 'unknown'
      });
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

  if (isLoading) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280'
      }}>
        Loading SA2 data...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ef4444'
      }}>
        Error: {error}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280'
      }}>
        No data available
      </div>
    );
  }

  return (
    <div 
      ref={chartRef} 
      style={{ 
        width: '100%', 
        height: '100%'
      }} 
    />
  );
} 