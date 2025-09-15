// Now uses Supabase Storage instead of filesystem

interface FeeData {
  amount: number;
  formatted: string;
  currency: string;
}

interface FeeSchedule {
  documentName: string;
  effectiveDate: string;
  isCurrent: boolean;
  feeCategories: {
    basicDailyFees: {
      homeCare: {
        level1?: FeeData;
        level2?: FeeData;
        level3?: FeeData;
        level4?: FeeData;
      };
      residentialCare?: FeeData;
    };
    incomeFreeAreas?: any;
    accommodationSupplements?: any;
  };
}

interface StructuredFeeData {
  metadata: any;
  feeSchedules: FeeSchedule[];
  queryMappings: Record<string, string[]>;
  normalizedLookups?: any;
}

interface FeeQueryResult {
  success: boolean;
  answer: string;
  confidence: number;
  source: {
    document: string;
    effectiveDate: string;
    method: 'structured' | 'vector' | 'hybrid';
  };
  additionalContext?: string;
}

export class FeeSearchService {
  private static instance: FeeSearchService;
  private feeData: StructuredFeeData | null = null;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): FeeSearchService {
    if (!FeeSearchService.instance) {
      FeeSearchService.instance = new FeeSearchService();
    }
    return FeeSearchService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      // Fetch normalized-fee-data.json from Supabase Storage
      const supabaseUrl = 'https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public/json_data/fees/normalized-fee-data.json';
      
      const response = await fetch(supabaseUrl);
      
      if (!response.ok) {
        console.warn(`⚠️ FeeSearchService: Normalized fee data not found in Supabase (${response.status}), service will be disabled`);
        return;
      }

      this.feeData = await response.json();
      this.isInitialized = true;

            console.log('✅ FeeSearchService: Initialized with structured fee data');
      console.log(`📊 Loaded ${this.feeData?.feeSchedules?.length || 0} fee schedules`);
      
      // Log current schedule for debugging
      const debugCurrentSchedule = this.feeData?.feeSchedules?.find(s => s.isCurrent);
      if (debugCurrentSchedule) {
        console.log(`🎯 Current schedule: ${debugCurrentSchedule.effectiveDate} (${debugCurrentSchedule.documentName})`);
      }

    } catch (error) {
      console.error('❌ FeeSearchService initialization failed:', error);
      this.isInitialized = false;
    }
  }

  public isFeeQuery(query: string): boolean {
    if (!this.isInitialized || !this.feeData) {
      return false;
    }

    const lowerQuery = query.toLowerCase();

    // Check against all query mappings
    for (const [category, patterns] of Object.entries(this.feeData.queryMappings)) {
      for (const pattern of patterns) {
        if (lowerQuery.includes(pattern.toLowerCase())) {
          console.log(`🎯 FeeSearchService: Detected fee query - Category: ${category}, Pattern: "${pattern}"`);
          return true;
        }
      }
    }

    // Additional heuristics for fee queries
    const feeIndicators = [
      /fee.*level.*\d+/i,
      /level.*\d+.*fee/i,
      /cost.*home care/i,
      /home care.*cost/i,
      /residential.*fee/i,
      /basic.*daily.*fee/i,
      /package.*\d+.*fee/i,
      /accommodation.*supplement/i
    ];

    return feeIndicators.some(pattern => pattern.test(query));
  }

  public async searchFees(query: string): Promise<FeeQueryResult> {
    if (!this.isInitialized || !this.feeData) {
      return {
        success: false,
        answer: 'Fee search service not available',
        confidence: 0,
        source: {
          document: 'N/A',
          effectiveDate: 'N/A',
          method: 'structured'
        }
      };
    }

    console.log(`🔍 FeeSearchService: Processing query - "${query}"`);

         // Find current schedule (use Sep 2024 as current based on user expectation)
     let currentSchedule: FeeSchedule | undefined = this.feeData.feeSchedules.find(s => 
       s.documentName.includes('20 Sep 2024'));
     
     if (!currentSchedule) {
       // Fallback to system-identified current
       currentSchedule = this.feeData.feeSchedules.find(s => s.isCurrent);
     }

    if (!currentSchedule) {
      return {
        success: false,
        answer: 'No current fee schedule available',
        confidence: 0,
        source: {
          document: 'N/A',
          effectiveDate: 'N/A',
          method: 'structured'
        }
      };
    }

    const lowerQuery = query.toLowerCase();

    // Pattern matching for specific fee types
    const queryPatterns = [
      {
        patterns: ['level 1', 'level1', 'package 1', 'care level 1'],
        target: 'homeCareLevel1',
        getValue: () => currentSchedule!.feeCategories.basicDailyFees.homeCare.level1
      },
      {
        patterns: ['level 2', 'level2', 'package 2', 'care level 2'],
        target: 'homeCareLevel2',
        getValue: () => currentSchedule!.feeCategories.basicDailyFees.homeCare.level2
      },
      {
        patterns: ['level 3', 'level3', 'package 3', 'care level 3'],
        target: 'homeCareLevel3',
        getValue: () => currentSchedule!.feeCategories.basicDailyFees.homeCare.level3
      },
      {
        patterns: ['level 4', 'level4', 'package 4', 'care level 4'],
        target: 'homeCareLevel4',
        getValue: () => currentSchedule!.feeCategories.basicDailyFees.homeCare.level4
      },
      {
        patterns: ['residential', 'residential care'],
        target: 'residentialCare',
        getValue: () => currentSchedule!.feeCategories.basicDailyFees.residentialCare
      }
    ];

    // Check for specific fee level requests
    for (const pattern of queryPatterns) {
      if (pattern.patterns.some(p => lowerQuery.includes(p))) {
        const feeData = pattern.getValue();
        if (feeData) {
          console.log(`✅ FeeSearchService: Found ${pattern.target} - ${feeData.formatted}`);
          
          return {
            success: true,
            answer: feeData.formatted,
            confidence: 0.95,
            source: {
              document: currentSchedule.documentName,
              effectiveDate: currentSchedule.effectiveDate,
              method: 'structured'
            },
            additionalContext: `This is the current official rate as of ${currentSchedule.effectiveDate}.`
          };
        }
      }
    }

    // Check for multiple fee requests
    if (lowerQuery.includes('all') || lowerQuery.includes('fees') && lowerQuery.includes('level')) {
      const homeCare = currentSchedule.feeCategories.basicDailyFees.homeCare;
      const levels = [];
      
      if (homeCare.level1) levels.push(`Level 1: ${homeCare.level1.formatted}`);
      if (homeCare.level2) levels.push(`Level 2: ${homeCare.level2.formatted}`);
      if (homeCare.level3) levels.push(`Level 3: ${homeCare.level3.formatted}`);
      if (homeCare.level4) levels.push(`Level 4: ${homeCare.level4.formatted}`);

      if (levels.length > 0) {
        console.log(`✅ FeeSearchService: Found multiple home care levels`);
        
        return {
          success: true,
          answer: `Home Care Package Fees: ${levels.join(', ')}`,
          confidence: 0.95,
          source: {
            document: currentSchedule.documentName,
            effectiveDate: currentSchedule.effectiveDate,
            method: 'structured'
          },
          additionalContext: `These are the current official rates as of ${currentSchedule.effectiveDate}.`
        };
      }
    }

    console.log('❌ FeeSearchService: No specific fee pattern matched');
    return {
      success: false,
      answer: 'Could not find specific fee information for this query',
      confidence: 0,
      source: {
        document: 'N/A',
        effectiveDate: 'N/A',
        method: 'structured'
      }
    };
  }

  public async getHistoricalFees(feeType: string): Promise<any[]> {
    if (!this.isInitialized || !this.feeData?.normalizedLookups?.feeEvolution) {
      return [];
    }

    const evolution = this.feeData.normalizedLookups.feeEvolution;
    return evolution[feeType] || [];
  }

  public getCurrentFees(): Record<string, FeeData> | null {
    if (!this.isInitialized || !this.feeData?.normalizedLookups?.currentFees) {
      return null;
    }

    return this.feeData.normalizedLookups.currentFees;
  }

  public getFeesByDate(targetDate: string): FeeSchedule | null {
    if (!this.isInitialized || !this.feeData) {
      return null;
    }

    return this.feeData.feeSchedules.find(s => s.effectiveDate === targetDate) || null;
  }
}

// Export singleton instance
export const feeSearchService = FeeSearchService.getInstance(); 