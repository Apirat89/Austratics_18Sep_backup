#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

class SimpleFAQProcessor {
  constructor() {
    // Initialize Supabase
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Initialize Gemini AI
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  
  async extractTextFromDOCX(filePath) {
    try {
      // Import mammoth dynamically
      const mammoth = await import('mammoth');
      
      const fileBuffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      
      console.log(`📄 Extracted ${result.value.length} characters from ${path.basename(filePath)}`);
      
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
  
  cleanExtractedText(text) {
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
  
  getGuideCategory(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    
    if (fileName.includes('homecare')) return 'homecare';
    if (fileName.includes('residential')) return 'residential';
    if (fileName.includes('maps')) return 'maps';
    if (fileName.includes('news')) return 'news';
    if (fileName.includes('sa2')) return 'sa2';
    
    return 'general';
  }
  
  getSectionCategory(content, chunkIndex) {
    const lowerContent = content.toLowerCase();
    
    // Early chunks likely to be getting started content
    if (chunkIndex < 3) {
      if (lowerContent.includes('getting started') || 
          lowerContent.includes('introduction') || 
          lowerContent.includes('overview')) {
        return 'getting_started';
      }
    }
    
    // Check for specific section indicators
    if (lowerContent.includes('troubleshoot') || 
        lowerContent.includes('problem') || 
        lowerContent.includes('error') || 
        lowerContent.includes('fix')) {
      return 'troubleshooting';
    }
    
    if (lowerContent.includes('feature') || 
        lowerContent.includes('how to') || 
        lowerContent.includes('using')) {
      return 'features';
    }
    
    if (lowerContent.includes('faq') || 
        lowerContent.includes('frequently asked') || 
        lowerContent.includes('common questions')) {
      return 'faq';
    }
    
    return 'general';
  }
  
  chunkText(text, documentName, guideCategory) {
    const chunks = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let currentSection = '';
    const maxChunkSize = 800;
    const chunkOverlap = 150;
    
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
      if (currentChunk.length + sentence.length + 2 > maxChunkSize) {
        if (currentChunk.trim()) {
          // Add the current chunk
          chunks.push({
            content: currentChunk.trim(),
            section_title: currentSection || undefined,
            page_number: Math.ceil((i + 1) / 50), // Approximate page numbers
            chunk_index: chunkIndex
          });
          
          // Start new chunk with overlap
          const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
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
  
  async generateEmbedding(text) {
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
  
  async storeChunks(chunks) {
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
  
  getProfessionalTitle(filename) {
    const titleMap = {
      'homecare_userguide.docx': 'Home Care User Guide',
      'residential_userguide.docx': 'Residential Care User Guide',
      'maps_Userguide.docx': 'Maps Feature User Guide',
      'news_userguide.docx': 'News Feature User Guide',
      'SA2_userguide.docx': 'SA2 Analysis User Guide'
    };
    
    return titleMap[filename] || filename.replace('.docx', ' User Guide');
  }
  
  async processFAQDocument(filePath) {
    try {
      console.log(`🔄 Processing FAQ document: ${path.basename(filePath)}`);
      
      // Extract text from DOCX
      const { text } = await this.extractTextFromDOCX(filePath);
      
      // Clean extracted text
      const cleanText = this.cleanExtractedText(text);
      
      // Determine guide category and document info
      const guideCategory = this.getGuideCategory(filePath);
      const documentName = path.basename(filePath);
      const documentType = `${guideCategory}_guide`;
      
      // Get professional title
      const professionalTitle = this.getProfessionalTitle(documentName);
      
      console.log(`📋 Document: ${professionalTitle} (${guideCategory})`);
      
      // Generate raw chunks
      const rawChunks = this.chunkText(cleanText, documentName, guideCategory);
      
      // Create document chunks with embeddings
      const chunks = [];
      
      console.log(`🔄 Generating embeddings for ${rawChunks.length} chunks...`);
      
      for (let i = 0; i < rawChunks.length; i++) {
        const rawChunk = rawChunks[i];
        
        // Generate embedding for this chunk
        const embedding = await this.generateEmbedding(rawChunk.content);
        
        // Determine section category
        const sectionCategory = this.getSectionCategory(rawChunk.content, i);
        
        const chunk = {
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
      
      const result = {
        success: true,
        document_name: documentName,
        chunks_created: chunks.length,
        guide_category: guideCategory
      };
      
      console.log(`✅ Successfully processed ${professionalTitle}: ${chunks.length} chunks created`);
      return result;
      
    } catch (error) {
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
  
  async processFAQDirectory(directoryPath) {
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
      
      const results = [];
      
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
      
    } catch (error) {
      console.error(`❌ Error processing FAQ directory ${directoryPath}:`, error);
      return [];
    }
  }
}

async function main() {
  try {
    console.log('='.repeat(60));
    console.log('🚀 FAQ DOCUMENT PROCESSING');
    console.log('='.repeat(60));
    
    const processor = new SimpleFAQProcessor();
    
    // Path to FAQ documents
    const faqDirectoryPath = path.join(__dirname, '..', 'data', 'FAQ');
    
    console.log(`📂 Processing FAQ documents from: ${faqDirectoryPath}`);
    
    // Process all FAQ documents
    const results = await processor.processFAQDirectory(faqDirectoryPath);
    
    // Display detailed results
    console.log('\n📊 DETAILED PROCESSING RESULTS:');
    console.log('='.repeat(60));
    
    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.document_name}`);
      console.log(`   Category: ${result.guide_category}`);
      console.log(`   Chunks: ${result.chunks_created}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log('');
    }
    
    console.log('\n✨ FAQ DOCUMENT PROCESSING COMPLETE!');
    console.log('\n📋 Next Steps:');
    console.log('  1. ✅ FAQ documents processed into vector embeddings');  
    console.log('  2. 🔄 Create FAQ chat service');
    console.log('  3. 🔄 Build FAQ API endpoints');
    console.log('  4. 🔄 Create FAQ page');
    
  } catch (error) {
    console.error('❌ Fatal error during FAQ processing:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Process interrupted. Exiting gracefully...');
  process.exit(0);
});

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
} 