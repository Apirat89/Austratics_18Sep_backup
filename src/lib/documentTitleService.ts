import fs from 'fs';
import path from 'path';

export interface FileTitle {
  "File Name": string;
  "Title": string;
}

export class DocumentTitleService {
  private static instance: DocumentTitleService;
  private titleMap: Map<string, string> = new Map();
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): DocumentTitleService {
    if (!DocumentTitleService.instance) {
      DocumentTitleService.instance = new DocumentTitleService();
    }
    return DocumentTitleService.instance;
  }

  /**
   * Initialize the service by loading title mappings from file_titles.json
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🔧 DocumentTitleService: Initializing title mappings...');
      
      // Get the absolute path to the file_titles.json
      const filePath = path.join(process.cwd(), 'data', 'Regulation Docs', 'file_titles.json');
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.warn('⚠️ DocumentTitleService: file_titles.json not found, using fallback to file names');
        this.isInitialized = true;
        return;
      }

      // Read and parse the JSON file
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const fileTitles: FileTitle[] = JSON.parse(fileContent);

      // Build the title mapping
      let mappingCount = 0;
      for (const item of fileTitles) {
        const fileName = item["File Name"];
        const title = item["Title"];
        
        if (fileName && title) {
          // Store with and without .pdf extension for flexible matching
          this.titleMap.set(fileName, title);
          
          // Also map without .pdf extension for cases where extension is missing
          const nameWithoutExt = fileName.replace(/\.pdf$/i, '');
          this.titleMap.set(nameWithoutExt, title);
          
          mappingCount++;
        }
      }

      console.log(`✅ DocumentTitleService: Loaded ${mappingCount} title mappings from ${fileTitles.length} entries`);
      console.log(`📊 DocumentTitleService: Total mappings in cache: ${this.titleMap.size}`);
      
      this.isInitialized = true;

    } catch (error) {
      console.error('❌ DocumentTitleService: Error loading title mappings:', error);
      // Continue without mappings - service will use fallback to file names
      this.isInitialized = true;
    }
  }

  /**
   * Get the proper title for a document file name
   * Falls back to the original file name if no mapping is found
   */
  public getDocumentTitle(fileName: string): string {
    if (!this.isInitialized) {
      console.warn('⚠️ DocumentTitleService: Service not initialized, using file name as title');
      return this.formatFileNameFallback(fileName);
    }

    // Try exact match first
    let title = this.titleMap.get(fileName);
    
    if (!title) {
      // Try without .pdf extension
      const nameWithoutExt = fileName.replace(/\.pdf$/i, '');
      title = this.titleMap.get(nameWithoutExt);
    }

    if (!title) {
      // Try case-insensitive search
      const lowerFileName = fileName.toLowerCase();
      for (const [key, value] of this.titleMap.entries()) {
        if (key.toLowerCase() === lowerFileName) {
          title = value;
          break;
        }
      }
    }

    if (title) {
      console.log(`🎯 DocumentTitleService: Mapped "${fileName}" → "${title}"`);
      return title;
    }

    // Fallback to formatted file name
    const fallbackTitle = this.formatFileNameFallback(fileName);
    console.log(`📄 DocumentTitleService: No mapping found for "${fileName}", using fallback: "${fallbackTitle}"`);
    return fallbackTitle;
  }

  /**
   * Format file name as a readable title when no mapping is available
   */
  private formatFileNameFallback(fileName: string): string {
    // Remove .pdf extension
    let title = fileName.replace(/\.pdf$/i, '');
    
    // Replace underscores and hyphens with spaces
    title = title.replace(/[_-]/g, ' ');
    
    // Clean up multiple spaces
    title = title.replace(/\s+/g, ' ').trim();
    
    // Capitalize first letter of each word for basic readability
    title = title.replace(/\b\w/g, (char) => char.toUpperCase());
    
    return title;
  }

  /**
   * Get statistics about the title mappings
   */
  public getStats(): { totalMappings: number; isInitialized: boolean } {
    return {
      totalMappings: this.titleMap.size,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Check if a title mapping exists for a file name
   */
  public hasMapping(fileName: string): boolean {
    if (!this.isInitialized) return false;
    
    return this.titleMap.has(fileName) || 
           this.titleMap.has(fileName.replace(/\.pdf$/i, '')) ||
           Array.from(this.titleMap.keys()).some(key => key.toLowerCase() === fileName.toLowerCase());
  }

  /**
   * Get all available file names that have title mappings
   */
  public getAvailableFileNames(): string[] {
    return Array.from(this.titleMap.keys()).filter(key => key.endsWith('.pdf'));
  }

  /**
   * Search for titles containing specific text
   */
  public searchTitles(searchTerm: string): { fileName: string; title: string }[] {
    const results: { fileName: string; title: string }[] = [];
    const lowerSearchTerm = searchTerm.toLowerCase();

    for (const [fileName, title] of this.titleMap.entries()) {
      if (title.toLowerCase().includes(lowerSearchTerm) && fileName.endsWith('.pdf')) {
        results.push({ fileName, title });
      }
    }

    return results;
  }
}

// Export singleton instance getter for convenience
export const documentTitleService = DocumentTitleService.getInstance();

// Auto-initialize when imported (non-blocking)
documentTitleService.initialize().catch(console.error); 