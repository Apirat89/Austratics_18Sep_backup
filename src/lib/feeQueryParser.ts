interface ParsedFeeQuery {
  isFeeQuery: boolean;
  feeType: 'home_care' | 'residential_care' | 'accommodation' | 'income_threshold' | 'multiple' | 'unknown';
  level?: number;
  specificDate?: string;
  confidence: number;
  extractedTerms: string[];
  queryIntent: 'current_rate' | 'historical_rate' | 'comparison' | 'evolution' | 'general';
}

export class FeeQueryParser {
  private static instance: FeeQueryParser;

  private constructor() {}

  public static getInstance(): FeeQueryParser {
    if (!FeeQueryParser.instance) {
      FeeQueryParser.instance = new FeeQueryParser();
    }
    return FeeQueryParser.instance;
  }

  public parseQuery(query: string): ParsedFeeQuery {
    const lowerQuery = query.toLowerCase().trim();
    console.log(`🔍 FeeQueryParser: Analyzing query - "${query}"`);

    // Initialize result
    const result: ParsedFeeQuery = {
      isFeeQuery: false,
      feeType: 'unknown',
      confidence: 0,
      extractedTerms: [],
      queryIntent: 'general'
    };

    // Extract terms for analysis
    const terms = lowerQuery.split(/\s+/);
    result.extractedTerms = terms;

    // Check if this is a fee-related query
    const feeIndicators = [
      'fee', 'cost', 'charge', 'rate', 'amount', 'price',
      'basic daily fee', 'daily fee', 'package fee'
    ];

    const hasFeeIndicator = feeIndicators.some(indicator => 
      lowerQuery.includes(indicator));

    if (!hasFeeIndicator) {
      console.log('❌ FeeQueryParser: No fee indicators found');
      return result;
    }

    result.isFeeQuery = true;
    result.confidence = 0.6; // Base confidence for having fee indicators

    // Determine fee type
    if (lowerQuery.includes('home care') || lowerQuery.includes('home-care') || 
        lowerQuery.includes('package')) {
      result.feeType = 'home_care';
      result.confidence += 0.2;
      console.log('✅ FeeQueryParser: Identified as home care query');
    } else if (lowerQuery.includes('residential')) {
      result.feeType = 'residential_care';
      result.confidence += 0.2;
      console.log('✅ FeeQueryParser: Identified as residential care query');
    } else if (lowerQuery.includes('accommodation') || lowerQuery.includes('supplement')) {
      result.feeType = 'accommodation';
      result.confidence += 0.2;
      console.log('✅ FeeQueryParser: Identified as accommodation query');
    } else if (lowerQuery.includes('income') && (lowerQuery.includes('threshold') || 
              lowerQuery.includes('free area'))) {
      result.feeType = 'income_threshold';
      result.confidence += 0.2;
      console.log('✅ FeeQueryParser: Identified as income threshold query');
    }

    // Extract level number for home care
    if (result.feeType === 'home_care') {
      const levelPatterns = [
        /level\s*(\d+)/i,
        /package\s*(\d+)/i,
        /care\s*(\d+)/i,
        /\blevel(\d+)\b/i,
        /\bpackage(\d+)\b/i
      ];

      for (const pattern of levelPatterns) {
        const match = lowerQuery.match(pattern);
        if (match) {
          result.level = parseInt(match[1]);
          result.confidence += 0.15;
          console.log(`✅ FeeQueryParser: Extracted level ${result.level}`);
          break;
        }
      }
    }

    // Determine query intent
    if (lowerQuery.includes('current') || lowerQuery.includes('latest') || 
        lowerQuery.includes('what is') || lowerQuery.includes('official')) {
      result.queryIntent = 'current_rate';
      result.confidence += 0.1;
      console.log('✅ FeeQueryParser: Intent - current rate lookup');
    } else if (lowerQuery.includes('history') || lowerQuery.includes('historical') || 
               lowerQuery.includes('over time') || lowerQuery.includes('evolution')) {
      result.queryIntent = 'evolution';
      result.confidence += 0.1;
      console.log('✅ FeeQueryParser: Intent - fee evolution/history');
    } else if (lowerQuery.includes('compare') || lowerQuery.includes('comparison') || 
               lowerQuery.includes('vs') || lowerQuery.includes('versus')) {
      result.queryIntent = 'comparison';
      result.confidence += 0.1;
      console.log('✅ FeeQueryParser: Intent - fee comparison');
    } else if (lowerQuery.includes('all') || lowerQuery.includes('levels') || 
               lowerQuery.includes('different')) {
      result.queryIntent = 'general';
      result.feeType = 'multiple';
      result.confidence += 0.1;
      console.log('✅ FeeQueryParser: Intent - multiple fee lookup');
    } else {
      result.queryIntent = 'current_rate'; // Default to current rate
      console.log('✅ FeeQueryParser: Default intent - current rate lookup');
    }

    // Extract specific date references
    const datePatterns = [
      /(\d{4})/g, // Year
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})/i,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(\d{4})/i,
      /(\d{1,2})\s*(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{4})/i
    ];

    for (const pattern of datePatterns) {
      const matches = lowerQuery.match(pattern);
      if (matches) {
        result.specificDate = matches[0];
        result.confidence += 0.05;
        console.log(`✅ FeeQueryParser: Found date reference - ${result.specificDate}`);
        break;
      }
    }

    // Final confidence adjustment
    result.confidence = Math.min(result.confidence, 1.0);

    console.log(`📊 FeeQueryParser: Final analysis - Type: ${result.feeType}, Level: ${result.level || 'N/A'}, Intent: ${result.queryIntent}, Confidence: ${(result.confidence * 100).toFixed(1)}%`);

    return result;
  }

  public generateSearchTerms(parsedQuery: ParsedFeeQuery): string[] {
    const searchTerms: string[] = [];

    if (!parsedQuery.isFeeQuery) {
      return searchTerms;
    }

    // Generate specific search terms based on parsed query
    if (parsedQuery.feeType === 'home_care' && parsedQuery.level) {
      searchTerms.push(
        `home care level ${parsedQuery.level} fee`,
        `level ${parsedQuery.level} home care package`,
        `home care package ${parsedQuery.level} cost`,
        `basic daily fee home care level ${parsedQuery.level}`,
        `home care level ${parsedQuery.level} basic daily fee`
      );
    } else if (parsedQuery.feeType === 'residential_care') {
      searchTerms.push(
        'residential care basic daily fee',
        'residential care fee',
        'basic daily fee residential',
        'residential care daily fee'
      );
    } else if (parsedQuery.feeType === 'accommodation') {
      searchTerms.push(
        'accommodation supplement',
        'maximum accommodation supplement',
        'accommodation supplement amount'
      );
    } else if (parsedQuery.feeType === 'multiple') {
      searchTerms.push(
        'home care fees',
        'home care package fees', 
        'home care level fees',
        'all home care levels'
      );
    }

    // Add date-specific terms if date was mentioned
    if (parsedQuery.specificDate) {
      searchTerms.forEach((term, index) => {
        searchTerms[index] = `${term} ${parsedQuery.specificDate}`;
      });
    }

    console.log(`🎯 FeeQueryParser: Generated ${searchTerms.length} search terms`);
    return searchTerms;
  }

  public isHighConfidenceFeeQuery(query: string): boolean {
    const parsed = this.parseQuery(query);
    return parsed.isFeeQuery && parsed.confidence >= 0.8;
  }

  public extractFeeContext(query: string): {
    needsCurrent: boolean;
    needsHistorical: boolean;
    needsComparison: boolean;
    specificLevel?: number;
    specificDate?: string;
  } {
    const parsed = this.parseQuery(query);
    
    return {
      needsCurrent: parsed.queryIntent === 'current_rate',
      needsHistorical: parsed.queryIntent === 'evolution',
      needsComparison: parsed.queryIntent === 'comparison',
      specificLevel: parsed.level,
      specificDate: parsed.specificDate
    };
  }
}

// Export singleton instance
export const feeQueryParser = FeeQueryParser.getInstance(); 