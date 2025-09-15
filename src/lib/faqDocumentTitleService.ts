// =============================================================================
// FAQ DOCUMENT TITLE SERVICE
// =============================================================================
// Professional document titles for FAQ user guide files

import { FAQ_DOCUMENT_TITLES } from '../types/faq';
import { getFAQDocumentUrl } from './supabaseStorage';

interface FAQDocumentTitleMapping {
  [filename: string]: string;
}

class FAQDocumentTitleService {
  private static instance: FAQDocumentTitleService;
  private titleMappings: FAQDocumentTitleMapping = {};
  private initialized = false;

  constructor() {
    this.initializeTitleMappings();
  }

  public static getInstance(): FAQDocumentTitleService {
    if (!FAQDocumentTitleService.instance) {
      FAQDocumentTitleService.instance = new FAQDocumentTitleService();
    }
    return FAQDocumentTitleService.instance;
  }

  private initializeTitleMappings(): void {
    console.log('🔧 FAQDocumentTitleService: Initializing FAQ title mappings...');
    
    // Get Supabase URLs for each document
    const homecareUrl = getFAQDocumentUrl('homecare_userguide.docx');
    const residentialUrl = getFAQDocumentUrl('residential_userguide.docx');
    const mapsUrl = getFAQDocumentUrl('maps_Userguide.docx');
    const newsUrl = getFAQDocumentUrl('news_userguide.docx');
    const sa2Url = getFAQDocumentUrl('SA2_userguide.docx');
    
    // Core FAQ user guide mappings
    this.titleMappings = {
      // Direct filename mappings
      'homecare_userguide.docx': 'Home Care User Guide',
      'residential_userguide.docx': 'Residential Care User Guide', 
      'maps_Userguide.docx': 'Maps Feature User Guide',
      'news_userguide.docx': 'News Feature User Guide',
      'SA2_userguide.docx': 'SA2 Analysis User Guide',
      
      // Variations without extension
      'homecare_userguide': 'Home Care User Guide',
      'residential_userguide': 'Residential Care User Guide',
      'maps_Userguide': 'Maps Feature User Guide', 
      'news_userguide': 'News Feature User Guide',
      'SA2_userguide': 'SA2 Analysis User Guide',
      
      // Alternative naming patterns
      'homecare-userguide': 'Home Care User Guide',
      'residential-userguide': 'Residential Care User Guide',
      'maps-userguide': 'Maps Feature User Guide',
      'news-userguide': 'News Feature User Guide',
      'sa2-userguide': 'SA2 Analysis User Guide',
      
      // Lowercase variations
      'homecare userguide': 'Home Care User Guide',
      'residential userguide': 'Residential Care User Guide',
      'maps userguide': 'Maps Feature User Guide',
      'news userguide': 'News Feature User Guide',
      'sa2 userguide': 'SA2 Analysis User Guide',
      
      // Full path variations (in case paths are passed)
      'data/FAQ/homecare_userguide.docx': 'Home Care User Guide',
      'data/FAQ/residential_userguide.docx': 'Residential Care User Guide',
      'data/FAQ/maps_Userguide.docx': 'Maps Feature User Guide',
      'data/FAQ/news_userguide.docx': 'News Feature User Guide',
      'data/FAQ/SA2_userguide.docx': 'SA2 Analysis User Guide',
      
      // Supabase URL variations
      [homecareUrl]: 'Home Care User Guide',
      [residentialUrl]: 'Residential Care User Guide',
      [mapsUrl]: 'Maps Feature User Guide',
      [newsUrl]: 'News Feature User Guide',
      [sa2Url]: 'SA2 Analysis User Guide',
    };

    const mappingCount = Object.keys(this.titleMappings).length;
    console.log(`✅ FAQDocumentTitleService: Loaded ${mappingCount} FAQ title mappings`);
    
    this.initialized = true;
  }

  /**
   * Get professional title for FAQ document filename
   * @param filename - The document filename or path
   * @returns Professional document title or original filename if no mapping exists
   */
  public getTitle(filename: string): string {
    if (!this.initialized) {
      this.initializeTitleMappings();
    }

    // Clean filename by removing paths and normalizing
    const cleanFilename = this.cleanFilename(filename);
    
    // Try exact match first
    if (this.titleMappings[cleanFilename]) {
      console.log(`🎯 FAQDocumentTitleService: Mapped "${cleanFilename}" → "${this.titleMappings[cleanFilename]}"`);
      return this.titleMappings[cleanFilename];
    }

    // Try various normalized versions
    const normalizedVariations = this.generateFilenameVariations(cleanFilename);
    
    for (const variation of normalizedVariations) {
      if (this.titleMappings[variation]) {
        console.log(`🎯 FAQDocumentTitleService: Mapped "${cleanFilename}" → "${this.titleMappings[variation]}" (via "${variation}")`);
        return this.titleMappings[variation];
      }
    }

    // Fallback: try to generate a reasonable title from filename
    const generatedTitle = this.generateTitleFromFilename(cleanFilename);
    console.log(`⚠️ FAQDocumentTitleService: No mapping found for "${cleanFilename}", generated: "${generatedTitle}"`);
    
    return generatedTitle;
  }

  /**
   * Add or update document title mapping
   * @param filename - Document filename
   * @param title - Professional title
   */
  public addMapping(filename: string, title: string): void {
    const cleanFilename = this.cleanFilename(filename);
    this.titleMappings[cleanFilename] = title;
    console.log(`➕ FAQDocumentTitleService: Added mapping "${cleanFilename}" → "${title}"`);
  }

  /**
   * Get all available title mappings
   * @returns Object with filename to title mappings
   */
  public getAllMappings(): FAQDocumentTitleMapping {
    return { ...this.titleMappings };
  }

  /**
   * Get count of available mappings
   * @returns Number of title mappings
   */
  public getMappingCount(): number {
    return Object.keys(this.titleMappings).length;
  }

  /**
   * Check if mapping exists for filename
   * @param filename - Document filename
   * @returns Whether mapping exists
   */
  public hasMapping(filename: string): boolean {
    const cleanFilename = this.cleanFilename(filename);
    return cleanFilename in this.titleMappings;
  }

  /**
   * Get guide category from filename
   * @param filename - Document filename
   * @returns Guide category (homecare, residential, maps, news, sa2)
   */
  public getGuideCategory(filename: string): string | null {
    const cleanFilename = this.cleanFilename(filename).toLowerCase();
    
    if (cleanFilename.includes('homecare')) return 'homecare';
    if (cleanFilename.includes('residential')) return 'residential';
    if (cleanFilename.includes('maps')) return 'maps';
    if (cleanFilename.includes('news')) return 'news';
    if (cleanFilename.includes('sa2')) return 'sa2';
    
    return null;
  }

  // Private helper methods

  private cleanFilename(filename: string): string {
    // Remove common path prefixes
    let cleaned = filename.replace(/^.*[\/\\]/, ''); // Remove path
    
    // Remove common file extensions
    cleaned = cleaned.replace(/\.(docx?|pdf|txt)$/i, '');
    
    return cleaned.trim();
  }

  private generateFilenameVariations(filename: string): string[] {
    const variations: string[] = [];
    
    // Add original
    variations.push(filename);
    
    // Add lowercase version
    variations.push(filename.toLowerCase());
    
    // Add versions with different separators
    const withSpaces = filename.replace(/[-_]/g, ' ');
    const withDashes = filename.replace(/[_\s]/g, '-');
    const withUnderscores = filename.replace(/[-\s]/g, '_');
    
    variations.push(withSpaces, withDashes, withUnderscores);
    
    // Add with .docx extension
    variations.push(filename + '.docx');
    variations.push(filename.toLowerCase() + '.docx');
    
    // Remove duplicates
    return [...new Set(variations)];
  }

  private generateTitleFromFilename(filename: string): string {
    // Convert filename to title case
    return filename
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\s+/g, ' ')
      .trim() + ' User Guide';
  }

  /**
   * Get formatted citation text for FAQ document
   * @param filename - Document filename
   * @param pageNumber - Optional page number
   * @returns Formatted citation text
   */
  public getFormattedCitation(filename: string, pageNumber?: number | null): string {
    const title = this.getTitle(filename);
    
    if (pageNumber && pageNumber > 0) {
      return `${title} (Page ${pageNumber})`;
    }
    
    return title;
  }

  /**
   * Get document metadata for FAQ file
   * @param filename - Document filename
   * @returns Document metadata
   */
  public getDocumentMetadata(filename: string) {
    return {
      title: this.getTitle(filename),
      guide_category: this.getGuideCategory(filename),
      filename: filename,
      has_mapping: this.hasMapping(filename),
      citation: this.getFormattedCitation(filename)
    };
  }
}

// Export singleton instance
export const faqDocumentTitleService = FAQDocumentTitleService.getInstance();

// Export class for testing
export { FAQDocumentTitleService }; 