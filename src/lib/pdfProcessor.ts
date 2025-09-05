import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

// Dynamic import to avoid initialization issues
let pdfParse: any = null;

async function getPdfParse() {
  if (!pdfParse) {
    pdfParse = (await import('pdf-parse')).default;
  }
  return pdfParse;
}

// Types for our PDF processing
export interface DocumentChunk {
  id?: number;
  document_name: string;
  document_type: string;
  section_title?: string;
  content: string;
  page_number: number;
  chunk_index: number;
  embedding?: number[];
  created_at?: string;
  // New field for citation validation
  actual_pdf_pages?: number;
}

export interface ProcessingResult {
  success: boolean;
  document_name: string;
  chunks_created: number;
  error?: string;
}

// Document type mapping based on folder structure
const DOCUMENT_TYPE_MAPPING: Record<string, string> = {
  'aged care act': 'aged_care_act',
  'chsp': 'chsp_support_at_home',
  'fee and subsidies': 'fees_and_subsidies',
  'home care package': 'home_care_package',
  'residential aged care funding': 'residential_funding',
  'retirement village act': 'retirement_village_act',
  'strc': 'strc_support_at_home',
  'support at home': 'support_at_home_program'
};

export class PDFProcessor {
  private supabase: any;
  private genAI: GoogleGenerativeAI;
  private maxChunkSize: number = 1000; // Characters per chunk
  private chunkOverlap: number = 200; // Overlap between chunks

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
   * Extract text from PDF file
   */
  async extractTextFromPDF(filePath: string): Promise<{
    text: string;
    numPages: number;
    metadata: any;
  }> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const pdfParseLib = await getPdfParse();
      const data = await pdfParseLib(fileBuffer);

      return {
        text: data.text,
        numPages: data.numpages,
        metadata: data.info
      };
    } catch (error) {
      console.error(`Error extracting text from ${filePath}:`, error);
      throw new Error(`Failed to extract text from PDF: ${error}`);
    }
  }

  /**
   * Clean extracted text to remove potential noise
   */
  private cleanExtractedText(text: string): string {
    // Remove multiple newlines and excessive whitespace
    return text.replace(/\n\s*\n/g, '\n\n').replace(/\s+/g, ' ').trim();
  }

  /**
   * Determine document type from file path
   */
  private getDocumentType(filePath: string): string {
    const normalizedPath = filePath.toLowerCase();
    
    for (const [folderName, docType] of Object.entries(DOCUMENT_TYPE_MAPPING)) {
      if (normalizedPath.includes(folderName)) {
        return docType;
      }
    }
    
    return 'other';
  }

  /**
   * Extract section title from text content
   */
  private extractSectionTitle(text: string): string | undefined {
    // Look for section headers like "Section 2-1" or "Division 3"
    const sectionRegex = /^(Section\s+\d+[-\d]*|Division\s+\d+|Chapter\s+\d+|Part\s+\d+)\.?\s*(.{0,100})/i;
    const match = text.match(sectionRegex);
    
    if (match) {
      return match[0].trim();
    }
    
    // Alternative: Look for numbered headings
    const headingRegex = /^(\d+\.?\s*.{1,80})/m;
    const headingMatch = text.match(headingRegex);
    
    if (headingMatch && headingMatch[0].length < 100) {
      return headingMatch[0].trim();
    }
    
    return undefined;
  }

  /**
   * Intelligent text chunking that preserves document structure
   */
  protected chunkText(text: string, documentName: string, actualPdfPages: number): Array<{
    content: string;
    section_title?: string;
    page_number: number;
    chunk_index: number;
  }> {
    const chunks: Array<{
      content: string;
      section_title?: string;
      page_number: number;
      chunk_index: number;
    }> = [];

    // 🚨 CRITICAL FIX: Much more conservative page number assignment
    // Instead of trying to estimate exact pages, use page ranges based on chunk position
    
    // Split by form feeds (page breaks) if available
    const pageBreaks = text.split(/\f/);
    
    // If we have actual page breaks, use them
    if (pageBreaks.length > 1 && pageBreaks.length <= actualPdfPages) {
      // We have reasonable page breaks - use them directly
      let chunkIndex = 0;
      
      for (let pageIndex = 0; pageIndex < pageBreaks.length; pageIndex++) {
        const pageText = pageBreaks[pageIndex].trim();
        if (!pageText) continue;

        // Use actual page number (1-based, never exceeds actual PDF pages)
        const actualPageNumber = Math.min(pageIndex + 1, actualPdfPages);

        // Process this page
        if (pageText.length <= this.maxChunkSize) {
          const sectionTitle = this.extractSectionTitle(pageText);
          chunks.push({
            content: pageText,
            section_title: sectionTitle,
            page_number: actualPageNumber,
            chunk_index: chunkIndex++
          });
        } else {
          // Split large pages but keep same page number
          const pageChunks = this.splitLargeText(pageText, actualPageNumber);
          pageChunks.forEach(chunk => {
            chunks.push({
              ...chunk,
              chunk_index: chunkIndex++
            });
          });
        }
      }
    } else {
      // 🚨 CRITICAL: Conservative fallback - use broad page ranges instead of specific pages
      // This prevents phantom page citations by being deliberately vague
      
      const totalChunks = Math.ceil(text.length / this.maxChunkSize);
      const chunksPerPageRange = Math.max(1, Math.floor(totalChunks / Math.min(actualPdfPages, 10)));
      
      let currentPos = 0;
      let chunkIndex = 0;
      
      // Create chunks with conservative page ranges
      for (let i = 0; i < totalChunks; i++) {
        const startPos = currentPos;
        const endPos = Math.min(currentPos + this.maxChunkSize, text.length);
        
        // Find a good break point
        let actualEndPos = endPos;
        if (endPos < text.length) {
          const nextSentenceEnd = text.indexOf('.', endPos);
          if (nextSentenceEnd > 0 && nextSentenceEnd < endPos + 200) {
            actualEndPos = nextSentenceEnd + 1;
          }
        }
        
        const chunkText = text.substring(startPos, actualEndPos).trim();
        if (!chunkText) continue;
        
        // 🚨 CRITICAL: Conservative page number assignment
        // Use early page numbers (1-50) for early chunks, then use 0 for uncertain chunks
        let pageNumber: number;
        if (i < chunksPerPageRange) {
          pageNumber = Math.min(i + 1, 50); // Cap at page 50 for early chunks
        } else {
          pageNumber = 0; // Use 0 to indicate "unknown page" for later chunks
        }
        
        const sectionTitle = this.extractSectionTitle(chunkText);
        chunks.push({
          content: chunkText,
          section_title: sectionTitle,
          page_number: pageNumber,
          chunk_index: chunkIndex++
        });
        
        currentPos = actualEndPos;
      }
    }

    return chunks;
  }

  /**
   * Split large text into chunks while preserving page number
   */
  private splitLargeText(text: string, pageNumber: number): Array<{
    content: string;
    section_title?: string;
    page_number: number;
  }> {
    const chunks: Array<{
      content: string;
      section_title?: string;
      page_number: number;
    }> = [];

    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';
    let currentSectionTitle: string | undefined = undefined;

    for (const sentence of sentences) {
      // Check if this sentence starts a new section
      const possibleSectionTitle = this.extractSectionTitle(sentence);
      if (possibleSectionTitle && sentence.length < 150) {
        // Save current chunk if it exists
        if (currentChunk.trim()) {
          chunks.push({
            content: currentChunk.trim(),
            section_title: currentSectionTitle,
            page_number: pageNumber
          });
        }
        
        // Start new chunk with section title
        currentChunk = sentence;
        currentSectionTitle = possibleSectionTitle;
      } else {
        // Add sentence to current chunk
        if (currentChunk.length + sentence.length + 1 > this.maxChunkSize) {
          // Save current chunk and start new one
          if (currentChunk.trim()) {
            chunks.push({
              content: currentChunk.trim(),
              section_title: currentSectionTitle,
              page_number: pageNumber
            });
          }
          
          // Start new chunk with overlap
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-Math.floor(this.chunkOverlap / 6));
          currentChunk = overlapWords.join(' ') + ' ' + sentence;
        } else {
          currentChunk += ' ' + sentence;
        }
      }
    }

    // Save final chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        section_title: currentSectionTitle,
        page_number: pageNumber
      });
    }

    return chunks;
  }

  /**
   * Generate embeddings for text using Gemini's embedding model
   * NOTE: For the chatbot, we'll use gemini-2.5-flash for the best chat performance
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Using Google's text embedding model: text-embedding-004
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      
      const result = await model.embedContent(text);
      
      if (!result.embedding || !result.embedding.values) {
        throw new Error('No embedding values returned from Gemini');
      }

      return result.embedding.values;
    } catch (error) {
      console.error('Error generating Gemini embedding:', error);
      throw new Error(`Failed to generate embedding: ${error}`);
    }
  }

  /**
   * Store document chunks in Supabase
   */
  async storeChunks(chunks: DocumentChunk[]): Promise<void> {
    try {
      // Prepare data for insertion
      const insertData = chunks.map(chunk => ({
        document_name: chunk.document_name,
        document_type: chunk.document_type,
        section_title: chunk.section_title,
        content: chunk.content,
        page_number: chunk.page_number,
        chunk_index: chunk.chunk_index,
        embedding: chunk.embedding,
        actual_pdf_pages: chunk.actual_pdf_pages
      }));

      // Insert in batches to avoid request size limits
      const batchSize = 100;
      for (let i = 0; i < insertData.length; i += batchSize) {
        const batch = insertData.slice(i, i + batchSize);
        
        const { error } = await this.supabase
          .from('document_chunks')
          .insert(batch);

        if (error) {
          throw new Error(`Supabase insert error: ${error.message}`);
        }
      }

      console.log(`✅ Successfully stored ${chunks.length} chunks in database`);
    } catch (error) {
      console.error('Error storing chunks:', error);
      throw error;
    }
  }

  /**
   * Process a single PDF file
   */
  async processPDF(filePath: string): Promise<ProcessingResult> {
    try {
      console.log(`📄 Processing: ${path.basename(filePath)}`);
      
      // Extract text and get PDF metadata
      const { text, numPages, metadata } = await this.extractTextFromPDF(filePath);
      
      // Store actual PDF page count for citation validation
      const actualPdfPages = numPages;
      
      // Clean extracted text
      const cleanText = this.cleanExtractedText(text);
      
      // Determine document type
      const documentType = this.getDocumentType(filePath);
      const documentName = path.basename(filePath, '.pdf');
      
      // Generate chunks with proper page number tracking
      const rawChunks = this.chunkText(cleanText, documentName, actualPdfPages);
      
      // Create document chunks with embeddings
      const chunks: DocumentChunk[] = [];
      
      console.log(`📝 Creating ${rawChunks.length} chunks...`);
      
      for (let i = 0; i < rawChunks.length; i++) {
        const chunk = rawChunks[i];
        
        // Generate embedding for this chunk
        const embedding = await this.generateEmbedding(chunk.content);
        
        // Validate page number against actual PDF pages
        const validatedPageNumber = Math.min(chunk.page_number, actualPdfPages);
        
        chunks.push({
          document_name: documentName,
          document_type: documentType,
          section_title: chunk.section_title,
          content: chunk.content,
          page_number: validatedPageNumber,
          chunk_index: chunk.chunk_index,
          embedding: embedding,
          actual_pdf_pages: actualPdfPages // Store for later validation
        });
        
        // Progress indicator
        if ((i + 1) % 5 === 0) {
          console.log(`   Generated ${i + 1}/${rawChunks.length} embeddings...`);
        }
      }
      
      // Store all chunks in database
      await this.storeChunks(chunks);
      
      console.log(`✅ Successfully processed ${documentName}: ${chunks.length} chunks created`);
      
      return {
        success: true,
        document_name: documentName,
        chunks_created: chunks.length
      };
      
    } catch (error) {
      console.error(`❌ Error processing PDF ${filePath}:`, error);
      return {
        success: false,
        document_name: path.basename(filePath, '.pdf'),
        chunks_created: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Process all PDFs in a directory recursively
   */
  async processDirectory(directoryPath: string): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];

    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively process subdirectories
          const subResults = await this.processDirectory(fullPath);
          results.push(...subResults);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
          // Process PDF file
          const result = await this.processPDF(fullPath);
          results.push(result);
        }
      }

      return results;
    } catch (error) {
      console.error(`Error processing directory ${directoryPath}:`, error);
      return [];
    }
  }

  /**
   * Search for similar content using vector similarity
   */
  async searchSimilarContent(query: string, limit: number = 5, threshold: number = 0.7): Promise<DocumentChunk[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search for similar vectors in database
      const { data, error } = await this.supabase.rpc('match_documents', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit
      });

      if (error) {
        throw new Error(`Search error: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error searching similar content:', error);
      throw error;
    }
  }
}

// Create a SQL function for vector similarity search (updated for Gemini embeddings)
export const VECTOR_SEARCH_SQL = `
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  document_name text,
  document_type text,
  section_title text,
  content text,
  page_number int,
  chunk_index int,
  actual_pdf_pages int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_name,
    document_chunks.document_type,
    document_chunks.section_title,
    document_chunks.content,
    document_chunks.page_number,
    document_chunks.chunk_index,
    document_chunks.actual_pdf_pages,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
`; 