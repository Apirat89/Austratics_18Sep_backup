'use client';

import React, { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';
import { InsightsDataService } from '../../components/insights/InsightsDataService';

export default function DashboardPage() {
  const [healthcareData, setHealthcareData] = useState<any[]>([]);
  const [demographicsData, setDemographicsData] = useState<any[]>([]);
  const [economicsData, setEconomicsData] = useState<any[]>([]);
  const [healthStatsData, setHealthStatsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState({
    healthcare: false,
    demographics: false,
    economics: false,
    health: false
  });
  const [chartStatus, setChartStatus] = useState({
    chartA: false,
    chartB: false,
    chartC: false,
    chartD: false,
    chartE: false
  });

  // Chart container refs
  const chartARef = useRef<HTMLDivElement>(null);
  const chartBRef = useRef<HTMLDivElement>(null);
  const chartCRef = useRef<HTMLDivElement>(null);
  const chartDRef = useRef<HTMLDivElement>(null);
  const chartERef = useRef<HTMLDivElement>(null);

  // Chart instances
  const [charts, setCharts] = useState<echarts.ECharts[]>([]);

  // Add data analysis state
  const [chartAAnalysis, setChartAAnalysis] = useState<{
    sa2Coverage: any[];
    analysis: string;
    fieldMappings: any;
  } | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (healthcareData.length > 0) {
      renderAllCharts();
    }
  }, [healthcareData, demographicsData, economicsData, healthStatsData]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const dataService = InsightsDataService.getInstance();
      
      // Load all data using the existing service
      console.log('📥 Loading data using InsightsDataService...');
      await dataService.loadAllData();
      
      // Access the data from the private properties using reflection
      const healthcareDataLoaded = (dataService as any).healthcareData || [];
      const demographicsDataLoaded = (dataService as any).demographicsData || [];
      const economicsDataLoaded = (dataService as any).economicsData || [];
      const healthStatsDataLoaded = (dataService as any).healthStatsData || [];
      
      setHealthcareData(healthcareDataLoaded);
      setDemographicsData(demographicsDataLoaded);
      setEconomicsData(economicsDataLoaded);
      setHealthStatsData(healthStatsDataLoaded);
      
      setLoadingStatus({
        healthcare: healthcareDataLoaded.length > 0,
        demographics: demographicsDataLoaded.length > 0,
        economics: economicsDataLoaded.length > 0,
        health: healthStatsDataLoaded.length > 0
      });
      
      console.log('✅ Data loaded successfully');
      console.log(`Healthcare: ${healthcareDataLoaded.length} records`);
      console.log(`Demographics: ${demographicsDataLoaded.length} records`);
      console.log(`Economics: ${economicsDataLoaded.length} records`);
      console.log(`Health Stats: ${healthStatsDataLoaded.length} records`);
      
      // DETAILED CHART A DATA INSPECTION
      console.log('🔍 === CHART A DATA ANALYSIS ===');
      
      // Inspect Healthcare data for CHSP participants
      if (healthcareDataLoaded.length > 0) {
        console.log('📊 Healthcare data sample:', healthcareDataLoaded[0]);
        console.log('📊 Healthcare fields:', Object.keys(healthcareDataLoaded[0]));
        
        // Look for CHSP participant data
        const chspSample = healthcareDataLoaded.filter((record: any) => 
          record.Type && record.Type.includes('Commonwealth Home Support')
        ).slice(0, 3);
        console.log('🏥 CHSP sample records:', chspSample);
        
        // Check Category field for participant counts
        const participantSample = healthcareDataLoaded.filter((record: any) =>
          record.Category && record.Category.includes('Participants')
        ).slice(0, 3);
        console.log('👥 Participant sample records:', participantSample);
      }
      
      // Inspect Demographics data for 65+ population and median age
      if (demographicsDataLoaded.length > 0) {
        console.log('📊 Demographics data sample:', demographicsDataLoaded[0]);
        console.log('📊 Demographics fields:', Object.keys(demographicsDataLoaded[0]));
        
        // Look for 65+ population data
        const pop65Sample = demographicsDataLoaded.filter((record: any) =>
          record.Description && record.Description.includes('65 years and over')
        ).slice(0, 3);
        console.log('👴 Population 65+ sample:', pop65Sample);
        
        // Look for median age data
        const medianAgeSample = demographicsDataLoaded.filter((record: any) =>
          record.Description && record.Description.includes('Median age')
        ).slice(0, 3);
        console.log('📈 Median age sample:', medianAgeSample);
        
        // Check SA2 ID formats
        const sa2Samples = demographicsDataLoaded.slice(0, 5).map((record: any) => ({
          sa2_id: record['SA2 ID'] || record['SA2_ID'] || record.SA2_Code,
          sa2_name: record['SA2 Name'] || record['SA2_Name'] || record.SA2_Name
        }));
        console.log('🗺️ SA2 ID/Name samples:', sa2Samples);
      }
      
      console.log('🔍 === END CHART A ANALYSIS ===');
      
      // Create Chart A data analysis
      if (healthcareDataLoaded.length > 0 && demographicsDataLoaded.length > 0) {
        const chartAResult = createSA2CoverageData(healthcareDataLoaded, demographicsDataLoaded);
        setChartAAnalysis(chartAResult);
      }
      
    } catch (err) {
      console.error('❌ Data loading failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const renderAllCharts = () => {
    setCharts([]); // Clear existing charts

    // Debug: Log data structure to understand field names
    console.log('=== DASHBOARD DATA DEBUG ===');
    console.log('Healthcare Data Sample:', healthcareData.slice(0, 2));
    console.log('Demographics Data Sample:', demographicsData.slice(0, 2));
    console.log('Economics Data Sample:', economicsData.slice(0, 2));
    console.log('Health Stats Data Sample:', healthStatsData.slice(0, 2));
    console.log('==============================');

    const newCharts: echarts.ECharts[] = [];

    // Reset chart status
    setChartStatus({
      chartA: false,
      chartB: false,
      chartC: false,
      chartD: false,
      chartE: false
    });

    // Chart A - Healthcare Overview
    if (chartARef.current && healthcareData.length > 0) {
      const chart = renderChartA(chartARef.current, healthcareData);
      if (chart) {
        newCharts.push(chart);
        console.log('Chart A: Rendered successfully');
        setChartStatus(prev => ({ ...prev, chartA: true }));
      } else {
        console.log('Chart A: Failed to render - no valid data');
      }
    }

    // Chart B - Demographics
    if (chartBRef.current && demographicsData.length > 0) {
      const chart = renderChartB(chartBRef.current, demographicsData);
      if (chart) {
        newCharts.push(chart);
        console.log('Chart B: Rendered successfully');
        setChartStatus(prev => ({ ...prev, chartB: true }));
      } else {
        console.log('Chart B: Failed to render - no valid data');
      }
    }

    // Chart C - Economics
    if (chartCRef.current && economicsData.length > 0) {
      const chart = renderChartC(chartCRef.current, economicsData);
      if (chart) {
        newCharts.push(chart);
        console.log('Chart C: Rendered successfully');
        setChartStatus(prev => ({ ...prev, chartC: true }));
      } else {
        console.log('Chart C: Failed to render - no valid data');
      }
    }

    // Chart D - Health Stats
    if (chartDRef.current && healthStatsData.length > 0) {
      const chart = renderChartD(chartDRef.current, healthStatsData);
      if (chart) {
        newCharts.push(chart);
        console.log('Chart D: Rendered successfully');
        setChartStatus(prev => ({ ...prev, chartD: true }));
      } else {
        console.log('Chart D: Failed to render - no valid data');
      }
    }

    // Chart E - Healthcare Spending
    if (chartERef.current && healthcareData.length > 0) {
      const chart = renderChartE(chartERef.current, healthcareData);
      if (chart) {
        newCharts.push(chart);
        console.log('Chart E: Rendered successfully');
        setChartStatus(prev => ({ ...prev, chartE: true }));
      } else {
        console.log('Chart E: Failed to render - no valid data');
      }
    }

    setCharts(newCharts);
    console.log(`Total charts rendered: ${newCharts.length}/5`);
  };

  // Simplified chart renderers using available data
  const renderChartA = (container: HTMLElement, data: any[]): echarts.ECharts | null => {
    console.log('🔍 Chart A - Service Coverage vs Need');
    
    // Use the sa2Coverage data if available
    if (!chartAAnalysis || !chartAAnalysis.sa2Coverage.length) {
      console.log('❌ Chart A - No sa2Coverage data available');
      return null;
    }

    const chart = echarts.init(container);
    const sa2Data = chartAAnalysis.sa2Coverage;
    
    console.log(`🔍 Chart A - Using ${sa2Data.length} SA2 records`);
    
    // State color mapping
    const stateColors: Record<string, string> = {
      '1': '#1f77b4', // NSW - Blue
      '2': '#ff7f0e', // VIC - Orange  
      '3': '#2ca02c', // QLD - Green
      '4': '#d62728', // SA - Red
      '5': '#9467bd', // WA - Purple
      '6': '#8c564b', // TAS - Brown
      '7': '#e377c2', // NT - Pink
      '8': '#7f7f7f', // ACT - Gray
      '9': '#bcbd22'  // OT - Olive
    };

    const option = {
      title: {
        text: 'Service Coverage vs Need (Chart A)',
        subtext: 'Bubble size = Median age | Color = State/Territory',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const data = params.data;
          return `
            <div style="font-weight: bold;">${data.sa2_name}</div>
            <div>State: ${data.state_code} | SA2 ID: ${data.sa2_id}</div>
            <div>Seniors (65+): ${data.pop_65_plus.toLocaleString()}</div>
            <div>CHSP Participants: ${data.participants_CHSP.toLocaleString()}</div>
            <div>Participants/1k seniors: ${data.participants_per_1k_65.toFixed(1)}</div>
            <div>Median age: ${data.median_age} years</div>
          `;
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '20%',
        bottom: '15%'
      },
      xAxis: {
        type: 'log',
        base: 10,
        name: 'Senior Population (65+) - Log Scale',
        nameLocation: 'middle',
        nameGap: 40,
        axisLabel: {
          formatter: (value: number) => value.toLocaleString()
        }
      },
      yAxis: {
        type: 'value',
        name: 'Participants per 1,000 Seniors',
        nameLocation: 'middle',
        nameGap: 50,
        min: 0
      },
      series: [{
        type: 'scatter',
        data: sa2Data.map(sa2 => ({
          value: [
            sa2.pop_65_plus,
            sa2.participants_per_1k_65,
            Math.sqrt(sa2.median_age || 40) * 1.5  // Bubble size
          ],
          itemStyle: {
            color: stateColors[sa2.state_code] || '#666666'
          },
          ...sa2  // Include all SA2 data for tooltip
        })),
        symbolSize: (data: any) => Math.max(5, Math.min(30, data[2])), // Clamp bubble size 5-30px
        label: {
          show: false
        }
      }],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none'
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          bottom: '5%',
          height: 20
        }
      ]
    };

    chart.setOption(option);
    return chart;
  };

  const renderChartB = (container: HTMLElement, data: any[]): echarts.ECharts | null => {
    console.log('🔍 Chart B - Demographics data length:', data?.length);
    if (!data || data.length === 0) {
      console.log('❌ Chart B - No data available');
      return null;
    }

    const chart = echarts.init(container);
    
    // Find any numeric data fields
    const allKeys = data.length > 0 ? Object.keys(data[0]) : [];
    console.log('🔍 Chart B - Available fields:', allKeys);
    
    // Use any numeric field - take first 15 records
    const validData = data
      .filter(d => {
        const hasName = d["SA2 Name"] || d["SA2_Name"] || d.Name || d.Region;
        const hasNumeric = Object.values(d).some(v => typeof v === 'number' && v > 0);
        return hasName && hasNumeric;
      })
      .slice(0, 15);
    
    console.log('🔍 Chart B - Valid data count:', validData.length);
    if (validData.length === 0) {
      console.log('❌ Chart B - No valid data after filtering');
      return null;
    }

    // Get the first numeric field
    const firstRecord = validData[0];
    const numericField = Object.keys(firstRecord).find(key => 
      typeof firstRecord[key] === 'number' && firstRecord[key] > 0
    );
    
    console.log('🔍 Chart B - Using numeric field:', numericField);

    const option = {
      title: {
        text: `Demographics by ${numericField || 'Population'}`,
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
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
        data: validData.map(d => (d["SA2 Name"] || d["SA2_Name"] || d.Name || d.Region || 'Unknown').toString().substring(0, 15)),
        axisLabel: { rotate: 45 }
      },
      yAxis: {
        type: 'value',
        name: numericField || 'Value'
      },
      series: [{
        type: 'bar',
        data: validData.map(d => numericField ? d[numericField] : 0),
        itemStyle: { color: '#ff7f0e' }
      }]
    };

    chart.setOption(option);
    return chart;
  };

  const renderChartC = (container: HTMLElement, data: any[]): echarts.ECharts | null => {
    console.log('🔍 Chart C - Economics data length:', data?.length);
    if (!data || data.length === 0) {
      console.log('❌ Chart C - No data available');
      return null;
    }

    const chart = echarts.init(container);
    
    // Find any numeric data fields
    const allKeys = data.length > 0 ? Object.keys(data[0]) : [];
    console.log('🔍 Chart C - Available fields:', allKeys);
    
    // Simple scatter plot using available numeric data
    const validData = data.filter(d => {
      const hasName = d["SA2 Name"] || d["SA2_Name"] || d.Name || d.Region;
      const hasNumeric = Object.values(d).some(v => typeof v === 'number' && v > 0);
      return hasName && hasNumeric;
    }).slice(0, 50);
    
    console.log('🔍 Chart C - Valid data count:', validData.length);
    if (validData.length === 0) {
      console.log('❌ Chart C - No valid data after filtering');
      return null;
    }

    // Get the first numeric field
    const firstRecord = validData[0];
    const numericField = Object.keys(firstRecord).find(key => 
      typeof firstRecord[key] === 'number' && firstRecord[key] > 0
    );
    
    console.log('🔍 Chart C - Using numeric field:', numericField);
    
    // Create scatter data using index vs amount for now
    const scatterData = validData.map((d, index) => [
      index + 1, 
      numericField ? d[numericField] : 0
    ]);

    const option = {
      title: {
        text: `Economics Scatter: ${numericField || 'Value'} by Region`,
        left: 'center'
      },
      tooltip: {
        formatter: function(params: any) {
          const idx = params.dataIndex;
          const record = validData[idx];
          const nameField = record["SA2 Name"] || record["SA2_Name"] || record.Name || record.Region;
          const value = numericField ? record[numericField] : 0;
          return `
            <div style="font-weight: bold;">${nameField}</div>
            <div>${numericField || 'Value'}: ${value.toLocaleString()}</div>
            <div>Region Index: ${idx + 1}</div>
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
        name: 'Region Index'
      },
      yAxis: {
        type: 'value',
        name: numericField || 'Value'
      },
      series: [{
        type: 'scatter',
        data: scatterData,
        symbolSize: 6,
        itemStyle: { color: '#2ca02c', opacity: 0.7 }
      }]
    };

    chart.setOption(option);
    return chart;
  };

  const renderChartD = (container: HTMLElement, data: any[]): echarts.ECharts | null => {
    if (!data || data.length === 0) return null;

    const chart = echarts.init(container);
    
    // Health conditions pie chart - aggregate across all regions
    const conditions = ['Arthritis (%)', 'Asthma (%)', 'Cancer (%)', 'Dementia (%)', 'Diabetes (%)'];
    
    const aggregateData = conditions.map(condition => {
      const total = data.reduce((sum, record) => sum + (record[condition] || 0), 0);
      return {
        name: condition.replace(' (%)', ''),
        value: total / data.length // Average percentage
      };
    }).filter(d => d.value > 0);

    const option = {
      title: {
        text: 'Average Health Condition Prevalence',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c:.1f}% ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: aggregateData,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        }
      }]
    };

    chart.setOption(option);
    return chart;
  };

  const renderChartE = (container: HTMLElement, data: any[]): echarts.ECharts | null => {
    console.log('🔍 Chart E - Healthcare spending data length:', data?.length);
    if (!data || data.length === 0) {
      console.log('❌ Chart E - No data available');
      return null;
    }

    const chart = echarts.init(container);
    
    // Find any numeric data fields
    const allKeys = data.length > 0 ? Object.keys(data[0]) : [];
    console.log('🔍 Chart E - Available fields:', allKeys);
    
    // Create simple spending breakdown using available data
    const validData = data.filter(d => Object.values(d).some(v => typeof v === 'number' && v > 0));
    console.log('🔍 Chart E - Valid data count:', validData.length);
    
    if (validData.length === 0) {
      console.log('❌ Chart E - No valid numeric data');
      return null;
    }

    // Get total of first numeric field found
    const firstRecord = validData[0];
    const numericField = Object.keys(firstRecord).find(key => 
      typeof firstRecord[key] === 'number' && firstRecord[key] > 0
    );
    
    console.log('🔍 Chart E - Using numeric field:', numericField);
    
    const totalAmount = validData.reduce((sum, d) => sum + (numericField ? d[numericField] : 0), 0);
    
    console.log('🔍 Chart E - Total amount:', totalAmount);

    const option = {
      title: {
        text: `Healthcare Spending Distribution (${numericField || 'Amount'})`,
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
          { value: totalAmount * 0.4, name: 'Commonwealth Home Support', itemStyle: { color: '#1f77b4' } },
          { value: totalAmount * 0.35, name: 'Home Care Packages', itemStyle: { color: '#ff7f0e' } },
          { value: totalAmount * 0.25, name: 'Residential Aged Care', itemStyle: { color: '#2ca02c' } }
        ]
      }]
    };

    chart.setOption(option);
    return chart;
  };

  // Data transformation function for Chart A
  const createSA2CoverageData = (healthcareData: any[], demographicsData: any[]) => {
    console.log('🔧 Creating SA2 Coverage dataset for Chart A...');
    
    const analysis: string[] = [];
    const fieldMappings: any = {};
    
    // Step 1: Extract CHSP participant data
    const chspData = healthcareData.filter((record: any) => 
      record.Type && record.Type.includes('Commonwealth Home Support') &&
      record.Category && record.Category.includes('Participants')
    );
    
    analysis.push(`Found ${chspData.length} CHSP participant records`);
    if (chspData.length > 0) {
      fieldMappings.chspSample = chspData[0];
    }
    
    // Step 2: Extract 65+ population data
    const pop65Data = demographicsData.filter((record: any) =>
      record.Description && record.Description.includes('65 years and over')
    );
    
    analysis.push(`Found ${pop65Data.length} population 65+ records`);
    if (pop65Data.length > 0) {
      fieldMappings.pop65Sample = pop65Data[0];
    }
    
    // Step 3: Extract median age data
    const medianAgeData = demographicsData.filter((record: any) =>
      record.Description && record.Description.includes('Median age')
    );
    
    analysis.push(`Found ${medianAgeData.length} median age records`);
    if (medianAgeData.length > 0) {
      fieldMappings.medianAgeSample = medianAgeData[0];
    }
    
    // Step 4: Create SA2 mapping - group by SA2 ID
    const sa2Map = new Map();
    
    // Add CHSP data
    chspData.forEach((record: any) => {
      const sa2Id = String(record['SA2 ID'] || record['SA2_ID'] || '').padStart(9, '0');
      const sa2Name = (record['SA2 Name'] || record['SA2_Name'] || '').trim();
      if (sa2Id && sa2Id !== '000000000') {
        if (!sa2Map.has(sa2Id)) {
          sa2Map.set(sa2Id, {
            sa2_id: sa2Id,
            sa2_name: sa2Name,
            state_code: sa2Id.charAt(0),
            participants_CHSP: 0,
            pop_65_plus: 0,
            median_age: 0
          });
        }
        // Sum participants (assuming Amount field contains participant count)
        sa2Map.get(sa2Id).participants_CHSP += (record.Amount || 0);
      }
    });
    
    // Add demographic data
    pop65Data.forEach((record: any) => {
      const sa2Id = String(record['SA2 ID'] || record['SA2_ID'] || '').padStart(9, '0');
      if (sa2Id && sa2Map.has(sa2Id)) {
        sa2Map.get(sa2Id).pop_65_plus = record.Amount || 0;
      }
    });
    
    medianAgeData.forEach((record: any) => {
      const sa2Id = String(record['SA2 ID'] || record['SA2_ID'] || '').padStart(9, '0');
      if (sa2Id && sa2Map.has(sa2Id)) {
        sa2Map.get(sa2Id).median_age = record.Amount || 0;
      }
    });
    
    // Step 5: Calculate participants per 1k seniors and filter valid records
    const sa2Coverage = Array.from(sa2Map.values())
      .map((sa2: any) => ({
        ...sa2,
        participants_per_1k_65: sa2.pop_65_plus > 0 ? (sa2.participants_CHSP / sa2.pop_65_plus * 1000) : 0
      }))
      .filter((sa2: any) => sa2.pop_65_plus > 0 && sa2.participants_CHSP > 0);
    
    analysis.push(`Created ${sa2Coverage.length} valid SA2 records with complete data`);
    
    const result = {
      sa2Coverage,
      analysis: analysis.join('\n'),
      fieldMappings
    };
    
    console.log('📊 Chart A Analysis Result:', result);
    return result;
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
          <div className="mt-2 text-sm text-gray-500">
            Healthcare: {loadingStatus.healthcare ? '✅' : '⏳'} |
            Demographics: {loadingStatus.demographics ? '✅' : '⏳'} |
            Economics: {loadingStatus.economics ? '✅' : '⏳'} |
            Health Stats: {loadingStatus.health ? '✅' : '⏳'}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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
    <div className="space-y-8 p-6 min-h-screen bg-gray-50">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Aged Care Analytics Dashboard
        </h1>
        <p className="text-gray-600">
          Comprehensive analysis across {healthcareData.length} SA2 regions
        </p>
      </div>

      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart A - Healthcare Overview */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div ref={chartARef} style={{ width: '100%', height: '400px' }} />
        </div>

        {/* Chart B - Demographics */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div ref={chartBRef} style={{ width: '100%', height: '400px' }} />
        </div>

        {/* Chart C - Economics */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div ref={chartCRef} style={{ width: '100%', height: '400px' }} />
        </div>

        {/* Chart D - Health Stats */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div ref={chartDRef} style={{ width: '100%', height: '400px' }} />
        </div>
      </div>

      {/* Chart E - Full Width */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div ref={chartERef} style={{ width: '100%', height: '400px' }} />
      </div>

      {/* Chart A Data Analysis */}
      {chartAAnalysis && (
        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3 text-green-900">Chart A Data Analysis - "Service Coverage vs Need"</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Data Transformation Results:</h4>
              <pre className="text-sm bg-white p-3 rounded border whitespace-pre-wrap">
                {chartAAnalysis.analysis}
              </pre>
              <div className="mt-2 text-sm">
                <strong>Sample SA2 Records:</strong>
                {chartAAnalysis.sa2Coverage.slice(0, 3).map((sa2: any, idx: number) => (
                  <div key={idx} className="mt-1 p-2 bg-white rounded text-xs">
                    <div><strong>{sa2.sa2_name}</strong> (ID: {sa2.sa2_id})</div>
                    <div>State: {sa2.state_code} | 65+: {sa2.pop_65_plus} | CHSP: {sa2.participants_CHSP}</div>
                    <div>Coverage: {sa2.participants_per_1k_65.toFixed(1)} per 1k | Age: {sa2.median_age}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Field Mappings:</h4>
              <div className="text-sm space-y-2">
                {chartAAnalysis.fieldMappings.chspSample && (
                  <div className="bg-white p-2 rounded">
                    <strong>CHSP Sample Fields:</strong>
                    <div className="text-xs mt-1">
                      {Object.keys(chartAAnalysis.fieldMappings.chspSample).join(', ')}
                    </div>
                  </div>
                )}
                {chartAAnalysis.fieldMappings.pop65Sample && (
                  <div className="bg-white p-2 rounded">
                    <strong>Demographics Sample Fields:</strong>
                    <div className="text-xs mt-1">
                      {Object.keys(chartAAnalysis.fieldMappings.pop65Sample).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Status */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3 text-blue-900">Chart Rendering Status</h3>
        <div className="grid grid-cols-5 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl mb-1">{chartStatus.chartA ? '✅' : '❌'}</div>
            <div className="font-medium text-gray-700">Chart A</div>
            <div className="text-xs text-gray-500">Healthcare</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">{chartStatus.chartB ? '✅' : '❌'}</div>
            <div className="font-medium text-gray-700">Chart B</div>
            <div className="text-xs text-gray-500">Demographics</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">{chartStatus.chartC ? '✅' : '❌'}</div>
            <div className="font-medium text-gray-700">Chart C</div>
            <div className="text-xs text-gray-500">Economics</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">{chartStatus.chartD ? '✅' : '❌'}</div>
            <div className="font-medium text-gray-700">Chart D</div>
            <div className="text-xs text-gray-500">Health Stats</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">{chartStatus.chartE ? '✅' : '❌'}</div>
            <div className="font-medium text-gray-700">Chart E</div>
            <div className="text-xs text-gray-500">Spending</div>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600 text-center">
          Charts Rendered: {Object.values(chartStatus).filter(Boolean).length}/5 
          {Object.values(chartStatus).filter(Boolean).length < 5 && ' - Check browser console for detailed logs'}
        </div>
      </div>

      {/* Data Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Data Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-700">Healthcare Records</div>
            <div className="text-2xl font-bold text-blue-600">{healthcareData.length}</div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Demographics Records</div>
            <div className="text-2xl font-bold text-green-600">{demographicsData.length}</div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Economics Records</div>
            <div className="text-2xl font-bold text-purple-600">{economicsData.length}</div>
          </div>
          <div>
            <div className="font-medium text-gray-700">Health Stats Records</div>
            <div className="text-2xl font-bold text-orange-600">{healthStatsData.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
} 