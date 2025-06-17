'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, DollarSign, Star, Users, Activity, Heart, Award } from 'lucide-react';

interface StatisticalData {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
}

interface FieldStats {
  [fieldName: string]: StatisticalData;
}

interface StatisticsData {
  metadata: {
    generatedAt: string;
    totalRecords: number;
    numericFields: number;
    geographicLevels: {
      states: number;
      postcodes: number;
      localities: number;
    };
  };
  nationwide: {
    groupName: string;
    recordCount: number;
    fields: FieldStats;
  };
  byState: Array<{
    groupName: string;
    recordCount: number;
    fields: FieldStats;
  }>;
}

// Field categories for better organization
const fieldCategories = {
  financial: {
    title: 'Financial Metrics',
    icon: DollarSign,
    fields: [
      'expenditure_total_per_day',
      'expenditure_care_nursing',
      'expenditure_administration',
      'expenditure_cleaning_laundry',
      'expenditure_accommodation_maintenance',
      'expenditure_food_catering',
      'income_total_per_day',
      'income_residents_contribution',
      'income_government_funding',
      'income_other',
      'budget_surplus_per_day',
      'care_staff_spending_last_quarter'
    ]
  },
  ratings: {
    title: 'Rating Metrics',
    icon: Star,
    fields: [
      'overall_rating_stars',
      'compliance_rating',
      'quality_measures_rating',
      'residents_experience_rating',
      'staffing_rating',
      'star_Overall Star Rating',
      'star_Compliance rating',
      'star_Quality Measures rating',
      'star_Residents\' Experience rating',
      'star_Staffing rating'
    ]
  },
  capacity: {
    title: 'Capacity & Food Service',
    icon: Users,
    fields: [
      'residential_places',
      'food_cost_per_day',
      'food_sector_average',
      'food_resident_satisfaction'
    ]
  },
  staffing: {
    title: 'Staffing & Care Minutes',
    icon: Activity,
    fields: [
      'star_[S] Registered Nurse Care Minutes - Target',
      'star_[S] Registered Nurse Care Minutes - Actual',
      'star_[S] Total Care Minutes - Target',
      'star_[S] Total Care Minutes - Actual'
    ]
  },
  quality: {
    title: 'Quality Measures',
    icon: Heart,
    fields: [
      'star_[QM] Pressure injuries*',
      'star_[QM] Restrictive practices',
      'star_[QM] Unplanned weight loss*',
      'star_[QM] Falls and major injury - falls*',
      'star_[QM] Falls and major injury - major injury from a fall*',
      'star_[QM] Medication management - polypharmacy',
      'star_[QM] Medication management - antipsychotic'
    ]
  }
};

interface ResidentialBoxPlotsProps {
  className?: string;
}

export default function ResidentialBoxPlots({ className = '' }: ResidentialBoxPlotsProps) {
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chartRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const chartInstances = useRef<{ [key: string]: echarts.ECharts }>({});

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        const response = await fetch('/maps/abs_csv/Residential_Statistics_Analysis.json');
        if (!response.ok) {
          throw new Error('Failed to load statistics data');
        }
        const data = await response.json();
        setStatisticsData(data);
      } catch (error) {
        console.error('Error loading statistics:', error);
        setError('Failed to load statistical data');
      } finally {
        setLoading(false);
      }
    };

    loadStatistics();
  }, []);

  const createBoxPlot = (fieldName: string, stats: StatisticalData, containerId: string) => {
    const container = chartRefs.current[containerId];
    if (!container || !stats || stats.count === 0) return;

    // Dispose existing chart if it exists
    if (chartInstances.current[containerId]) {
      chartInstances.current[containerId].dispose();
    }

    const chart = echarts.init(container);
    chartInstances.current[containerId] = chart;

    // Create box plot data: [min, Q1, median, Q3, max]
    const boxData = [stats.min, stats.q1, stats.median, stats.q3, stats.max];

    const option = {
      title: {
        text: fieldName.replace(/[_\[\]]/g, ' ').replace(/\*/g, ''),
        left: 'center',
        textStyle: {
          fontSize: 14,
          fontWeight: 'normal'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: function(params: any) {
          if (params.componentType === 'boxplot') {
            return `
              <strong>${fieldName}</strong><br/>
              Min: ${stats.min}<br/>
              Q1: ${stats.q1}<br/>
              Median: ${stats.median}<br/>
              Q3: ${stats.q3}<br/>
              Max: ${stats.max}<br/>
              Mean: ${stats.mean}<br/>
              IQR: ${stats.iqr}<br/>
              Count: ${stats.count}
            `;
          }
          return '';
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '20%'
      },
      xAxis: {
        type: 'category',
        data: ['Distribution'],
        axisLabel: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: 'Value',
        nameTextStyle: {
          fontSize: 12
        },
        axisLabel: {
          fontSize: 10
        }
      },
      series: [
        {
          type: 'boxplot',
          data: [boxData],
          itemStyle: {
            borderColor: '#3b82f6',
            borderWidth: 2,
            color: 'rgba(59, 130, 246, 0.3)'
          },
          emphasis: {
            itemStyle: {
              borderColor: '#1d4ed8',
              borderWidth: 3,
              color: 'rgba(29, 78, 216, 0.5)'
            }
          }
        },
        {
          type: 'scatter',
          data: [[0, stats.mean]],
          symbolSize: 8,
          itemStyle: {
            color: '#ef4444'
          },
          markPoint: {
            data: [
              {
                coord: [0, stats.mean],
                symbol: 'diamond',
                symbolSize: 8,
                itemStyle: {
                  color: '#ef4444'
                },
                label: {
                  show: true,
                  position: 'right',
                  formatter: `Mean: ${stats.mean}`,
                  fontSize: 10
                }
              }
            ]
          }
        }
      ]
    };

    chart.setOption(option);

    // Handle resize
    const handleResize = () => {
      chart.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  };

  useEffect(() => {
    if (statisticsData) {
      // Create box plots for all fields
      Object.entries(fieldCategories).forEach(([categoryKey, category]) => {
        category.fields.forEach(fieldName => {
          const stats = statisticsData.nationwide.fields[fieldName];
          if (stats && stats.count > 0) {
            const containerId = `${categoryKey}-${fieldName}`;
            setTimeout(() => createBoxPlot(fieldName, stats, containerId), 100);
          }
        });
      });
    }

    // Cleanup function
    return () => {
      Object.values(chartInstances.current).forEach(chart => {
        if (chart) chart.dispose();
      });
      chartInstances.current = {};
    };
  }, [statisticsData]);

  const formatFieldName = (fieldName: string) => {
    return fieldName
      .replace(/[_\[\]]/g, ' ')
      .replace(/\*/g, '')
      .replace(/star /g, '')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3">Loading statistical analysis...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!statisticsData) {
    return null;
  }

  return (
    <div className={`${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Statistical Analysis - Box Plots
          </CardTitle>
          <p className="text-sm text-gray-600">
            Nationwide distribution analysis for {statisticsData.metadata.numericFields} numeric variables across {statisticsData.metadata.totalRecords.toLocaleString()} facilities
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="financial" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {Object.entries(fieldCategories).map(([key, category]) => {
                const IconComponent = category.icon;
                return (
                  <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                    <IconComponent className="w-4 h-4" />
                    <span className="hidden sm:inline">{category.title.split(' ')[0]}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(fieldCategories).map(([categoryKey, category]) => (
              <TabsContent key={categoryKey} value={categoryKey}>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <category.icon className="w-5 h-5" />
                    {category.title}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.fields.map(fieldName => {
                      const stats = statisticsData.nationwide.fields[fieldName];
                      if (!stats || stats.count === 0) return null;

                      const containerId = `${categoryKey}-${fieldName}`;
                      
                      return (
                        <Card key={fieldName} className="h-80">
                          <CardContent className="p-4 h-full">
                                                       <div 
                               ref={el => { chartRefs.current[containerId] = el; }}
                               className="w-full h-full"
                             />
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  
                  {category.fields.filter(fieldName => {
                    const stats = statisticsData.nationwide.fields[fieldName];
                    return stats && stats.count > 0;
                  }).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No data available for {category.title.toLowerCase()}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 