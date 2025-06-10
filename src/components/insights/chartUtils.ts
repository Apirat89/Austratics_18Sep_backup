// chartUtils.ts - Shared utilities and theme for ECharts dashboard

import { SA2Record } from './dataPrep';

// Consistent theme colors
export const CHART_COLORS = {
  primary: '#1f77b4',
  secondary: '#ff7f0e', 
  success: '#2ca02c',
  warning: '#d62728',
  info: '#9467bd',
  light: '#8c564b',
  dark: '#e377c2',
  muted: '#7f7f7f',
  accent: '#bcbd22',
  highlight: '#17becf'
};

export const STATE_COLORS = {
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

export const HEALTH_CONDITION_COLORS = {
  'arthritis_pct': '#ff6b6b',
  'asthma_pct': '#4ecdc4',
  'cancer_pct': '#45b7d1',
  'dementia_pct': '#96ceb4',
  'diabetes_pct': '#ffeaa7',
  'heart_disease_pct': '#dda0dd',
  'stroke_pct': '#98d8c8',
  'mental_health_pct': '#f7dc6f',
  'respiratory_pct': '#bb8fce',
  'kidney_disease_pct': '#85c1e9',
  'osteoporosis_pct': '#f8c471',
  'blood_condition_pct': '#82e0aa'
};

// Shared tooltip formatter that shows SA2 Name
export const createTooltipFormatter = (customContent?: string) => {
  return function(params: any) {
    const data = Array.isArray(params) ? params[0].data : params.data;
    const sa2Name = data['SA2 Name'] || data.sa2Name || 'Unknown SA2';
    const sa2Id = data['SA2 ID'] || data.sa2Id || '';
    
    let tooltip = `<div style="font-weight: bold; margin-bottom: 5px;">${sa2Name}</div>`;
    if (sa2Id) {
      tooltip += `<div style="color: #666; font-size: 12px; margin-bottom: 8px;">SA2 ID: ${sa2Id}</div>`;
    }
    
    if (customContent) {
      tooltip += customContent;
    } else {
      // Default content based on params
      if (Array.isArray(params)) {
        params.forEach(param => {
          tooltip += `<div style="margin: 2px 0;">
            <span style="display:inline-block;margin-right:8px;border-radius:10px;width:10px;height:10px;background-color:${param.color};"></span>
            ${param.seriesName}: <strong>${formatValue(param.value, param.seriesName)}</strong>
          </div>`;
        });
      } else {
        tooltip += `<div style="margin: 2px 0;">
          <span style="display:inline-block;margin-right:8px;border-radius:10px;width:10px;height:10px;background-color:${params.color};"></span>
          ${params.seriesName}: <strong>${formatValue(params.value, params.seriesName)}</strong>
        </div>`;
      }
    }
    
    return tooltip;
  };
};

// Format values based on context
export function formatValue(value: any, context?: string): string {
  if (value === null || value === undefined) return 'N/A';
  
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(numValue)) return String(value);
  
  // Determine format based on context
  if (context?.toLowerCase().includes('percent') || context?.toLowerCase().includes('%')) {
    return `${numValue.toFixed(1)}%`;
  } else if (context?.toLowerCase().includes('income') || context?.toLowerCase().includes('$')) {
    return `$${numValue.toLocaleString()}`;
  } else if (context?.toLowerCase().includes('participants') || context?.toLowerCase().includes('population')) {
    return numValue.toLocaleString();
  } else if (Math.abs(numValue) < 1) {
    return numValue.toFixed(3);
  } else if (Math.abs(numValue) < 100) {
    return numValue.toFixed(1);
  } else {
    return numValue.toLocaleString();
  }
}

// Common chart grid and style configurations
export const COMMON_GRID = {
  left: '10%',
  right: '10%',
  top: '15%',
  bottom: '15%',
  containLabel: true
};

export const COMMON_TITLE_STYLE = {
  textStyle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  left: 'center',
  top: '2%'
};

export const COMMON_LEGEND_STYLE = {
  type: 'scroll',
  orient: 'horizontal',
  bottom: '2%',
  textStyle: {
    fontSize: 12
  }
};

// Axis configurations
export const createAxisConfig = (type: 'value' | 'category', options: any = {}) => {
  const baseConfig = {
    axisLabel: {
      textStyle: {
        fontSize: 11,
        color: '#666'
      }
    },
    axisTick: {
      show: true
    },
    axisLine: {
      show: true,
      lineStyle: {
        color: '#ddd'
      }
    },
    splitLine: {
      show: type === 'value',
      lineStyle: {
        color: '#f0f0f0',
        type: 'dashed'
      }
    }
  };
  
  return { type, ...baseConfig, ...options };
};

// Data processing utilities
export function filterValidRecords(data: SA2Record[], fields: (keyof SA2Record)[]): SA2Record[] {
  return data.filter(record => {
    return fields.every(field => {
      const value = record[field];
      return value !== undefined && value !== null && !isNaN(Number(value));
    });
  });
}

export function calculatePercentiles(values: number[], percentiles: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  return percentiles.map(p => {
    const index = (p / 100) * (sorted.length - 1);
    if (Number.isInteger(index)) {
      return sorted[index];
    } else {
      const lower = Math.floor(index);
      const upper = Math.ceil(index);
      const weight = index - lower;
      return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
  });
}

export function createContinuousColorMap(values: number[], colorRange: string[] = ['#313695', '#74add1', '#abd9e9', '#e0f3f8', '#ffffcc', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  return function(value: number): string {
    if (range === 0) return colorRange[Math.floor(colorRange.length / 2)];
    
    const normalized = (value - min) / range;
    const index = Math.floor(normalized * (colorRange.length - 1));
    return colorRange[Math.max(0, Math.min(colorRange.length - 1, index))];
  };
}

export function createPiecewiseVisualMap(field: string, data: SA2Record[], title: string) {
  const values = data.map(d => d[field as keyof SA2Record] as number).filter(v => !isNaN(v));
  const percentiles = calculatePercentiles(values, [20, 40, 60, 80]);
  
  return {
    type: 'piecewise',
    pieces: [
      { min: percentiles[3], color: '#d73027', label: 'Very High' },
      { min: percentiles[2], max: percentiles[3], color: '#f46d43', label: 'High' },
      { min: percentiles[1], max: percentiles[2], color: '#fdae61', label: 'Medium' },
      { min: percentiles[0], max: percentiles[1], color: '#abd9e9', label: 'Low' },
      { max: percentiles[0], color: '#313695', label: 'Very Low' }
    ],
    text: [title, ''],
    textStyle: {
      fontSize: 12
    },
    orient: 'vertical',
    right: '2%',
    top: '15%'
  };
}

export function createContinuousVisualMap(field: string, data: SA2Record[], title: string) {
  const values = data.map(d => d[field as keyof SA2Record] as number).filter(v => !isNaN(v));
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return {
    type: 'continuous',
    min,
    max,
    text: [title, ''],
    inRange: {
      color: ['#313695', '#74add1', '#abd9e9', '#e0f3f8', '#ffffcc', '#fee090', '#fdae61', '#f46d43', '#d73027']
    },
    textStyle: {
      fontSize: 12
    },
    orient: 'vertical',
    right: '2%',
    top: '15%'
  };
}

// Animation configurations
export const CHART_ANIMATIONS = {
  animationDuration: 1000,
  animationEasing: 'cubicOut',
  animationDelay: function(idx: number) {
    return idx * 20;
  }
};

// Resize utility for responsive charts
export function setupChartResize(chart: any) {
  const resizeObserver = new ResizeObserver(() => {
    if (chart && !chart.isDisposed()) {
      chart.resize();
    }
  });
  
  return {
    observe: (element: HTMLElement) => resizeObserver.observe(element),
    disconnect: () => resizeObserver.disconnect()
  };
}

// Global chart interaction manager
export class ChartInteractionManager {
  private static instance: ChartInteractionManager;
  private charts: Map<string, any> = new Map();
  private selectedSA2s: Set<string> = new Set();
  private brushListeners: Set<(sa2Ids: string[]) => void> = new Set();
  
  static getInstance(): ChartInteractionManager {
    if (!ChartInteractionManager.instance) {
      ChartInteractionManager.instance = new ChartInteractionManager();
    }
    return ChartInteractionManager.instance;
  }
  
  registerChart(id: string, chart: any) {
    this.charts.set(id, chart);
  }
  
  unregisterChart(id: string) {
    this.charts.delete(id);
  }
  
  addBrushListener(callback: (sa2Ids: string[]) => void) {
    this.brushListeners.add(callback);
  }
  
  removeBrushListener(callback: (sa2Ids: string[]) => void) {
    this.brushListeners.delete(callback);
  }
  
  selectSA2s(sa2Ids: string[]) {
    this.selectedSA2s = new Set(sa2Ids);
    this.brushListeners.forEach(listener => listener(sa2Ids));
  }
  
  getSelectedSA2s(): string[] {
    return Array.from(this.selectedSA2s);
  }
  
  clearSelection() {
    this.selectedSA2s.clear();
    this.brushListeners.forEach(listener => listener([]));
  }
}

export const chartInteractionManager = ChartInteractionManager.getInstance(); 