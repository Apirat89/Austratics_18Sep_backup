// dataPrep.ts - Comprehensive data preparation for ECharts dashboard
// Handles loading and transformation of 4 JSON files with SA2 ID normalization

import { getMapDataUrl } from '../../lib/supabaseStorage';

export interface SA2Record {
  "SA2 ID": string;
  "SA2 Name": string;
  state?: string;
  
  // Healthcare derived fields
  participants_CHSP?: number;
  participants_HomeCare?: number;
  participants_Residential?: number;
  spend_CHSP?: number;
  spend_HomeCare?: number;
  spend_Residential?: number;
  
  // Demographics extracted fields
  pop_total?: number;
  pop_65_plus?: number;
  median_age?: number;
  
  // Economics extracted fields
  employment_rate?: number;
  median_income?: number;
  
  // Health condition rates (%)
  arthritis_pct?: number;
  asthma_pct?: number;
  cancer_pct?: number;
  dementia_pct?: number;
  diabetes_pct?: number;
  heart_disease_pct?: number;
  stroke_pct?: number;
  mental_health_pct?: number;
  respiratory_pct?: number;
  kidney_disease_pct?: number;
  osteoporosis_pct?: number;
  blood_condition_pct?: number;
  
  // Derived analytics fields
  participants_per_1k_65?: number;
  service_gap_score?: number;
  z_income?: number;
  z_employment?: number;
  z_participants?: number;
  z_chronic?: number;
  overall_z?: number;
}

export interface DataPrepResult {
  sa2Table: SA2Record[];
  isLoaded: boolean;
  error?: string;
  loadingStatus: {
    healthcare: boolean;
    demographics: boolean;
    economics: boolean;
    health: boolean;
  };
}

class DataPrepService {
  private static instance: DataPrepService;
  private result: DataPrepResult = {
    sa2Table: [],
    isLoaded: false,
    loadingStatus: {
      healthcare: false,
      demographics: false,
      economics: false,
      health: false
    }
  };
  
  static getInstance(): DataPrepService {
    if (!DataPrepService.instance) {
      DataPrepService.instance = new DataPrepService();
    }
    return DataPrepService.instance;
  }
  
  async loadAndPrepareData(): Promise<DataPrepResult> {
    if (this.result.isLoaded) {
      return this.result;
    }
    
    try {
      console.log('🔄 Starting comprehensive data preparation...');
      
      // Load all 4 JSON files in parallel
      const [healthcareData, demographicsData, economicsData, healthStatsData] = await Promise.all([
        this.loadHealthcareData(),
        this.loadDemographicsData(), 
        this.loadEconomicsData(),
        this.loadHealthStatsData()
      ]);
      
      console.log('✅ All data files loaded successfully');
      
      // Create SA2 lookup table from healthcare data (most comprehensive)
      const sa2Map = new Map<string, SA2Record>();
      
      // Initialize SA2 records from healthcare data
      healthcareData.forEach(record => {
        const sa2Id = this.normalizeSA2Id(record["SA2 ID"]);
        if (!sa2Map.has(sa2Id)) {
          sa2Map.set(sa2Id, {
            "SA2 ID": sa2Id,
            "SA2 Name": record["SA2 Name"]?.trim() || '',
            state: this.extractState(sa2Id)
          });
        }
      });
      
      console.log(`📊 Initialized ${sa2Map.size} SA2 records`);
      
      // Process healthcare data with pivoting
      this.processHealthcareData(healthcareData, sa2Map);
      this.result.loadingStatus.healthcare = true;
      
      // Process demographics data
      this.processDemographicsData(demographicsData, sa2Map);
      this.result.loadingStatus.demographics = true;
      
      // Process economics data
      this.processEconomicsData(economicsData, sa2Map);
      this.result.loadingStatus.economics = true;
      
      // Process health statistics data
      this.processHealthStatsData(healthStatsData, sa2Map);
      this.result.loadingStatus.health = true;
      
      // Calculate derived fields
      this.calculateDerivedFields(sa2Map);
      
      // Convert to array and sort
      this.result.sa2Table = Array.from(sa2Map.values())
        .filter(record => record["SA2 Name"]) // Remove records without names
        .sort((a, b) => a["SA2 ID"].localeCompare(b["SA2 ID"]));
      
      this.result.isLoaded = true;
      
      console.log(`🎉 Data preparation complete! ${this.result.sa2Table.length} SA2 records ready`);
      console.log('📈 Sample record:', this.result.sa2Table[0]);
      
      return this.result;
      
    } catch (error) {
      console.error('❌ Data preparation failed:', error);
      this.result.error = error instanceof Error ? error.message : 'Unknown error';
      return this.result;
    }
  }
  
  private async loadHealthcareData(): Promise<any[]> {
    console.log('📥 Loading healthcare data...');
    const response = await fetch('/DSS_Cleaned_2024.json');
    if (!response.ok) throw new Error(`Healthcare data: ${response.statusText}`);
    const data = await response.json();
    console.log(`✅ Healthcare: ${data.length} records`);
    return data;
  }
  
  private async loadDemographicsData(): Promise<any[]> {
    console.log('📥 Loading demographics data...');
    const supabaseUrl = getMapDataUrl('Demographics_2023.json');
    const response = await fetch(supabaseUrl);
    if (!response.ok) throw new Error(`Demographics data: ${response.statusText}`);
    const data = await response.json();
    console.log(`✅ Demographics: ${data.length} records`);
    return data;
  }
  
  private async loadEconomicsData(): Promise<any[]> {
    console.log('📥 Loading economics data...');
    const supabaseUrl = getMapDataUrl('econ_stats.json');
    const response = await fetch(supabaseUrl);
    if (!response.ok) throw new Error(`Economics data: ${response.statusText}`);
    const data = await response.json();
    console.log(`✅ Economics: ${data.length} records`);
    return data;
  }
  
  private async loadHealthStatsData(): Promise<any[]> {
    console.log('📥 Loading health statistics data...');
    const supabaseUrl = getMapDataUrl('health_stats.json');
    const response = await fetch(supabaseUrl);
    if (!response.ok) throw new Error(`Health stats data: ${response.statusText}`);
    const data = await response.json();
    console.log(`✅ Health Stats: ${data.length} records`);
    return data;
  }
  
  private normalizeSA2Id(id: any): string {
    return String(id).padStart(9, '0');
  }
  
  private extractState(sa2Id: string): string {
    // Extract state from first 1-2 characters of SA2 ID
    const code = sa2Id.substring(0, 1);
    const stateMap: Record<string, string> = {
      '1': 'NSW',
      '2': 'VIC', 
      '3': 'QLD',
      '4': 'SA',
      '5': 'WA',
      '6': 'TAS',
      '7': 'NT',
      '8': 'ACT',
      '9': 'OT' // Other Territories
    };
    return stateMap[code] || 'Unknown';
  }
  
  private processHealthcareData(data: any[], sa2Map: Map<string, SA2Record>): void {
    console.log('🔄 Processing healthcare data with pivoting...');
    
    data.forEach(record => {
      const sa2Id = this.normalizeSA2Id(record["SA2 ID"]);
      const sa2Record = sa2Map.get(sa2Id);
      if (!sa2Record) return;
      
      const category = record.Category;
      const type = record.Type;
      const amount = parseFloat(record.Amount) || 0;
      
      // Create pivot key: Category|||Type
      const key = `${category}|||${type}`;
      
      // Map to standardized field names
      if (key.includes('participants')) {
        if (key.includes('CHSP') || key.includes('Commonwealth Home Support')) {
          sa2Record.participants_CHSP = amount;
        } else if (key.includes('Home Care') || key.includes('HCP')) {
          sa2Record.participants_HomeCare = amount;
        } else if (key.includes('Residential') || key.includes('RACF')) {
          sa2Record.participants_Residential = amount;
        }
      } else if (key.includes('spend') || key.includes('expenditure') || key.includes('cost')) {
        if (key.includes('CHSP') || key.includes('Commonwealth Home Support')) {
          sa2Record.spend_CHSP = amount;
        } else if (key.includes('Home Care') || key.includes('HCP')) {
          sa2Record.spend_HomeCare = amount;
        } else if (key.includes('Residential') || key.includes('RACF')) {
          sa2Record.spend_Residential = amount;
        }
      }
    });
    
    console.log('✅ Healthcare data pivoted successfully');
  }
  
  private processDemographicsData(data: any[], sa2Map: Map<string, SA2Record>): void {
    console.log('🔄 Processing demographics data...');
    
    data.forEach(record => {
      const sa2Id = this.normalizeSA2Id(record["SA2 ID"]);
      const sa2Record = sa2Map.get(sa2Id);
      if (!sa2Record) return;
      
      const description = record.Description;
      const value = parseFloat(record.Value) || 0;
      
      // Extract key demographic variables
      if (description?.includes('Estimated resident population (no.)')) {
        sa2Record.pop_total = value;
      } else if (description?.includes('Population aged 65 years and over (no.)')) {
        sa2Record.pop_65_plus = value;
      } else if (description?.includes('Median age (years)')) {
        sa2Record.median_age = value;
      }
    });
    
    console.log('✅ Demographics data processed successfully');
  }
  
  private processEconomicsData(data: any[], sa2Map: Map<string, SA2Record>): void {
    console.log('🔄 Processing economics data...');
    
    data.forEach(record => {
      const sa2Id = this.normalizeSA2Id(record["SA2 ID"]);
      const sa2Record = sa2Map.get(sa2Id);
      if (!sa2Record) return;
      
      const description = record.Description;
      const value = parseFloat(record.Value) || 0;
      
      // Extract key economic variables
      if (description?.includes('% of total Census responding population employed')) {
        sa2Record.employment_rate = value;
      } else if (description?.includes('Median weekly personal income ($)')) {
        sa2Record.median_income = value;
      }
    });
    
    console.log('✅ Economics data processed successfully');
  }
  
  private processHealthStatsData(data: any[], sa2Map: Map<string, SA2Record>): void {
    console.log('🔄 Processing health statistics data...');
    
    // Mapping of health conditions to field names
    const healthConditionMap: Record<string, keyof SA2Record> = {
      'Arthritis': 'arthritis_pct',
      'Asthma': 'asthma_pct', 
      'Cancer': 'cancer_pct',
      'Dementia': 'dementia_pct',
      'Diabetes': 'diabetes_pct',
      'Heart disease': 'heart_disease_pct',
      'Stroke': 'stroke_pct',
      'Mental health': 'mental_health_pct',
      'Respiratory': 'respiratory_pct',
      'Kidney disease': 'kidney_disease_pct',
      'Osteoporosis': 'osteoporosis_pct',
      'Blood condition': 'blood_condition_pct'
    };
    
    data.forEach(record => {
      const sa2Id = this.normalizeSA2Id(record["SA2 ID"]);
      const sa2Record = sa2Map.get(sa2Id);
      if (!sa2Record) return;
      
      const description = record.Description;
      const value = parseFloat(record.Value) || 0;
      
      // Extract health condition percentages
      Object.entries(healthConditionMap).forEach(([condition, fieldName]) => {
        if (description?.toLowerCase().includes(condition.toLowerCase())) {
          (sa2Record as any)[fieldName] = value;
        }
      });
    });
    
    console.log('✅ Health statistics data processed successfully');
  }
  
  private calculateDerivedFields(sa2Map: Map<string, SA2Record>): void {
    console.log('🔄 Calculating derived fields...');
    
    const records = Array.from(sa2Map.values()).filter(r => r.pop_65_plus && r.pop_65_plus > 0);
    
    // Calculate derived fields for each record
    records.forEach(record => {
      // Participants per 1k population 65+
      if (record.participants_CHSP && record.pop_65_plus) {
        record.participants_per_1k_65 = (record.participants_CHSP / record.pop_65_plus) * 1000;
      }
      
      // Service gap score: avg chronic conditions * pop 65+ / (participants + 1)
      const chronicConditions = [
        record.arthritis_pct || 0,
        record.asthma_pct || 0,
        record.cancer_pct || 0
      ];
      const avgChronic = chronicConditions.reduce((a, b) => a + b, 0) / chronicConditions.length;
      const totalParticipants = (record.participants_CHSP || 0) + 1;
      
      if (record.pop_65_plus) {
        record.service_gap_score = (avgChronic * record.pop_65_plus) / totalParticipants;
      }
    });
    
    // Calculate z-scores
    this.calculateZScores(records, 'median_income', 'z_income');
    this.calculateZScores(records, 'employment_rate', 'z_employment');
    this.calculateZScores(records, 'participants_per_1k_65', 'z_participants');
    this.calculateZScores(records, 'service_gap_score', 'z_chronic');
    
    // Calculate overall z-score
    records.forEach(record => {
      if (record.z_income && record.z_employment && record.z_participants && record.z_chronic) {
        record.overall_z = record.z_income + record.z_employment - record.z_participants + record.z_chronic;
      }
    });
    
    console.log('✅ Derived fields calculated successfully');
  }
  
  private calculateZScores(records: SA2Record[], sourceField: keyof SA2Record, targetField: keyof SA2Record): void {
    const values = records
      .map(r => r[sourceField] as number)
      .filter(v => v !== undefined && !isNaN(v));
    
    if (values.length === 0) return;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return;
    
    records.forEach(record => {
      const value = record[sourceField] as number;
      if (value !== undefined && !isNaN(value)) {
        (record as any)[targetField] = (value - mean) / stdDev;
      }
    });
  }
  
  getData(): DataPrepResult {
    return this.result;
  }
  
  isDataReady(): boolean {
    return this.result.isLoaded;
  }
}

// Export singleton instance
export const dataPrepService = DataPrepService.getInstance();

// Export convenience function
export async function prepareAllData(): Promise<DataPrepResult> {
  return await dataPrepService.loadAndPrepareData();
} 