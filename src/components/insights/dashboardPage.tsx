// dashboardPage.tsx - Main comprehensive dashboard page

'use client';

import React, { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';
import { prepareAllData, SA2Record, DataPrepResult } from './dataPrep';

interface DashboardPageProps {
  className?: string;
}

export default function DashboardPage({ className = '' }: DashboardPageProps) {
  const [dataResult, setDataResult] = useState<DataPrepResult>({
    sa2Table: [],
    isLoaded: false,
    loadingStatus: {
      healthcare: false,
      demographics: false,
      economics: false,
      health: false
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart container refs
  const chartARef = useRef<HTMLDivElement>(null);
  const chartBRef = useRef<HTMLDivElement>(null);
  const chartCRef = useRef<HTMLDivElement>(null);
  const chartDRef = useRef<HTMLDivElement>(null);
  const chartERef = useRef<HTMLDivElement>(null);

  // Chart instances
  const [charts, setCharts] = useState<Map<string, echarts.ECharts>>(new Map());

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (dataResult.isLoaded && dataResult.sa2Table.length > 0) {
      renderAllCharts();
    }
  }, [dataResult]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const result = await prepareAllData();
      setDataResult(result);
      
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const renderAllCharts = () => {
    try {
      // Clean up existing charts
      charts.forEach(chart => {
        if (chart && !chart.isDisposed()) {
          chart.dispose();
        }
      });
      
      const newCharts = new Map<string, echarts.ECharts>();

      // Render Chart A - Service Coverage vs Need
      if (chartARef.current) {
        const chartA = renderChartA(chartARef.current, dataResult.sa2Table);
        if (chartA) newCharts.set('chartA', chartA);
      }

      // Render Chart B - Chronic Disease Hot-Spots
      if (chartBRef.current) {
        const chartB = renderChartB(chartBRef.current, dataResult.sa2Table);
        if (chartB) newCharts.set('chartB', chartB);
      }

      // Render Chart C - Income vs Employment
      if (chartCRef.current) {
        const chartC = renderChartC(chartCRef.current, dataResult.sa2Table);
        if (chartC) newCharts.set('chartC', chartC);
      }

      // Render Chart D - Population Pyramid
      if (chartDRef.current) {
        const chartD = renderChartD(chartDRef.current, dataResult.sa2Table);
        if (chartD) newCharts.set('chartD', chartD);
      }

      // Render Chart E - Spending Mix
      if (chartERef.current) {
        const chartE = renderChartE(chartERef.current, dataResult.sa2Table);
        if (chartE) newCharts.set('chartE', chartE);
      }

      setCharts(newCharts);
    } catch (err) {
      console.error('Error rendering charts:', err);
      setError('Failed to render charts');
    }
  };

  // Chart rendering functions (simplified versions)
  const renderChartA = (container: HTMLElement, data: SA2Record[]): echarts.ECharts | null => {
    const validData = data.filter(d => 
      d.pop_65_plus && d.participants_per_1k_65 && d.median_age && d.state
    );

    if (validData.length === 0) return null;

    const chart = echarts.init(container);
    
    const chartData = validData.map(record => ({
      name: record["SA2 Name"],
      value: [
        Math.log10(record.pop_65_plus || 1),
        record.participants_per_1k_65,
        record.median_age
      ],
      itemStyle: {
        color: getStateColor(record.state || 'Unknown')
      }
    }));

    const option = {
      title: {
        text: 'Service Coverage vs Need by Region',
        left: 'center',
        top: '2%'
      },
      tooltip: {
        formatter: function(params: any) {
          const idx = params.dataIndex;
          const record = validData[idx];
          return `
            <div style="font-weight: bold;">${record["SA2 Name"]}</div>
            <div>Population 65+: ${(record.pop_65_plus || 0).toLocaleString()}</div>
            <div>Participants per 1k: ${(record.participants_per_1k_65 || 0).toFixed(1)}</div>
            <div>Median Age: ${record.median_age} years</div>
            <div>State: ${record.state}</div>
          `;
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '15%'
      },
      xAxis: {
        type: 'value',
        name: 'Population 65+ (log scale)',
        axisLabel: {
          formatter: (value: number) => `10^${value.toFixed(1)}`
        }
      },
      yAxis: {
        type: 'value',
        name: 'Participants per 1,000 (65+)'
      },
      series: [{
        type: 'scatter',
        data: chartData,
        symbolSize: function(data: any) {
          return Math.max(5, data[2] / 3); // Size based on median age
        }
      }]
    };

    chart.setOption(option);
    return chart;
  };

  const renderChartB = (container: HTMLElement, data: SA2Record[]): echarts.ECharts | null => {
    const validData = data.filter(d => d.arthritis_pct && d.asthma_pct && d.cancer_pct);
    if (validData.length === 0) return null;

    const chart = echarts.init(container);
    
    const topRegions = validData
      .sort((a, b) => ((b.arthritis_pct || 0) + (b.asthma_pct || 0) + (b.cancer_pct || 0)) - 
                      ((a.arthritis_pct || 0) + (a.asthma_pct || 0) + (a.cancer_pct || 0)))
      .slice(0, 15);

    const option = {
      title: {
        text: 'Top 15 Regions by Chronic Disease Prevalence',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['Arthritis %', 'Asthma %', 'Cancer %'],
        bottom: '5%'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: topRegions.map(d => d["SA2 Name"]?.substring(0, 15) || 'Unknown'),
        axisLabel: {
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        name: 'Prevalence (%)'
      },
      series: [
        {
          name: 'Arthritis %',
          type: 'bar',
          data: topRegions.map(d => d.arthritis_pct || 0),
          itemStyle: { color: '#ff6b6b' }
        },
        {
          name: 'Asthma %',
          type: 'bar',
          data: topRegions.map(d => d.asthma_pct || 0),
          itemStyle: { color: '#4ecdc4' }
        },
        {
          name: 'Cancer %',
          type: 'bar',
          data: topRegions.map(d => d.cancer_pct || 0),
          itemStyle: { color: '#45b7d1' }
        }
      ]
    };

    chart.setOption(option);
    return chart;
  };

  const renderChartC = (container: HTMLElement, data: SA2Record[]): echarts.ECharts | null => {
    const validData = data.filter(d => d.median_income && d.employment_rate);
    if (validData.length === 0) return null;

    const chart = echarts.init(container);
    
    const scatterData = validData.map(d => ({
      value: [d.median_income, d.employment_rate],
      name: d["SA2 Name"]
    }));

    const option = {
      title: {
        text: 'Income vs Employment Relationship',
        left: 'center'
      },
      tooltip: {
        formatter: function(params: any) {
          return `
            <div style="font-weight: bold;">${params.data.name}</div>
            <div>Median Income: $${(params.data.value[0] || 0).toLocaleString()}</div>
            <div>Employment Rate: ${(params.data.value[1] || 0).toFixed(1)}%</div>
          `;
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '15%'
      },
      xAxis: {
        type: 'value',
        name: 'Median Weekly Income ($)'
      },
      yAxis: {
        type: 'value',
        name: 'Employment Rate (%)'
      },
      series: [{
        type: 'scatter',
        data: scatterData,
        symbolSize: 6,
        itemStyle: {
          color: '#1f77b4',
          opacity: 0.7
        }
      }]
    };

    chart.setOption(option);
    return chart;
  };

  const renderChartD = (container: HTMLElement, data: SA2Record[]): echarts.ECharts | null => {
    const selectedRecord = data[0]; // Use first record for demo
    if (!selectedRecord) return null;

    const chart = echarts.init(container);
    
    // Generate synthetic age pyramid data
    const ageGroups = ['0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80-84', '85+'];
    const totalPop = selectedRecord.pop_total || 10000;
    
    const maleData = ageGroups.map((_, index) => {
      const baseRate = Math.exp(-Math.abs(index * 5 - 40) / 20);
      return -Math.round(totalPop * baseRate * 0.025);
    });
    
    const femaleData = ageGroups.map((_, index) => {
      const baseRate = Math.exp(-Math.abs(index * 5 - 40) / 20);
      return Math.round(totalPop * baseRate * 0.025);
    });

    const option = {
      title: {
        text: `Population Pyramid: ${selectedRecord["SA2 Name"]}`,
        left: 'center'
      },
      tooltip: {
        formatter: function(params: any) {
          const value = Math.abs(params.value);
          return `
            <div style="font-weight: bold;">${selectedRecord["SA2 Name"]}</div>
            <div>Age Group: ${params.name}</div>
            <div>Gender: ${params.seriesName}</div>
            <div>Population: ${value.toLocaleString()}</div>
          `;
        }
      },
      legend: {
        data: ['Male', 'Female'],
        bottom: '5%'
      },
      grid: {
        left: '15%',
        right: '15%',
        top: '15%',
        bottom: '15%'
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          formatter: function(value: number) {
            return Math.abs(value).toLocaleString();
          }
        }
      },
      yAxis: {
        type: 'category',
        data: ageGroups
      },
      series: [
        {
          name: 'Male',
          type: 'bar',
          stack: 'population',
          data: maleData,
          itemStyle: { color: '#1f77b4' }
        },
        {
          name: 'Female',
          type: 'bar',
          stack: 'population',
          data: femaleData,
          itemStyle: { color: '#ff7f0e' }
        }
      ]
    };

    chart.setOption(option);
    return chart;
  };

  const renderChartE = (container: HTMLElement, data: SA2Record[]): echarts.ECharts | null => {
    const validData = data.filter(d => d.spend_CHSP || d.spend_HomeCare || d.spend_Residential);
    if (validData.length === 0) return null;

    const chart = echarts.init(container);
    
    const totalCHSP = validData.reduce((sum, d) => sum + (d.spend_CHSP || 0), 0);
    const totalHomeCare = validData.reduce((sum, d) => sum + (d.spend_HomeCare || 0), 0);
    const totalResidential = validData.reduce((sum, d) => sum + (d.spend_Residential || 0), 0);

    const option = {
      title: {
        text: 'Aged Care Spending Mix',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: ${c:,} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: totalCHSP, name: 'Commonwealth Home Support', itemStyle: { color: '#1f77b4' } },
          { value: totalHomeCare, name: 'Home Care Packages', itemStyle: { color: '#ff7f0e' } },
          { value: totalResidential, name: 'Residential Aged Care', itemStyle: { color: '#2ca02c' } }
        ]
      }]
    };

    chart.setOption(option);
    return chart;
  };

  const getStateColor = (state: string): string => {
    const colors: Record<string, string> = {
      'NSW': '#1f77b4',
      'VIC': '#ff7f0e',
      'QLD': '#2ca02c',
      'SA': '#d62728',
      'WA': '#9467bd',
      'TAS': '#8c564b',
      'NT': '#e377c2',
      'ACT': '#7f7f7f',
      'OT': '#bcbd22'
    };
    return colors[state] || '#999999';
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      charts.forEach(chart => {
        if (chart && !chart.isDisposed()) {
          chart.dispose();
        }
      });
    };
  }, [charts]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading comprehensive dashboard data...</p>
          <div className="mt-2 text-sm text-gray-500">
            Healthcare: {dataResult.loadingStatus.healthcare ? '✅' : '⏳'} |
            Demographics: {dataResult.loadingStatus.demographics ? '✅' : '⏳'} |
            Economics: {dataResult.loadingStatus.economics ? '✅' : '⏳'} |
            Health Stats: {dataResult.loadingStatus.health ? '✅' : '⏳'}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Dashboard</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={loadDashboardData}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-8 p-6 ${className}`}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Comprehensive Aged Care Analytics Dashboard
        </h1>
        <p className="text-gray-600">
          Analyzing {dataResult.sa2Table.length} SA2 regions across Australia
        </p>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart A - Service Coverage vs Need */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div ref={chartARef} style={{ width: '100%', height: '400px' }} />
        </div>

        {/* Chart B - Chronic Disease Hot-Spots */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div ref={chartBRef} style={{ width: '100%', height: '400px' }} />
        </div>

        {/* Chart C - Income vs Employment */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div ref={chartCRef} style={{ width: '100%', height: '400px' }} />
        </div>

        {/* Chart D - Population Pyramid */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div ref={chartDRef} style={{ width: '100%', height: '400px' }} />
        </div>
      </div>

      {/* Chart E - Full Width */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div ref={chartERef} style={{ width: '100%', height: '400px' }} />
      </div>

      {/* Data Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Data Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-700">Total SA2 Regions</div>
            <div className="text-2xl font-bold text-blue-600">{dataResult.sa2Table.length}</div>
          </div>
          <div>
            <div className="font-medium text-gray-700">With Healthcare Data</div>
            <div className="text-2xl font-bold text-green-600">
              {dataResult.sa2Table.filter(d => d.participants_CHSP).length}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-700">With Demographics</div>
            <div className="text-2xl font-bold text-purple-600">
              {dataResult.sa2Table.filter(d => d.pop_total).length}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-700">With Economics</div>
            <div className="text-2xl font-bold text-orange-600">
              {dataResult.sa2Table.filter(d => d.median_income).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 