import { feeQueryParser } from './feeQueryParser';
import { documentTitleService } from './documentTitleService';

interface FeeResponseContext {
  query: string;
  answer: string;
  confidence: number;
  source: {
    document: string;
    effectiveDate: string;
    method: 'structured' | 'vector' | 'hybrid';
  };
  additionalContext?: string;
}

interface FormattedFeeResponse {
  answer: string;
  citations: Array<{
    document_name: string;
    display_title: string;
    page_number?: number;
    section_title?: string;
  }>;
  metadata: {
    responseType: 'fee_lookup' | 'general';
    confidence: number;
    method: 'structured' | 'vector' | 'hybrid';
    effectiveDate: string;
  };
}

export class FeeResponseGenerator {
  private static instance: FeeResponseGenerator;

  private constructor() {}

  public static getInstance(): FeeResponseGenerator {
    if (!FeeResponseGenerator.instance) {
      FeeResponseGenerator.instance = new FeeResponseGenerator();
    }
    return FeeResponseGenerator.instance;
  }

  public generateFeeResponse(context: FeeResponseContext): FormattedFeeResponse {
    console.log(`📝 FeeResponseGenerator: Generating response for structured fee data`);

    const parsedQuery = feeQueryParser.parseQuery(context.query);
    
    // Generate professional response based on query type
    let formattedAnswer = '';
    
    if (parsedQuery.feeType === 'home_care' && parsedQuery.level) {
      formattedAnswer = this.formatHomeCareResponse(context, parsedQuery.level);
    } else if (parsedQuery.feeType === 'residential_care') {
      formattedAnswer = this.formatResidentialCareResponse(context);
    } else if (parsedQuery.feeType === 'multiple') {
      formattedAnswer = this.formatMultipleFeeResponse(context);
    } else {
      formattedAnswer = this.formatGenericFeeResponse(context);
    }

    // Generate citation matching DocumentCitation interface
    const citation = {
      document_name: context.source.document,
      document_type: 'fee_schedule',
      section_title: 'Fee Schedule', 
      page_number: this.extractPageNumber(context.source.document),
      content_snippet: `Fee rates effective from ${context.source.effectiveDate}`,
      similarity_score: 1.0, // Perfect match for structured data
      display_title: this.getDocumentDisplayTitle(context.source.document)
    };

    console.log(`✅ FeeResponseGenerator: Generated structured response with citation`);

    return {
      answer: formattedAnswer,
      citations: [citation],
      metadata: {
        responseType: 'fee_lookup',
        confidence: context.confidence,
        method: context.source.method,
        effectiveDate: context.source.effectiveDate
      }
    };
  }

  private formatHomeCareResponse(context: FeeResponseContext, level: number): string {
    const effectiveDate = new Date(context.source.effectiveDate).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return `The official basic daily fee rate for Home care - level ${level} package is **${context.answer}**.

This rate is effective from ${effectiveDate} and applies to care recipients who first enter home care from 1 July 2014.

${context.additionalContext || ''}

*Note: This is the maximum basic daily fee that can be charged. The actual fee charged may be lower depending on the care recipient's financial circumstances and the specific services provided.*`;
  }

  private formatResidentialCareResponse(context: FeeResponseContext): string {
    const effectiveDate = new Date(context.source.effectiveDate).toLocaleDateString('en-AU', {
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });

    return `The official basic daily fee rate for residential care is **${context.answer}**.

This rate is effective from ${effectiveDate} and applies to residents who first enter residential care from 1 July 2014.

${context.additionalContext || ''}

*Note: This is the maximum basic daily fee that can be charged. The actual fee charged may be lower depending on the resident's financial circumstances.*`;
  }

  private formatMultipleFeeResponse(context: FeeResponseContext): string {
    const effectiveDate = new Date(context.source.effectiveDate).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long', 
      year: 'numeric'
    });

    return `**Current Home Care Package Fees (effective ${effectiveDate}):**

${context.answer}

${context.additionalContext || ''}

*Note: These are the maximum basic daily fees that can be charged. Actual fees may be lower depending on individual financial circumstances and specific services provided.*`;
  }

  private formatGenericFeeResponse(context: FeeResponseContext): string {
    const effectiveDate = new Date(context.source.effectiveDate).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return `**Fee Information (effective ${effectiveDate}):**

${context.answer}

${context.additionalContext || ''}

*Note: Fee information is sourced from official Australian Government aged care fee schedules. Actual fees charged may vary based on individual circumstances.*`;
  }

  private getDocumentDisplayTitle(documentName: string): string {
    // Use the same DocumentTitleService that handles all other citations
    const professionalTitle = documentTitleService.getDocumentTitle(documentName);
    console.log(`📄 FeeResponseGenerator: Mapped "${documentName}" → "${professionalTitle}"`);
    return professionalTitle;
  }

  private extractPageNumber(documentName: string): number {
    // Fee schedules typically have the main fee table on page 1 or 2
    return 1; // Default to page 1 for fee schedules
  }

  public formatHistoricalFeeResponse(feeEvolution: any[], feeType: string): string {
    if (!feeEvolution || feeEvolution.length === 0) {
      return `No historical fee data available for ${feeType}.`;
    }

    const sorted = feeEvolution.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];
    
    const percentChangeNum = ((newest.amount - oldest.amount) / oldest.amount * 100);
    const percentChange = percentChangeNum.toFixed(1);
    
    let response = `**${feeType.replace(/_/g, ' ').toUpperCase()} FEE EVOLUTION:**\n\n`;
    
    // Show key milestones
    const keyMilestones = [oldest, ...sorted.slice(-3)]; // First + last 3
    keyMilestones.forEach(milestone => {
      const date = new Date(milestone.date).toLocaleDateString('en-AU', {
        month: 'short',
        year: 'numeric'
      });
      response += `• ${date}: ${milestone.formatted}\n`;
    });

    response += `\n**Overall Change:** ${oldest.formatted} → ${newest.formatted} (${percentChangeNum > 0 ? '+' : ''}${percentChange}% over ${sorted.length} updates)`;

    return response;
  }

  public formatComparisonResponse(fee1: any, fee2: any, comparisonType: string): string {
    const difference = fee2.amount - fee1.amount;
    const percentDiff = ((difference / fee1.amount) * 100).toFixed(1);
    
    return `**FEE COMPARISON - ${comparisonType.toUpperCase()}:**

• **Earlier:** ${fee1.formatted} (${new Date(fee1.date).toLocaleDateString('en-AU')})
• **Later:** ${fee2.formatted} (${new Date(fee2.date).toLocaleDateString('en-AU')})
• **Difference:** ${difference > 0 ? '+' : ''}${difference.toFixed(2)} (${parseFloat(percentDiff) > 0 ? '+' : ''}${percentDiff}%)

${difference > 0 ? 'Fees have increased' : difference < 0 ? 'Fees have decreased' : 'Fees remain unchanged'} between these periods.`;
  }
}

// Export singleton instance
export const feeResponseGenerator = FeeResponseGenerator.getInstance(); 