// =============================================================================
// FAQ DOCUMENT PROCESSOR
// =============================================================================
// Processes FAQ user guide DOCX files into vector embeddings for search

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FAQDocumentChunk, FAQ_GUIDE_CATEGORIES } from '../types/faq';
import { faqDocumentTitleService } from './faqDocumentTitleService';

// Import DOCX parser (no official types available)
let mammoth: any;
async function getMammoth() {
  if (!mammoth) {
    // @ts-ignore - mammoth doesn't have official TypeScript types
    mammoth = await import('mammoth');
  }
  return mammoth;
}

// Types for FAQ document processing
export interface FAQProcessingResult {
  success: boolean;
  document_name: string;
  chunks_created: number;
  guide_category: string;
  error?: string;
}

export interface FAQRawChunk {
  content: string;
  section_title?: string;
  page_number: number;
  chunk_index: number;
}

// FAQ-specific document type mapping
const FAQ_TYPE_MAPPING: Record<string, string> = {
  'homecare': 'homecare_guide',
  'residential': 'residential_guide', 
  'maps': 'maps_guide',
  'news': 'news_guide',
  'sa2': 'sa2_guide'
};

export class FAQDocumentProcessor {
  private supabase: any;
  private genAI: GoogleGenerativeAI;
  private maxChunkSize: number = 800; // Slightly smaller chunks for FAQ content
  private chunkOverlap: number = 150; // Overlap between chunks

  constructor() {
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Initialize Gemini AI for embeddings
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  /**
   * Extract text from DOCX file
   */
  async extractTextFromDOCX(filePath: string): Promise<{
    text: string;
    metadata: any;
  }> {
    try {
      const mammoth = await getMammoth();
      
      // Read the DOCX file
      const fileBuffer = fs.readFileSync(filePath);
      
      // Extract text with options to preserve structure
      const result = await mammoth.extractRawText({ 
        buffer: fileBuffer,
        convertImage: mammoth.images.imgElement(function(image: any) {
          // Skip images in FAQ processing
          return '';
        })
      });
      
      console.log(`📄 Extracted ${result.value.length} characters from ${path.basename(filePath)}`);
      
      // Process any warnings
      if (result.messages && result.messages.length > 0) {
        console.log(`⚠️  Processing messages:`, result.messages.length);
      }
      
      return {
        text: result.value,
        metadata: {
          originalLength: result.value.length,
          warnings: result.messages || [],
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`❌ Error extracting text from ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Clean extracted text for better processing
   */
  private cleanExtractedText(text: string): string {
    return text
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      // Remove page breaks and form feeds
      .replace(/[\f\v]/g, '')
      // Clean up bullet points and formatting
      .replace(/•\s*/g, '- ')
      .replace(/\s*-\s*-\s*/g, ' - ')
      // Remove multiple spaces
      .replace(/  +/g, ' ')
      // Trim whitespace
      .trim();
  }

  /**
   * Determine guide category from file path or name
   */
  private getGuideCategory(filePath: string): string {
    const fileName = path.basename(filePath).toLowerCase();
    
    if (fileName.includes('homecare')) return FAQ_GUIDE_CATEGORIES.HOMECARE;
    if (fileName.includes('residential')) return FAQ_GUIDE_CATEGORIES.RESIDENTIAL;
    if (fileName.includes('maps')) return FAQ_GUIDE_CATEGORIES.MAPS;
    if (fileName.includes('news')) return FAQ_GUIDE_CATEGORIES.NEWS;
    if (fileName.includes('sa2')) return FAQ_GUIDE_CATEGORIES.SA2;
    
    // Default fallback
    return 'general';
  }

  /**
   * Determine section category from content context
   */
  private getSectionCategory(content: string, chunkIndex: number): string {
    const lowerContent = content.toLowerCase();
    
    // Early chunks likely to be getting started content
    if (chunkIndex < 3) {
      if (lowerContent.includes('getting started') || lowerContent.includes('introduction') || lowerContent.includes('overview')) {
        return 'getting_started';
      }
    }
    
    // Check for specific section indicators
    if (lowerContent.includes('troubleshoot') || lowerContent.includes('problem') || lowerContent.includes('error') || lowerContent.includes('fix')) {
      return 'troubleshooting';
    }
    
    if (lowerContent.includes('feature') || lowerContent.includes('how to') || lowerContent.includes('using')) {
      return 'features';
    }
    
    if (lowerContent.includes('advanced') || lowerContent.includes('configuration') || lowerContent.includes('settings')) {
      return 'advanced';
    }
    
    if (lowerContent.includes('faq') || lowerContent.includes('frequently asked') || lowerContent.includes('common questions')) {
      return 'faq';
    }
    
    if (lowerContent.includes('example') || lowerContent.includes('sample') || lowerContent.includes('demo')) {
      return 'examples';
    }
    
    // Default
    return 'general';
  }

  /**
   * Generate text chunks from FAQ content
   */
  private chunkText(
    text: string, 
    documentName: string, 
    guideCategory: string
  ): FAQRawChunk[] {
    const chunks: FAQRawChunk[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let currentSection = '';
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (!sentence) continue;
      
      // Check if this sentence might be a section header
      if (sentence.length < 100 && (
        sentence.includes(':') || 
        /^[A-Z][^.]*$/.test(sentence) ||
        sentence.includes('Step') ||
        sentence.includes('Chapter')
      )) {
        currentSection = sentence;
      }
      
      // Check if adding this sentence would exceed chunk size
      if (currentChunk.length + sentence.length + 2 > this.maxChunkSize) {
        if (currentChunk.trim()) {
          // Add the current chunk
          chunks.push({
            content: currentChunk.trim(),
            section_title: currentSection || undefined,
            page_number: Math.ceil((i + 1) / 50), // Approximate page numbers
            chunk_index: chunkIndex
          });
          
          // Start new chunk with overlap
          const overlapStart = Math.max(0, currentChunk.length - this.chunkOverlap);
          currentChunk = currentChunk.substring(overlapStart) + ' ' + sentence + '.';
          chunkIndex++;
        } else {
          currentChunk = sentence + '.';
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence + '.';
      }
    }
    
    // Add final chunk if it has content
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        section_title: currentSection || undefined,
        page_number: Math.ceil(chunks.length / 10) + 1,
        chunk_index: chunkIndex
      });
    }
    
    console.log(`📝 Created ${chunks.length} chunks from ${documentName}`);
    return chunks;
  }

  /**
   * Generate embedding for text using Gemini
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: 'text-embedding-004'
      });
      
      const result = await model.embedContent(text);
      const embedding = result.embedding;
      
      if (!embedding.values || embedding.values.length !== 768) {
        throw new Error(`Invalid embedding dimensions: expected 768, got ${embedding.values?.length || 0}`);
      }
      
      return embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Store FAQ chunks in database
   */
  private async storeChunks(chunks: FAQDocumentChunk[]): Promise<void> {
    try {
      console.log(`💾 Storing ${chunks.length} FAQ chunks...`);
      
      // Insert chunks in batches to avoid timeout
      const batchSize = 10;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        const { data, error } = await this.supabase
          .from('faq_document_chunks')
          .insert(batch);
        
        if (error) {
          console.error('❌ Error storing FAQ chunk batch:', error);
          throw error;
        }
        
        console.log(`   Stored batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}`);
      }
      
      console.log(`✅ Successfully stored all ${chunks.length} FAQ chunks`);
    } catch (error) {
      console.error('❌ Error in storeChunks:', error);
      throw error;
    }
  }

  /**
   * Process a single FAQ DOCX file
   */
  async processFAQDocument(filePath: string): Promise<FAQProcessingResult> {
    try {
      console.log(`🔄 Processing FAQ document: ${path.basename(filePath)}`);
      
      // Extract text from DOCX
      const { text, metadata } = await this.extractTextFromDOCX(filePath);
      
      // Clean extracted text
      const cleanText = this.cleanExtractedText(text);
      
      // Determine guide category and document info
      const guideCategory = this.getGuideCategory(filePath);
      const documentName = path.basename(filePath);
      const documentType = FAQ_TYPE_MAPPING[guideCategory] || 'user_guide';
      
      // Get professional title
      const professionalTitle = faqDocumentTitleService.getTitle(documentName);
      
      console.log(`📋 Document: ${professionalTitle} (${guideCategory})`);
      
      // Generate raw chunks
      const rawChunks = this.chunkText(cleanText, documentName, guideCategory);
      
      // Create document chunks with embeddings
      const chunks: FAQDocumentChunk[] = [];
      
      console.log(`🔄 Generating embeddings for ${rawChunks.length} chunks...`);
      
      for (let i = 0; i < rawChunks.length; i++) {
        const rawChunk = rawChunks[i];
        
        // Generate embedding for this chunk
        const embedding = await this.generateEmbedding(rawChunk.content);
        
        // Determine section category
        const sectionCategory = this.getSectionCategory(rawChunk.content, i);
        
        const chunk: FAQDocumentChunk = {
          id: 0, // Will be assigned by database
          document_name: documentName,
          document_type: documentType,
          section_title: rawChunk.section_title || null,
          content: rawChunk.content,
          page_number: rawChunk.page_number,
          chunk_index: rawChunk.chunk_index,
          actual_pdf_pages: null, // Not applicable for DOCX
          embedding: embedding,
          guide_category: guideCategory,
          section_category: sectionCategory,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        chunks.push(chunk);
        
        // Progress indicator
        if ((i + 1) % 5 === 0) {
          console.log(`   Generated ${i + 1}/${rawChunks.length} embeddings...`);
        }
      }
      
      // Store all chunks in database
      await this.storeChunks(chunks);
      
      const result: FAQProcessingResult = {
        success: true,
        document_name: documentName,
        chunks_created: chunks.length,
        guide_category: guideCategory
      };
      
      console.log(`✅ Successfully processed ${professionalTitle}: ${chunks.length} chunks created`);
      return result;
      
    } catch (error: any) {
      console.error(`❌ Error processing ${path.basename(filePath)}:`, error);
      
      return {
        success: false,
        document_name: path.basename(filePath),
        chunks_created: 0,
        guide_category: this.getGuideCategory(filePath),
        error: error.message
      };
    }
  }

  /**
   * Process all FAQ documents in a directory
   */
  async processFAQDirectory(directoryPath: string): Promise<FAQProcessingResult[]> {
    try {
      console.log(`🗂️  Processing FAQ directory: ${directoryPath}`);
      
      // Find all DOCX files
      const files = fs.readdirSync(directoryPath)
        .filter(file => file.toLowerCase().endsWith('.docx'))
        .map(file => path.join(directoryPath, file));
      
      console.log(`📄 Found ${files.length} DOCX files to process`);
      
      if (files.length === 0) {
        console.log('⚠️  No DOCX files found in directory');
        return [];
      }
      
      const results: FAQProcessingResult[] = [];
      
      // Process each file
      for (const filePath of files) {
        const result = await this.processFAQDocument(filePath);
        results.push(result);
        
        // Add small delay between files to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Summary
      const successful = results.filter(r => r.success).length;
      const totalChunks = results.reduce((sum, r) => sum + r.chunks_created, 0);
      
      console.log(`\n📊 FAQ Processing Summary:`);
      console.log(`   Total files: ${files.length}`);
      console.log(`   Successful: ${successful}`);
      console.log(`   Failed: ${files.length - successful}`);
      console.log(`   Total chunks created: ${totalChunks}`);
      
      return results;
      
    } catch (error: any) {
      console.error(`❌ Error processing FAQ directory ${directoryPath}:`, error);
      return [];
    }
  }

  /**
   * Search FAQ content using vector similarity
   */
  async searchFAQContent(
    query: string, 
    limit: number = 5, 
    threshold: number = 0.7,
    guideCategory?: string
  ): Promise<FAQDocumentChunk[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Choose appropriate RPC function
      const rpcFunction = guideCategory ? 'match_faq_documents_by_category' : 'match_faq_documents';
      const rpcParams: any = {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit
      };
      
      if (guideCategory) {
        rpcParams.filter_guide_category = guideCategory;
      }

      // Search for similar vectors in FAQ database
      const { data, error } = await this.supabase.rpc(rpcFunction, rpcParams);

      if (error) {
        throw new Error(`FAQ search error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error searching FAQ content:', error);
      return [];
    }
  }

  /**
   * Get FAQ processing statistics
   */
  async getFAQStats(): Promise<{
    total_chunks: number;
    documents_by_category: Record<string, number>;
    total_documents: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('faq_document_chunks')
        .select('guide_category, document_name');

      if (error) throw error;

      const stats = {
        total_chunks: data?.length || 0,
        total_documents: [...new Set(data?.map((d: any) => d.document_name) || [])].length,
        documents_by_category: {} as Record<string, number>
      };

      // Count documents by category
      const categories = data?.map((d: any) => d.guide_category) || [];
      const uniqueByCategory = categories.reduce((acc: any, category: string) => {
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      stats.documents_by_category = uniqueByCategory;

      return stats;
    } catch (error) {
      console.error('Error getting FAQ stats:', error);
      return {
        total_chunks: 0,
        documents_by_category: {},
        total_documents: 0
      };
    }
  }
} 