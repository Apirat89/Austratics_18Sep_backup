import fs from 'fs';
import path from 'path';

interface DocumentMapping {
  'File Name': string;
  'Title': string;
}

interface MatchResult {
  title: string | null;
  matchType: 'exact' | 'pdf_extension' | 'case_insensitive' | 'normalized' | 'fuzzy' | 'fallback';
  confidence: number;
  matchedEntry?: string;
}

/**
 * Enhanced DocumentTitleService with improved normalization and fuzzy matching
 * 
 * This service provides robust file name to document title mapping with:
 * - Multiple matching strategies (exact, PDF extension, case-insensitive, normalized, fuzzy)
 * - Comprehensive normalization logic
 * - Confidence scoring for match quality
 * - Fallback formatting for unmapped files
 */
export class DocumentTitleServiceEnhanced {
  private static instance: DocumentTitleServiceEnhanced;
  private titleMap = new Map<string, string>();
  private isInitialized = false;
  private mappings: DocumentMapping[] = [];

  private constructor() {}

  public static getInstance(): DocumentTitleServiceEnhanced {
    if (!DocumentTitleServiceEnhanced.instance) {
      DocumentTitleServiceEnhanced.instance = new DocumentTitleServiceEnhanced();
    }
    return DocumentTitleServiceEnhanced.instance;
  }

  /**
   * Initialize the service by loading title mappings from file_titles.json
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const fileTitlesPath = path.join(process.cwd(), 'data', 'Regulation Docs', 'file_titles.json');
      
      if (!fs.existsSync(fileTitlesPath)) {
        console.warn('file_titles.json not found. Service will use fallback formatting only.');
        this.isInitialized = true;
        return;
      }

      const fileContent = fs.readFileSync(fileTitlesPath, 'utf-8');
      this.mappings = JSON.parse(fileContent);

      // Create multiple index maps for efficient lookups
      this.createIndexMaps();

      this.isInitialized = true;
      console.log(`📚 DocumentTitleServiceEnhanced initialized with ${this.mappings.length} title mappings`);

    } catch (error) {
      console.error('Failed to initialize DocumentTitleServiceEnhanced:', error);
      this.isInitialized = true; // Still mark as initialized to avoid repeated attempts
    }
  }

  /**
   * Create multiple index maps for different matching strategies
   */
  private createIndexMaps(): void {
    this.titleMap.clear();

    this.mappings.forEach(mapping => {
      const fileName = mapping['File Name'];
      const title = mapping['Title'];

      if (!fileName || !title) return;

      // Index for exact matches
      this.titleMap.set(fileName, title);

      // Index for case-insensitive matches
      this.titleMap.set(fileName.toLowerCase(), title);

      // Index without PDF extension
      if (fileName.toLowerCase().endsWith('.pdf')) {
        const withoutPdf = fileName.slice(0, -4);
        this.titleMap.set(withoutPdf, title);
        this.titleMap.set(withoutPdf.toLowerCase(), title);
      }

      // Index for normalized matches
      const normalized = this.normalizeFileName(fileName);
      this.titleMap.set(normalized, title);
      
      const normalizedWithoutPdf = this.normalizeFileName(fileName.replace(/\.pdf$/i, ''));
      this.titleMap.set(normalizedWithoutPdf, title);
    });

    console.log(`📊 Created index maps with ${this.titleMap.size} entries for enhanced matching`);
  }

  /**
   * Enhanced file name normalization
   * Handles multiple character patterns and standardizations
   */
  private normalizeFileName(fileName: string): string {
    return fileName
      .toLowerCase()
      .trim()
      // Replace underscores and hyphens with spaces
      .replace(/[_-]/g, ' ')
      // Normalize multiple spaces to single space
      .replace(/\s+/g, ' ')
      // Remove special characters (keep alphanumeric, spaces, dots)
      .replace(/[^\w\s.]/g, ' ')
      // Trim again after replacements
      .trim();
  }

  /**
   * Calculate similarity between two strings using Jaccard similarity
   * Based on character n-grams for better fuzzy matching
   */
  private calculateSimilarity(str1: string, str2: string, nGramSize: number = 2): number {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0.0;

    // Create n-grams
    const createNGrams = (str: string): Set<string> => {
      const nGrams = new Set<string>();
      const normalized = str.toLowerCase();
      
      for (let i = 0; i <= normalized.length - nGramSize; i++) {
        nGrams.add(normalized.slice(i, i + nGramSize));
      }
      
      return nGrams;
    };

    const grams1 = createNGrams(str1);
    const grams2 = createNGrams(str2);

    // Calculate Jaccard similarity
    const intersection = new Set([...grams1].filter(x => grams2.has(x)));
    const union = new Set([...grams1, ...grams2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Enhanced document title retrieval with multiple matching strategies
   */
  public getDocumentTitleEnhanced(fileName: string): MatchResult {
    if (!this.isInitialized) {
      // Auto-initialize if not done yet
      this.initialize();
    }

    if (!fileName) {
      return {
        title: null,
        matchType: 'fallback',
        confidence: 0
      };
    }

    // Strategy 1: Exact match
    const exactMatch = this.titleMap.get(fileName);
    if (exactMatch) {
      return {
        title: exactMatch,
        matchType: 'exact',
        confidence: 1.0,
        matchedEntry: fileName
      };
    }

    // Strategy 2: PDF extension match (add .pdf to database file name)
    const pdfMatch = this.titleMap.get(fileName + '.pdf');
    if (pdfMatch) {
      return {
        title: pdfMatch,
        matchType: 'pdf_extension',
        confidence: 0.95,
        matchedEntry: fileName + '.pdf'
      };
    }

    // Strategy 3: Without PDF extension (remove .pdf from file name)
    if (fileName.toLowerCase().endsWith('.pdf')) {
      const withoutPdf = fileName.slice(0, -4);
      const withoutPdfMatch = this.titleMap.get(withoutPdf);
      if (withoutPdfMatch) {
        return {
          title: withoutPdfMatch,
          matchType: 'pdf_extension',
          confidence: 0.95,
          matchedEntry: withoutPdf
        };
      }
    }

    // Strategy 4: Case-insensitive match
    const caseInsensitiveMatch = this.titleMap.get(fileName.toLowerCase());
    if (caseInsensitiveMatch) {
      return {
        title: caseInsensitiveMatch,
        matchType: 'case_insensitive',
        confidence: 0.9,
        matchedEntry: fileName.toLowerCase()
      };
    }

    // Strategy 5: Normalized match
    const normalizedFileName = this.normalizeFileName(fileName);
    const normalizedMatch = this.titleMap.get(normalizedFileName);
    if (normalizedMatch) {
      return {
        title: normalizedMatch,
        matchType: 'normalized',
        confidence: 0.85,
        matchedEntry: normalizedFileName
      };
    }

    // Strategy 6: Fuzzy matching with similarity threshold
    const fuzzyResult = this.performFuzzyMatching(fileName);
    if (fuzzyResult && fuzzyResult.confidence >= 0.7) {
      return fuzzyResult;
    }

    // Strategy 7: Fallback formatting
    return {
      title: this.formatFileNameFallback(fileName),
      matchType: 'fallback',
      confidence: 0.1
    };
  }

  /**
   * Perform fuzzy matching against all known mappings
   */
  private performFuzzyMatching(fileName: string): MatchResult | null {
    let bestMatch: MatchResult | null = null;
    let bestSimilarity = 0;

    const normalizedInput = this.normalizeFileName(fileName);

    for (const mapping of this.mappings) {
      const mappingFileName = mapping['File Name'];
      const mappingTitle = mapping['Title'];

      if (!mappingFileName || !mappingTitle) continue;

      // Try multiple comparison strategies
      const comparisons = [
        // Direct comparison
        { target: mappingFileName, weight: 1.0 },
        // Without PDF extension
        { target: mappingFileName.replace(/\.pdf$/i, ''), weight: 0.95 },
        // Normalized comparison
        { target: this.normalizeFileName(mappingFileName), weight: 0.9 },
        // Normalized without PDF
        { target: this.normalizeFileName(mappingFileName.replace(/\.pdf$/i, '')), weight: 0.85 }
      ];

      for (const { target, weight } of comparisons) {
        const similarity = this.calculateSimilarity(normalizedInput, this.normalizeFileName(target));
        const weightedSimilarity = similarity * weight;

        if (weightedSimilarity > bestSimilarity) {
          bestSimilarity = weightedSimilarity;
          bestMatch = {
            title: mappingTitle,
            matchType: 'fuzzy',
            confidence: weightedSimilarity,
            matchedEntry: mappingFileName
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Format file name as fallback when no mapping exists
   * Enhanced to handle various file name patterns
   */
  private formatFileNameFallback(fileName: string): string {
    let formatted = fileName;

    // Remove file extension
    formatted = formatted.replace(/\.[^.]+$/, '');

    // Handle code format (e.g., C2025C00122 -> C2025C00122)
    if (/^[A-Z]\d{4}[A-Z]\d{5}/.test(formatted)) {
      return formatted; // Keep code format as-is
    }

    // Replace underscores and hyphens with spaces
    formatted = formatted.replace(/[_-]/g, ' ');

    // Normalize multiple spaces
    formatted = formatted.replace(/\s+/g, ' ');

    // Capitalize words (simple title case)
    formatted = formatted.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    // Handle specific patterns
    formatted = formatted
      .replace(/\b(Act|Manual|Guide|Report|Schedule|Framework)\b/gi, match => match.toUpperCase())
      .replace(/\b(Of|And|The|For|In|To|At|By|On)\b/gi, match => match.toLowerCase())
      .replace(/\b(Chsp|Pdf|Nsw|Qld|Sa|Vic|Wa|Nt)\b/gi, match => match.toUpperCase());

    return formatted.trim();
  }

  /**
   * Get document title using the existing interface for backward compatibility
   */
  public getDocumentTitle(fileName: string): string {
    const result = this.getDocumentTitleEnhanced(fileName);
    return result.title || this.formatFileNameFallback(fileName);
  }

  /**
   * Get match statistics for debugging and monitoring
   */
  public getMatchStatistics(fileNames: string[]): {
    total: number;
    exact: number;
    pdfExtension: number;
    caseInsensitive: number;
    normalized: number;
    fuzzy: number;
    fallback: number;
    averageConfidence: number;
  } {
    const results = fileNames.map(fileName => this.getDocumentTitleEnhanced(fileName));
    
    const stats = {
      total: results.length,
      exact: 0,
      pdfExtension: 0,
      caseInsensitive: 0,
      normalized: 0,
      fuzzy: 0,
      fallback: 0,
      averageConfidence: 0
    };

    let totalConfidence = 0;

    results.forEach(result => {
      stats[result.matchType as keyof typeof stats]++;
      totalConfidence += result.confidence;
    });

    stats.averageConfidence = totalConfidence / results.length;

    return stats;
  }

  /**
   * Get detailed matching information for debugging
   */
  public getDetailedMatchInfo(fileName: string): {
    result: MatchResult;
    strategies: Array<{
      strategy: string;
      attempted: boolean;
      successful: boolean;
      confidence?: number;
    }>;
  } {
    const strategies: Array<{
      strategy: string;
      attempted: boolean;
      successful: boolean;
      confidence?: number;
    }> = [];

    // Track each strategy attempt
    let result: MatchResult;

    // Exact match
    const exactMatch = this.titleMap.get(fileName);
    strategies.push({
      strategy: 'exact',
      attempted: true,
      successful: !!exactMatch,
      confidence: exactMatch ? 1.0 : undefined
    });

    if (exactMatch) {
      result = { title: exactMatch, matchType: 'exact', confidence: 1.0, matchedEntry: fileName };
    } else {
      // Continue with other strategies...
      result = this.getDocumentTitleEnhanced(fileName);
    }

    return { result, strategies };
  }

  /**
   * Clear cache and force re-initialization (useful for testing)
   */
  public clearCache(): void {
    this.titleMap.clear();
    this.mappings = [];
    this.isInitialized = false;
  }
}

// Export singleton instance
export const documentTitleServiceEnhanced = DocumentTitleServiceEnhanced.getInstance(); 