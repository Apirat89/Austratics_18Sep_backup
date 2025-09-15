'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, DollarSign, Star, Users, Activity, Heart, Award, Globe, Building, MapPin, Home } from 'lucide-react';
// Direct Supabase URLs used - no helper functions needed

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
  byPostcode: Array<{
    groupName: string;
    recordCount: number;
    fields: FieldStats;
  }>;
  byLocality: Array<{
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

interface ResidentialFacility {
  "Service Name": string;
  address_state?: string;
  address_postcode?: string;
  address_locality?: string;
  rooms_data?: {
    name: string;
    configuration: string;
    cost_per_day: number;
    room_size: string;
  }[];
  // Financial Variables
  expenditure_total_per_day?: number;
  expenditure_care_nursing?: number;
  expenditure_administration?: number;
  expenditure_cleaning_laundry?: number;
  expenditure_accommodation_maintenance?: number;
  expenditure_food_catering?: number;
  income_total_per_day?: number;
  income_residents_contribution?: number;
  income_government_funding?: number;
  income_other?: number;
  budget_surplus_per_day?: number;
  care_staff_spending_last_quarter?: number;
  // Rating Variables
  overall_rating_stars?: number;
  compliance_rating?: number;
  quality_measures_rating?: number;
  residents_experience_rating?: number;
  staffing_rating?: number;
  // Other numeric fields
  residential_places?: number;
  food_cost_per_day?: number;
  food_sector_average?: number;
  food_resident_satisfaction?: number;
  [key: string]: any; // For other star rating fields
}

type GeographicScope = 'nationwide' | 'state' | 'postcode' | 'locality';

interface ResidentialBoxPlotsProps {
  selectedFacility: ResidentialFacility;
  className?: string;
}

export default function ResidentialBoxPlots({ selectedFacility, className = '' }: ResidentialBoxPlotsProps) {
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScope, setSelectedScope] = useState<GeographicScope>('nationwide');
  const [activeTab, setActiveTab] = useState<string>('financial');
  const chartRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const chartInstances = useRef<{ [key: string]: echarts.ECharts }>({});

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        // Use Supabase URL for statistics data
        const supabaseUrl = 'https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public/json_data/maps/Residential_Statistics_Analysis.json';
        const response = await fetch(supabaseUrl);
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

  // Function to get statistics for selected geographic scope
  const getStatisticsForScope = () => {
    if (!statisticsData) return null;
    
    switch (selectedScope) {
      case 'state':
        return statisticsData.byState.find(s => s.groupName === selectedFacility.address_state);
      case 'postcode':
        return statisticsData.byPostcode.find(s => s.groupName === selectedFacility.address_postcode);
      case 'locality':
        return statisticsData.byLocality.find(s => s.groupName === selectedFacility.address_locality);
      default:
        return statisticsData.nationwide;
    }
  };

  const createBoxPlot = (fieldName: string, stats: StatisticalData | null, facilityValue: number | undefined, containerId: string) => {
    const container = chartRefs.current[containerId];
    if (!container || facilityValue === undefined) return;

    // Dispose existing chart if it exists
    if (chartInstances.current[containerId]) {
      chartInstances.current[containerId].dispose();
    }

    const chart = echarts.init(container);
    chartInstances.current[containerId] = chart;

    // Determine if we have comparison statistics
    const hasStats = stats && stats.count > 0;
    
    // Create series based on available data
    const series: any[] = [];
    
    // Add box plot if statistics are available
    if (hasStats) {
      const boxData = [stats.min, stats.q1, stats.median, stats.q3, stats.max];
      series.push({
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
      });
    }
    
    // Always add facility value as red dot
    series.push({
      type: 'scatter',
      data: [[0, facilityValue]],
      symbolSize: 10,
      itemStyle: {
        color: '#ef4444'
      },
      markPoint: {
        data: [
          {
            coord: [0, facilityValue],
            symbol: 'diamond',
            symbolSize: 10,
            itemStyle: {
              color: '#ef4444'
            },
            label: {
              show: true,
              position: 'right',
              formatter: `Facility: ${facilityValue}`,
              fontSize: 10
            }
          }
        ]
      }
    });

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
          if (params.componentType === 'boxplot' && hasStats) {
            return `
              <strong>${fieldName}</strong><br/>
              Min: ${stats.min}<br/>
              Q1: ${stats.q1}<br/>
              Median: ${stats.median}<br/>
              Q3: ${stats.q3}<br/>
              Max: ${stats.max}<br/>
              Mean: ${stats.mean}<br/>
              IQR: ${stats.iqr}<br/>
              Count: ${stats.count}<br/>
              <hr/>
              <strong>Facility Value: ${facilityValue}</strong>
            `;
          } else if (params.componentType === 'scatter') {
            return `
              <strong>${fieldName}</strong><br/>
              Facility Value: ${facilityValue}<br/>
              ${hasStats ? '' : '(No comparison data available)'}
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
      series
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
    if (statisticsData && activeTab) {
      const currentStats = getStatisticsForScope();
      
      // Clear existing charts for the active tab
      Object.keys(chartInstances.current).forEach(key => {
        if (key.startsWith(activeTab)) {
          chartInstances.current[key].dispose();
          delete chartInstances.current[key];
        }
      });
      
      // Create charts only for the active tab
      if (activeTab === 'rooms' && selectedFacility.rooms_data) {
        // Handle room data
        selectedFacility.rooms_data.forEach((room, index) => {
          const stats = currentStats?.fields['cost_per_day'];
          const containerId = `rooms-cost_per_day-${index}`;
          setTimeout(() => createBoxPlot(`${room.name} - Cost per Day`, stats || null, room.cost_per_day, containerId), 100);
        });
      } else if (activeTab in fieldCategories) {
        // Handle regular field categories
        const category = fieldCategories[activeTab as keyof typeof fieldCategories];
        category.fields.forEach((fieldName: string) => {
          const stats = currentStats?.fields[fieldName];
          const facilityValue = selectedFacility[fieldName] as number;
          const containerId = `${activeTab}-${fieldName}`;
          
          // Create chart if facility has this value
          if (facilityValue !== undefined && facilityValue !== null) {
            setTimeout(() => createBoxPlot(fieldName, stats || null, facilityValue, containerId), 100);
          }
        });
      }
    }
  }, [statisticsData, selectedScope, selectedFacility, activeTab]);

  useEffect(() => {
    return () => {
      Object.values(chartInstances.current).forEach(chart => {
        if (chart) chart.dispose();
      });
      chartInstances.current = {};
    };
  }, []);

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

  const currentStats = getStatisticsForScope();
  const scopeLabels = {
    nationwide: 'Nationwide',
    state: selectedFacility.address_state || 'State',
    postcode: selectedFacility.address_postcode || 'Postcode', 
    locality: selectedFacility.address_locality || 'Locality'
  };

  return (
    <div className={`${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Statistical Analysis - {selectedFacility["Service Name"]}
          </CardTitle>
          <p className="text-sm text-gray-600">
            Compare facility values against statistical distributions
          </p>
          
          {/* Geographic Scope Toggle */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-sm font-medium text-gray-700">Compare against:</span>
            {(['nationwide', 'state', 'postcode', 'locality'] as GeographicScope[]).map((scope) => {
              const isAvailable = scope === 'nationwide' || 
                (scope === 'state' && selectedFacility.address_state) ||
                (scope === 'postcode' && selectedFacility.address_postcode) ||
                (scope === 'locality' && selectedFacility.address_locality);
              
              const icons = {
                nationwide: Globe,
                state: Building,
                postcode: MapPin,
                locality: Home
              };
              const IconComponent = icons[scope];
              
              return (
                <button
                  key={scope}
                  onClick={() => setSelectedScope(scope)}
                  disabled={!isAvailable}
                  className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                    selectedScope === scope
                      ? 'bg-blue-600 text-white'
                      : isAvailable
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  {scopeLabels[scope]}
                </button>
              );
            })}
          </div>
          
          {currentStats && (
            <p className="text-xs text-gray-500 mt-2">
              Comparing against {currentStats.recordCount.toLocaleString()} facilities in {scopeLabels[selectedScope]}
            </p>
          )}
          {!currentStats && selectedScope !== 'nationwide' && (
            <p className="text-xs text-orange-600 mt-2">
              No comparison data available for {scopeLabels[selectedScope]}. Showing facility values only.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              {Object.entries(fieldCategories).map(([key, category]) => {
                const IconComponent = category.icon;
                return (
                  <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                    <IconComponent className="w-4 h-4" />
                    <span className="hidden sm:inline">{category.title.split(' ')[0]}</span>
                  </TabsTrigger>
                );
              })}
              {selectedFacility.rooms_data && selectedFacility.rooms_data.length > 0 && (
                <TabsTrigger value="rooms" className="flex items-center gap-1">
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Rooms</span>
                </TabsTrigger>
              )}
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
                      const facilityValue = selectedFacility[fieldName] as number;
                      if (facilityValue === undefined || facilityValue === null) return null;

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
                    const facilityValue = selectedFacility[fieldName] as number;
                    return facilityValue !== undefined && facilityValue !== null;
                  }).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No data available for {category.title.toLowerCase()}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}

            {/* Rooms Tab */}
            {selectedFacility.rooms_data && selectedFacility.rooms_data.length > 0 && (
              <TabsContent value="rooms">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    Room Cost Analysis
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedFacility.rooms_data.map((room, index) => {
                      const containerId = `rooms-cost_per_day-${index}`;
                      
                      return (
                        <Card key={index} className="h-80">
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
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 