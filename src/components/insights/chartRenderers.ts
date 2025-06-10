// chartRenderers.ts - Individual chart renderer functions for comprehensive dashboard

import * as echarts from 'echarts';
import { SA2Record } from './dataPrep';
import { 
  CHART_COLORS, 
  STATE_COLORS, 
  createTooltipFormatter, 
  formatValue,
  COMMON_GRID,
  COMMON_TITLE_STYLE,
  createAxisConfig,
  filterValidRecords,
  CHART_ANIMATIONS,
  setupChartResize,
  chartInteractionManager
} from './chartUtils';

// CHART A – Service Coverage vs Need (Scatter + Bubble)
export function renderChartA(containerId: string, sa2Table: SA2Record[]): echarts.ECharts | null {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found`);
    return null;
  }

  // Filter valid records with required fields
  const validData = filterValidRecords(sa2Table, ['pop_65_plus', 'participants_per_1k_65', 'median_age', 'state']);
  
  if (validData.length === 0) {
    console.warn('No valid data for Chart A');
    return null;
  }

  // Process data for chart
  const chartData = validData.map(record => ({
    name: record["SA2 Name"],
    value: [
      Math.log10(record.pop_65_plus || 1), // X-axis: log of pop_65_plus
      record.participants_per_1k_65,        // Y-axis: participants per 1k
      record.median_age,                    // Bubble size
      record.state                          // Color category
    ],
    // Keep original data for tooltip
    originalData: record
  }));

  // Create state-based color mapping
  const stateList = [...new Set(validData.map(d => d.state))];
  
  // Create chart instance
  const chart = echarts.init(container);
  
  const option = {
    title: {
      text: 'Service Coverage vs Need by Region',
      subtext: 'Bubble size = Median Age, Color = State',
      ...COMMON_TITLE_STYLE
    },
    
    // Dataset approach for transforms
    dataset: {
      source: chartData
    },
    
    // Color palette for states
    color: stateList.map(state => STATE_COLORS[state as keyof typeof STATE_COLORS] || CHART_COLORS.muted),
    
    tooltip: {
      formatter: function(params: any) {
        const data = params.data.originalData;
        const sa2Name = data['SA2 Name'] || 'Unknown SA2';
        const sa2Id = data['SA2 ID'] || '';
        
        let tooltip = `<div style="font-weight: bold; margin-bottom: 5px;">${sa2Name}</div>`;
        if (sa2Id) {
          tooltip += `<div style="color: #666; font-size: 12px; margin-bottom: 8px;">SA2 ID: ${sa2Id}</div>`;
        }
        tooltip += `
          <div style="margin: 4px 0;"><strong>Population 65+:</strong> ${formatValue(data.pop_65_plus, 'population')}</div>
          <div style="margin: 4px 0;"><strong>Participants per 1k:</strong> ${formatValue(data.participants_per_1k_65, 'participants')}</div>
          <div style="margin: 4px 0;"><strong>Median Age:</strong> ${formatValue(data.median_age, 'age')} years</div>
          <div style="margin: 4px 0;"><strong>State:</strong> ${data.state}</div>
        `;
        return tooltip;
      }
    },
    
    legend: {
      data: stateList,
      type: 'scroll',
      orient: 'horizontal',
      bottom: '5%'
    },
    
    grid: COMMON_GRID,
    
    xAxis: createAxisConfig('value', {
      name: 'Population 65+ (log scale)',
      nameLocation: 'middle',
      nameGap: 30,
      axisLabel: {
        formatter: (value: number) => `10^${value.toFixed(1)}`
      }
    }),
    
    yAxis: createAxisConfig('value', {
      name: 'Participants per 1,000 (65+)',
      nameLocation: 'middle',
      nameGap: 50
    }),
    
    // Visual map for bubble size
    visualMap: {
      dimension: 2, // median_age
      min: Math.min(...validData.map(d => d.median_age || 0)),
      max: Math.max(...validData.map(d => d.median_age || 0)),
      sizeRange: [5, 30],
      calculable: true,
      orient: 'vertical',
      right: '2%',
      top: '20%',
      text: ['High Age', 'Low Age'],
      textStyle: {
        fontSize: 12
      }
    },
    
    // Create series for each state
    series: stateList.map((state, index) => ({
      name: state,
      type: 'scatter',
      data: chartData.filter(d => d.value[3] === state),
      symbolSize: function(data: any) {
        // Size based on median_age (dimension 2)
        const age = data[2];
        const minAge = Math.min(...validData.map(d => d.median_age || 0));
        const maxAge = Math.max(...validData.map(d => d.median_age || 0));
        const normalized = (age - minAge) / (maxAge - minAge);
        return 5 + normalized * 25; // Range 5-30
      },
      itemStyle: {
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
      }
    })),
    
    ...CHART_ANIMATIONS
  };

  chart.setOption(option);
  
  // Setup resize handling
  const resizeHandler = setupChartResize(chart);
  resizeHandler.observe(container);
  
  // Register with interaction manager
  chartInteractionManager.registerChart('chartA', chart);
  
  // Add click interaction
  chart.on('click', (params: any) => {
    const sa2Id = params.data.originalData["SA2 ID"];
    if (sa2Id) {
      chartInteractionManager.selectSA2s([sa2Id]);
    }
  });

  return chart;
}

// CHART B – Chronic-Disease Hot-Spots (Small-multiple Choropleths)
export function renderChartB(containerId: string, sa2Table: SA2Record[], geoJson?: any): echarts.ECharts | null {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found`);
    return null;
  }

  // For now, create a simplified version without geoJSON
  // This would need actual SA2 boundary data to be fully functional
  const conditions: (keyof SA2Record)[] = ['arthritis_pct', 'asthma_pct', 'cancer_pct'];
  const validData = filterValidRecords(sa2Table, conditions);
  
  if (validData.length === 0) {
    console.warn('No valid data for Chart B');
    return null;
  }

  const chart = echarts.init(container);
  
  // Create a heatmap-style visualization as substitute for choropleth
  const option = {
    title: {
      text: 'Chronic Disease Hot-Spots',
      subtext: 'Top 20 SA2s by condition prevalence',
      ...COMMON_TITLE_STYLE
    },
    
    tooltip: {
      formatter: createTooltipFormatter()
    },
    
    grid: [
      { left: '7%', top: '15%', width: '25%', height: '70%' },
      { left: '37%', top: '15%', width: '25%', height: '70%' },
      { left: '67%', top: '15%', width: '25%', height: '70%' }
    ],
    
    xAxis: conditions.map((_, index) => ({
      type: 'category',
      gridIndex: index,
      data: validData
        .sort((a, b) => (b[conditions[index]] || 0) - (a[conditions[index]] || 0))
        .slice(0, 20)
        .map(d => d["SA2 Name"]?.split(' ')[0] || 'Unknown'), // Abbreviated names
      axisLabel: {
        rotate: 45,
        fontSize: 10
      }
    })),
    
    yAxis: conditions.map((_, index) => ({
      type: 'value',
      gridIndex: index,
      name: conditions[index].replace('_pct', ' %'),
      nameLocation: 'middle',
      nameGap: 40
    })),
    
    series: conditions.map((condition, index) => ({
      name: condition.replace('_pct', '').replace('_', ' '),
      type: 'bar',
      xAxisIndex: index,
      yAxisIndex: index,
      data: validData
        .sort((a, b) => (b[condition] || 0) - (a[condition] || 0))
        .slice(0, 20)
        .map(d => ({
          value: d[condition] || 0,
          name: d["SA2 Name"],
          originalData: d
        })),
      itemStyle: {
        color: function(params: any) {
          const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1'];
          return colors[index];
        }
      }
    })),
    
    ...CHART_ANIMATIONS
  };

  chart.setOption(option);
  
  const resizeHandler = setupChartResize(chart);
  resizeHandler.observe(container);
  
  chartInteractionManager.registerChart('chartB', chart);

  return chart;
}

// CHART C – Income vs Employment (Density-contour Scatter)
export function renderChartC(containerId: string, sa2Table: SA2Record[]): echarts.ECharts | null {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found`);
    return null;
  }

  const validData = filterValidRecords(sa2Table, ['median_income', 'employment_rate']);
  
  if (validData.length === 0) {
    console.warn('No valid data for Chart C');
    return null;
  }

  // Calculate national medians for quadrant lines
  const incomes = validData.map(d => d.median_income!).sort((a, b) => a - b);
  const employmentRates = validData.map(d => d.employment_rate!).sort((a, b) => a - b);
  const medianIncome = incomes[Math.floor(incomes.length / 2)];
  const medianEmployment = employmentRates[Math.floor(employmentRates.length / 2)];

  const chart = echarts.init(container);
  
  const scatterData = validData.map(d => ({
    value: [d.median_income, d.employment_rate],
    name: d["SA2 Name"],
    originalData: d
  }));

  const option = {
    title: {
      text: 'Income vs Employment Relationship',
      subtext: 'Scatter plot with national median lines',
      ...COMMON_TITLE_STYLE
    },
    
    dataset: {
      source: scatterData
    },
    
    tooltip: {
      formatter: createTooltipFormatter((params: any) => {
        const data = params.data.originalData;
        return `
          <div style="margin: 4px 0;"><strong>Median Income:</strong> ${formatValue(data.median_income, 'income')}</div>
          <div style="margin: 4px 0;"><strong>Employment Rate:</strong> ${formatValue(data.employment_rate, 'percent')}</div>
        `;
      })
    },
    
    grid: COMMON_GRID,
    
    xAxis: createAxisConfig('value', {
      name: 'Median Weekly Income ($)',
      nameLocation: 'middle',
      nameGap: 30
    }),
    
    yAxis: createAxisConfig('value', {
      name: 'Employment Rate (%)',
      nameLocation: 'middle',
      nameGap: 50
    }),
    
    series: [
      {
        name: 'SA2 Regions',
        type: 'scatter',
        data: scatterData,
        symbolSize: 6,
        itemStyle: {
          color: CHART_COLORS.primary,
          opacity: 0.6
        },
        emphasis: {
          itemStyle: {
            opacity: 1,
            shadowBlur: 10
          }
        },
        markLine: {
          silent: true,
          lineStyle: {
            color: '#999',
            type: 'dashed',
            width: 1
          },
          data: [
            {
              name: 'Median Income',
              xAxis: medianIncome
            },
            {
              name: 'Median Employment',
              yAxis: medianEmployment
            }
          ],
          label: {
            show: true,
            position: 'end',
            formatter: '{b}',
            fontSize: 10
          }
        }
      }
    ],
    
    ...CHART_ANIMATIONS
  };

  chart.setOption(option);
  
  const resizeHandler = setupChartResize(chart);
  resizeHandler.observe(container);
  
  chartInteractionManager.registerChart('chartC', chart);

  return chart;
}

// CHART D – Population Pyramid (Mirrored Stacked Bars)
export function renderChartD(containerId: string, sa2Table: SA2Record[], selectedSA2?: string): echarts.ECharts | null {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found`);
    return null;
  }

  // For demonstration, use synthetic age group data
  // In a real implementation, this would come from detailed demographics data
  const sa2Id = selectedSA2 || sa2Table[0]?["SA2 ID"];
  const selectedRecord = sa2Table.find(d => d["SA2 ID"] === sa2Id);
  
  if (!selectedRecord) {
    console.warn('No SA2 selected for Chart D');
    return null;
  }

  // Generate synthetic age pyramid data based on total population and median age
  const totalPop = selectedRecord.pop_total || 10000;
  const medianAge = selectedRecord.median_age || 40;
  
  const ageGroups = ['0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75-79', '80-84', '85+'];
  
  // Simple age distribution model
  const maleData = ageGroups.map((group, index) => {
    const baseRate = Math.exp(-Math.abs(index * 5 - medianAge) / 20);
    return -Math.round(totalPop * baseRate * 0.025 * (Math.random() * 0.3 + 0.85)); // Negative for left side
  });
  
  const femaleData = ageGroups.map((group, index) => {
    const baseRate = Math.exp(-Math.abs(index * 5 - medianAge) / 20);
    return Math.round(totalPop * baseRate * 0.025 * (Math.random() * 0.3 + 0.85)); // Positive for right side
  });

  const chart = echarts.init(container);
  
  const option = {
    title: {
      text: `Population Pyramid: ${selectedRecord["SA2 Name"]}`,
      subtext: `SA2 ID: ${selectedRecord["SA2 ID"]} (Synthetic Data)`,
      ...COMMON_TITLE_STYLE
    },
    
    tooltip: {
      formatter: function(params: any) {
        const value = Math.abs(params.value);
        const gender = params.seriesName;
        return `
          <div style="font-weight: bold;">${selectedRecord["SA2 Name"]}</div>
          <div style="margin: 4px 0;"><strong>Age Group:</strong> ${params.name}</div>
          <div style="margin: 4px 0;"><strong>Gender:</strong> ${gender}</div>
          <div style="margin: 4px 0;"><strong>Population:</strong> ${value.toLocaleString()}</div>
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
      },
      splitLine: {
        show: false
      }
    },
    
    yAxis: {
      type: 'category',
      data: ageGroups,
      axisTick: {
        show: false
      }
    },
    
    series: [
      {
        name: 'Male',
        type: 'bar',
        stack: 'population',
        data: maleData,
        itemStyle: {
          color: CHART_COLORS.primary
        }
      },
      {
        name: 'Female',
        type: 'bar',
        stack: 'population',
        data: femaleData,
        itemStyle: {
          color: CHART_COLORS.secondary
        }
      }
    ],
    
    ...CHART_ANIMATIONS
  };

  chart.setOption(option);
  
  const resizeHandler = setupChartResize(chart);
  resizeHandler.observe(container);
  
  chartInteractionManager.registerChart('chartD', chart);

  return chart;
}

// CHART E – Aged-Care Spending Mix (Treemap)
export function renderChartE(containerId: string, sa2Table: SA2Record[]): echarts.ECharts | null {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container ${containerId} not found`);
    return null;
  }

  const validData = filterValidRecords(sa2Table, ['spend_CHSP', 'spend_HomeCare', 'spend_Residential']);
  
  if (validData.length === 0) {
    console.warn('No valid data for Chart E');
    return null;
  }

  // Aggregate spending across all regions
  const totalCHSP = validData.reduce((sum, d) => sum + (d.spend_CHSP || 0), 0);
  const totalHomeCare = validData.reduce((sum, d) => sum + (d.spend_HomeCare || 0), 0);
  const totalResidential = validData.reduce((sum, d) => sum + (d.spend_Residential || 0), 0);
  const grandTotal = totalCHSP + totalHomeCare + totalResidential;

  const chart = echarts.init(container);
  
  const treemapData = [
    {
      name: 'Commonwealth Home Support Program',
      value: totalCHSP,
      itemStyle: { color: CHART_COLORS.primary },
      children: validData
        .filter(d => (d.spend_CHSP || 0) > 0)
        .sort((a, b) => (b.spend_CHSP || 0) - (a.spend_CHSP || 0))
        .slice(0, 10) // Top 10 regions
        .map(d => ({
          name: d["SA2 Name"]?.substring(0, 20) || 'Unknown',
          value: d.spend_CHSP || 0,
          originalData: d
        }))
    },
    {
      name: 'Home Care Packages',
      value: totalHomeCare,
      itemStyle: { color: CHART_COLORS.secondary },
      children: validData
        .filter(d => (d.spend_HomeCare || 0) > 0)
        .sort((a, b) => (b.spend_HomeCare || 0) - (a.spend_HomeCare || 0))
        .slice(0, 10)
        .map(d => ({
          name: d["SA2 Name"]?.substring(0, 20) || 'Unknown',
          value: d.spend_HomeCare || 0,
          originalData: d
        }))
    },
    {
      name: 'Residential Aged Care',
      value: totalResidential,
      itemStyle: { color: CHART_COLORS.success },
      children: validData
        .filter(d => (d.spend_Residential || 0) > 0)
        .sort((a, b) => (b.spend_Residential || 0) - (a.spend_Residential || 0))
        .slice(0, 10)
        .map(d => ({
          name: d["SA2 Name"]?.substring(0, 20) || 'Unknown',
          value: d.spend_Residential || 0,
          originalData: d
        }))
    }
  ];

  const option = {
    title: {
      text: 'Aged Care Spending Mix',
      subtext: `Total: ${formatValue(grandTotal, 'spending')} across all programs`,
      ...COMMON_TITLE_STYLE
    },
    
    tooltip: {
      formatter: function(params: any) {
        const percentage = ((params.value / grandTotal) * 100).toFixed(1);
        const data = params.data.originalData;
        
        let content = `<div style="font-weight: bold;">${params.name}</div>`;
        content += `<div style="margin: 4px 0;"><strong>Spending:</strong> ${formatValue(params.value, 'spending')}</div>`;
        content += `<div style="margin: 4px 0;"><strong>Percentage:</strong> ${percentage}%</div>`;
        
        if (data) {
          content += `<div style="margin: 4px 0;"><strong>SA2 ID:</strong> ${data["SA2 ID"]}</div>`;
        }
        
        return content;
      }
    },
    
    series: [
      {
        type: 'treemap',
        data: treemapData,
        roam: false,
        nodeClick: false,
        breadcrumb: {
          show: false
        },
        label: {
          show: true,
          formatter: function(params: any) {
            const percentage = ((params.value / grandTotal) * 100).toFixed(1);
            return `${params.name}\n${percentage}%`;
          },
          fontSize: 11
        },
        upperLabel: {
          show: true,
          height: 30,
          formatter: function(params: any) {
            const percentage = ((params.value / grandTotal) * 100).toFixed(1);
            return `${params.name}: ${percentage}%`;
          }
        },
        levels: [
          {
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 2
            }
          },
          {
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 1
            }
          }
        ]
      }
    ],
    
    ...CHART_ANIMATIONS
  };

  chart.setOption(option);
  
  const resizeHandler = setupChartResize(chart);
  resizeHandler.observe(container);
  
  chartInteractionManager.registerChart('chartE', chart);

  return chart;
}

// Export all chart renderers
export const chartRenderers = {
  renderChartA,
  renderChartB,
  renderChartC,
  renderChartD,
  renderChartE
}; 