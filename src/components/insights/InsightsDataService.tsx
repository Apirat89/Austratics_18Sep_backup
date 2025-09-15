'use client';

import React from 'react';

// Import existing data interfaces and functions from HeatmapDataService
import {
  SA2HeatmapData,
  PROGRAM_TYPES,
  DEMOGRAPHICS_TYPES,
  ECONOMIC_TYPES,
  HEALTH_TYPES,
  getFlattenedHealthcareOptions,
  getFlattenedDemographicsOptions,
  getFlattenedEconomicOptions,
  getFlattenedHealthStatsOptions
} from '../HeatmapDataService';

// Direct Supabase URLs used - no helper functions needed

// Define chart data interfaces
export interface ChartDataPoint {
  sa2Id: string;
  sa2Name: string;
  value: number;
  category?: string;
}

export interface ChartConfiguration {
  id: string;
  name: string;
  chartType: 'line' | 'bar' | 'scatter' | 'bubble' | 'pie' | 'area';
  dataType: 'healthcare' | 'demographics' | 'economics' | 'health-statistics';
  xAxis?: string;
  yAxis?: string;
  series?: string;
  bubbleSize?: string;
  colorBy?: string;
  groupBy?: string;
  filters?: Record<string, any>;
  createdAt: Date;
  isSaved: boolean;
}

export interface ProcessedChartData {
  data: ChartDataPoint[];
  xAxisData?: string[];
  seriesData?: any[];
  chartOptions: any; // ECharts options object
}

// Define all available variables for chart configuration
export interface VariableOption {
  value: string;
  label: string;
  category: string;
  subcategory: string;
  dataType: 'healthcare' | 'demographics' | 'economics' | 'health-statistics';
  type: 'numeric' | 'categorical';
}

// Get all available variables for insights
export const getAllVariableOptions = (): VariableOption[] => {
  const options: VariableOption[] = [];
  
  // Healthcare variables
  getFlattenedHealthcareOptions().forEach(option => {
    options.push({
      ...option,
      dataType: 'healthcare',
      type: 'numeric'
    });
  });
  
  // Demographics variables
  getFlattenedDemographicsOptions().forEach(option => {
    options.push({
      ...option,
      dataType: 'demographics',
      type: 'numeric'
    });
  });
  
  // Economics variables
  getFlattenedEconomicOptions().forEach(option => {
    options.push({
      ...option,
      dataType: 'economics',
      type: 'numeric'
    });
  });
  
  // Health statistics variables
  getFlattenedHealthStatsOptions().forEach(option => {
    options.push({
      ...option,
      dataType: 'health-statistics',
      type: 'numeric'
    });
  });
  
  return options;
};

// Get variables grouped by category
export const getVariablesByCategory = () => {
  const variables = getAllVariableOptions();
  const grouped: Record<string, VariableOption[]> = {};
  
  variables.forEach(variable => {
    const key = `${variable.dataType}-${variable.category}`;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(variable);
  });
  
  return grouped;
};

// Chart type definitions - focused on snapshot data analysis
export const CHART_TYPES = [
  {
    type: 'bar',
    name: 'Bar Chart',
    description: 'Compare values across regions or categories',
    icon: 'BarChart3',
    requiredAxes: ['measure', 'dimension'],
    optionalAxes: ['groupBy'],
    useCases: ['Compare regions', 'Compare service types', 'Rank performance'],
    dataPattern: 'comparison'
  },
  {
    type: 'scatter',
    name: 'Scatter Plot',
    description: 'Scatter plot with median crosshairs and custom styling',
    icon: 'Target',
    requiredAxes: ['measureX', 'measureY'],
    optionalAxes: ['colorBy', 'bubbleSize'],
    useCases: ['Performance matrix', 'Risk analysis', 'Strategic positioning'],
    dataPattern: 'relationship',
    enhanced: true,
    features: ['Median quadrants', 'Custom color palettes', 'Interactive tooltips', 'Zoom controls']
  },
  {
    type: 'bubble',
    name: 'Bubble Chart',
    description: 'Show three measures in one visualization',
    icon: 'Circle',
    requiredAxes: ['measureX', 'measureY', 'bubbleSize'],
    optionalAxes: ['colorBy'],
    useCases: ['Multi-dimensional analysis', 'Performance vs cost vs volume'],
    dataPattern: 'relationship'
  },
  {
    type: 'pie',
    name: 'Pie Chart',
    description: 'Show composition and proportions',
    icon: 'PieChart',
    requiredAxes: ['measure', 'dimension'],
    optionalAxes: [],
    useCases: ['Service type breakdown', 'Regional composition'],
    dataPattern: 'composition'
  },
  {
    type: 'histogram',
    name: 'Distribution',
    description: 'Show how values are distributed across regions',
    icon: 'BarChart2',
    requiredAxes: ['measure'],
    optionalAxes: ['groupBy'],
    useCases: ['Value distribution', 'Identify outliers', 'Compare distributions'],
    dataPattern: 'distribution'
  },
  {
    type: 'choropleth',
    name: 'Geographic Map',
    description: 'Show values across SA2 regions on a map',
    icon: 'Map',
    requiredAxes: ['measure'],
    optionalAxes: [],
    useCases: ['Geographic patterns', 'Regional hotspots', 'Spatial analysis'],
    dataPattern: 'geographic'
  }
];

// Enhanced variable option interface for snapshot data
export interface SnapshotVariableOption {
  id: string;
  name: string;
  description: string;
  role: 'measure' | 'dimension' | 'geographic';
  dataType: 'continuous' | 'categorical' | 'geographic';
  units?: string;
  category: string;
  subcategory: string;
  dataSource: 'healthcare' | 'demographics' | 'economics' | 'health-statistics';
  sampleRange?: string; // "0-100" or "Low, Medium, High"
}

// Get enhanced variable options with better UX
export const getEnhancedVariableOptions = (): SnapshotVariableOption[] => {
  const options: SnapshotVariableOption[] = [];
  
  // Healthcare variables with enhanced metadata
  getFlattenedHealthcareOptions().forEach(option => {
    options.push({
      id: option.value,
      name: createFriendlyName(option.category, option.subcategory),
      description: createDescription(option.category, option.subcategory),
      role: determineRole(option.subcategory),
      dataType: determineDataType(option.subcategory),
      units: determineUnits(option.subcategory),
      category: option.category,
      subcategory: option.subcategory,
      dataSource: 'healthcare',
      sampleRange: getSampleRange(option.subcategory)
    });
  });
  
  // Demographics variables
  getFlattenedDemographicsOptions().forEach(option => {
    options.push({
      id: option.value,
      name: createFriendlyName(option.category, option.subcategory),
      description: createDescription(option.category, option.subcategory),
      role: determineRole(option.subcategory),
      dataType: determineDataType(option.subcategory),
      units: determineUnits(option.subcategory),
      category: option.category,
      subcategory: option.subcategory,
      dataSource: 'demographics',
      sampleRange: getSampleRange(option.subcategory)
    });
  });
  
  // Economics variables
  getFlattenedEconomicOptions().forEach(option => {
    options.push({
      id: option.value,
      name: createFriendlyName(option.category, option.subcategory),
      description: createDescription(option.category, option.subcategory),
      role: determineRole(option.subcategory),
      dataType: determineDataType(option.subcategory),
      units: determineUnits(option.subcategory),
      category: option.category,
      subcategory: option.subcategory,
      dataSource: 'economics',
      sampleRange: getSampleRange(option.subcategory)
    });
  });
  
  // Health statistics variables
  getFlattenedHealthStatsOptions().forEach(option => {
    options.push({
      id: option.value,
      name: createFriendlyName(option.category, option.subcategory),
      description: createDescription(option.category, option.subcategory),
      role: determineRole(option.subcategory),
      dataType: determineDataType(option.subcategory),
      units: determineUnits(option.subcategory),
      category: option.category,
      subcategory: option.subcategory,
      dataSource: 'health-statistics',
      sampleRange: getSampleRange(option.subcategory)
    });
  });
  
  return options;
};

// Helper functions for enhanced variable metadata
function createFriendlyName(category: string, subcategory: string): string {
  // Convert technical names to user-friendly ones
  if (subcategory.includes('(%)')) {
    return subcategory.replace('(%)', 'Rate');
  }
  if (subcategory.includes('Amount')) {
    return `${category} ${subcategory}`;
  }
  return subcategory;
}

function createDescription(category: string, subcategory: string): string {
  // Create helpful descriptions
  if (subcategory.includes('(%)')) {
    return `Percentage of ${subcategory.replace('(%)', '').trim()} in each SA2 region`;
  }
  if (subcategory.includes('Amount')) {
    return `Total amount for ${subcategory.toLowerCase()} in each SA2 region`;
  }
  return `${subcategory} values across SA2 regions`;
}

function determineRole(subcategory: string): 'measure' | 'dimension' | 'geographic' {
  // Most variables are measures (numeric values to analyze)
  if (subcategory.toLowerCase().includes('type') || 
      subcategory.toLowerCase().includes('category') ||
      subcategory.toLowerCase().includes('group')) {
    return 'dimension';
  }
  if (subcategory.toLowerCase().includes('region') || 
      subcategory.toLowerCase().includes('area') ||
      subcategory.toLowerCase().includes('location')) {
    return 'geographic';
  }
  return 'measure';
}

function determineDataType(subcategory: string): 'continuous' | 'categorical' | 'geographic' {
  if (subcategory.toLowerCase().includes('type') || 
      subcategory.toLowerCase().includes('category')) {
    return 'categorical';
  }
  if (subcategory.toLowerCase().includes('region') || 
      subcategory.toLowerCase().includes('area')) {
    return 'geographic';
  }
  return 'continuous';
}

function determineUnits(subcategory: string): string | undefined {
  if (subcategory.includes('(%)')) return '%';
  if (subcategory.includes('Amount') || subcategory.includes('Cost')) return 'AUD';
  if (subcategory.includes('Number') || subcategory.includes('Count')) return 'count';
  if (subcategory.includes('Rate')) return 'per 1000';
  return undefined;
}

function getSampleRange(subcategory: string): string | undefined {
  if (subcategory.includes('(%)')) return '0-100%';
  if (subcategory.includes('Amount')) return '$0-50K';
  if (subcategory.includes('Number')) return '0-1000';
  return undefined;
}

// Get variables grouped by analytical purpose
export const getVariablesByPurpose = () => {
  const variables = getEnhancedVariableOptions();
  
  return {
    measures: variables.filter(v => v.role === 'measure'),
    dimensions: variables.filter(v => v.role === 'dimension'),
    geographic: variables.filter(v => v.role === 'geographic')
  };
};

// Get chart recommendations based on selected variables
export const getChartRecommendations = (selectedVariables: SnapshotVariableOption[]) => {
  const measures = selectedVariables.filter(v => v.role === 'measure');
  const dimensions = selectedVariables.filter(v => v.role === 'dimension');
  const geographic = selectedVariables.filter(v => v.role === 'geographic');
  
  const recommendations = [];
  
  // Single measure analysis
  if (measures.length === 1) {
    if (dimensions.length >= 1) {
      recommendations.push({
        chartType: 'bar',
        reason: 'Perfect for comparing one measure across categories',
        confidence: 'high'
      });
      recommendations.push({
        chartType: 'pie',
        reason: 'Shows composition if you want to see proportions',
        confidence: 'medium'
      });
    }
    recommendations.push({
      chartType: 'histogram',
      reason: 'Shows how values are distributed across regions',
      confidence: 'high'
    });
    recommendations.push({
      chartType: 'choropleth',
      reason: 'Geographic visualization shows spatial patterns',
      confidence: 'high'
    });
  }
  
  // Two measures - relationship analysis
  if (measures.length === 2) {
    recommendations.push({
      chartType: 'scatter',
      reason: 'Ideal for exploring relationships between two measures',
      confidence: 'high'
    });
  }
  
  // Three measures - bubble chart
  if (measures.length >= 3) {
    recommendations.push({
      chartType: 'bubble',
      reason: 'Shows three dimensions of data simultaneously',
      confidence: 'high'
    });
  }
  
  return recommendations.sort((a, b) => {
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    return confidenceOrder[b.confidence as keyof typeof confidenceOrder] - 
           confidenceOrder[a.confidence as keyof typeof confidenceOrder];
  });
};

// Updated chart configuration interface
export interface EnhancedChartConfiguration {
  id: string;
  name: string;
  chartType: 'bar' | 'scatter' | 'bubble' | 'pie' | 'histogram' | 'choropleth';
  
  // Simplified axis configuration using roles
  measure?: string;        // Primary measure
  measureX?: string;       // X-axis measure (for scatter/bubble)
  measureY?: string;       // Y-axis measure (for scatter/bubble)
  bubbleSize?: string;     // Bubble size measure
  dimension?: string;      // Grouping dimension
  colorBy?: string;        // Color grouping
  groupBy?: string;        // Additional grouping
  
  selectedVariables: SnapshotVariableOption[];
  filters?: Record<string, any>;
  createdAt: Date;
  isSaved: boolean;
}

// Data processing functions
export class InsightsDataService {
  private static instance: InsightsDataService;
  private healthcareData: any[] = [];
  private demographicsData: any[] = [];
  private economicsData: any[] = [];
  private healthStatsData: any[] = [];
  private boundaryNames: Record<string, string> = {};
  private isDataLoaded: boolean = false;
  private dataLoadingPromise: Promise<void> | null = null;
  
  static getInstance(): InsightsDataService {
    if (!this.instance) {
      this.instance = new InsightsDataService();
    }
    return this.instance;
  }
  
  // Check if data is loaded
  isLoaded(): boolean {
    return this.isDataLoaded;
  }
  
  // Get data loading status
  getDataStatus() {
    return {
      healthcare: this.healthcareData.length,
      demographics: this.demographicsData.length,
      economics: this.economicsData.length,
      healthStats: this.healthStatsData.length,
      boundaryNames: Object.keys(this.boundaryNames).length,
      isLoaded: this.isDataLoaded
    };
  }
  
  // Load data from existing sources
  async loadAllData(): Promise<void> {
    // Return existing promise if already loading
    if (this.dataLoadingPromise) {
      return this.dataLoadingPromise;
    }
    
    // Return immediately if already loaded
    if (this.isDataLoaded) {
      return Promise.resolve();
    }
    
    // Create and cache the loading promise
    this.dataLoadingPromise = this.performDataLoad();
    
    try {
      await this.dataLoadingPromise;
      this.isDataLoaded = true;
      console.log('✅ Data loading complete:', this.getDataStatus());
    } catch (error) {
      console.error('❌ Data loading failed:', error);
      // Don't throw - allow UI to work with partial data
    }
  }
  
  private async performDataLoad(): Promise<void> {
    console.log('🔄 Starting data load...');
    
    try {
      // Load healthcare data
      console.log('📊 Loading healthcare data...');
      const healthcareResponse = await fetch('https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public/json_data/sa2/DSS_Cleaned_2024.json');
      if (healthcareResponse.ok) {
        this.healthcareData = await healthcareResponse.json();
        console.log(`✅ Healthcare: ${this.healthcareData.length} records`);
      } else {
        console.warn('⚠️ Healthcare data not available');
        this.healthcareData = [];
      }
      
      // Load demographics data
      console.log('👥 Loading demographics data...');
      const demographicsUrl = 'https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public/json_data/maps/Demographics_2023.json';
      const demographicsResponse = await fetch(demographicsUrl);
      if (demographicsResponse.ok) {
        this.demographicsData = await demographicsResponse.json();
        console.log(`✅ Demographics: ${this.demographicsData.length} records`);
      } else {
        console.warn('⚠️ Demographics data not available');
        this.demographicsData = [];
      }
      
      // Load economics data
      console.log('💰 Loading economics data...');
      const economicsUrl = 'https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public/json_data/maps/econ_stats.json';
      const economicsResponse = await fetch(economicsUrl);
      if (economicsResponse.ok) {
        this.economicsData = await economicsResponse.json();
        console.log(`✅ Economics: ${this.economicsData.length} records`);
      } else {
        console.warn('⚠️ Economics data not available');
        this.economicsData = [];
      }
      
      // Load health statistics data
      console.log('🏥 Loading health statistics data...');
      const healthStatsUrl = 'https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public/json_data/maps/health_stats.json';
      const healthStatsResponse = await fetch(healthStatsUrl);
      if (healthStatsResponse.ok) {
        this.healthStatsData = await healthStatsResponse.json();
        console.log(`✅ Health stats: ${this.healthStatsData.length} records`);
      } else {
        console.warn('⚠️ Health statistics data not available');
        this.healthStatsData = [];
      }
      
      // Load SA2 boundary names for region mapping
      console.log('🗺️ Loading boundary names...');
      await this.loadBoundaryNames();
      
    } catch (error) {
      console.error('💥 Error during data loading:', error);
      throw error;
    }
  }
  
  private async loadBoundaryNames(): Promise<void> {
    try {
      const boundaryUrl = 'https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public/json_data/maps/SA2.geojson';
      const response = await fetch(boundaryUrl);
      if (response.ok) {
        const geojson = await response.json();
        
        geojson.features.forEach((feature: any) => {
          const sa2Id = feature.properties.SA2_CODE21 || feature.properties.SA2_MAIN21;
          const sa2Name = feature.properties.SA2_NAME21;
          if (sa2Id && sa2Name) {
            this.boundaryNames[sa2Id.toString()] = sa2Name;
          }
        });
      } else {
        console.warn('Boundary names data not available');
      }
    } catch (error) {
      console.error('Error loading boundary names:', error);
      // Continue without boundary names
    }
  }
  
  // Process data for specific chart configuration
  processDataForChart(config: ChartConfiguration): ProcessedChartData {
    const data = this.getDataByType(config.dataType);
    const chartData = this.extractChartData(data, config);
    const chartOptions = this.generateChartOptions(chartData, config);
    
    return {
      data: chartData,
      chartOptions
    };
  }
  
  private getDataByType(dataType: string): any[] {
    switch (dataType) {
      case 'healthcare':
        return this.healthcareData;
      case 'demographics':
        return this.demographicsData;
      case 'economics':
        return this.economicsData;
      case 'health-statistics':
        return this.healthStatsData;
      default:
        return [];
    }
  }
  
  private extractChartData(data: any[], config: ChartConfiguration): ChartDataPoint[] {
    // This will be implemented based on the chart type and configuration
    // For now, return basic processed data
    return data.slice(0, 50).map((item, index) => ({
      sa2Id: item['SA2 ID']?.toString() || index.toString(),
      sa2Name: this.boundaryNames[item['SA2 ID']?.toString()] || item['SA2 Name'] || `Region ${index}`,
      value: typeof item.Amount === 'number' ? item.Amount : parseFloat(item.Amount) || 0,
      category: item.Category || item.Description || 'Unknown'
    }));
  }
  
  private generateChartOptions(data: ChartDataPoint[], config: ChartConfiguration): any {
    // Generate ECharts options based on chart type
    const baseOptions = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c}'
      },
      legend: {
        show: true
      }
    };
    
    switch (config.chartType) {
      case 'bar':
        return {
          ...baseOptions,
          xAxis: {
            type: 'category',
            data: data.map(d => d.sa2Name)
          },
          yAxis: {
            type: 'value'
          },
          series: [{
            type: 'bar',
            data: data.map(d => d.value),
            itemStyle: {
              color: '#3b82f6'
            }
          }]
        };
        
      case 'line':
        return {
          ...baseOptions,
          xAxis: {
            type: 'category',
            data: data.map(d => d.sa2Name)
          },
          yAxis: {
            type: 'value'
          },
          series: [{
            type: 'line',
            data: data.map(d => d.value),
            itemStyle: {
              color: '#10b981'
            }
          }]
        };
        
      case 'pie':
        return {
          ...baseOptions,
          series: [{
            type: 'pie',
            radius: '50%',
            data: data.slice(0, 10).map(d => ({
              name: d.sa2Name,
              value: d.value
            }))
          }]
        };
        
      default:
        return baseOptions;
    }
  }
}

export default InsightsDataService; 