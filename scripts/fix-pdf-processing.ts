#!/usr/bin/env tsx

/**
 * Fixed PDF Processing Script
 * 
 * This script bypasses the pdf-parse library bug by using alternative approaches
 */

import { PDFProcessor, ProcessingResult } from '../src/lib/pdfProcessor';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

// Alternative PDF processing using a different library
async function processWithAlternativeMethod(filePath: string): Promise<{
  text: string;
  numPages: number;
  metadata: any;
}> {
  try {
    // Method 1: Try using the fs approach with pdf-parse directly
    const fs = require('fs');
    
    // Create the missing test directory and file that pdf-parse expects
    const testDir = path.join(process.cwd(), 'test', 'data');
    await require('fs').promises.mkdir(testDir, { recursive: true }).catch(() => {});
    
    // Create a dummy test file to prevent the error
    const testFile = path.join(testDir, '05-versions-space.pdf');
    if (!require('fs').existsSync(testFile)) {
      // Create a minimal PDF file
      const minimalPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000100 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF');
      await require('fs').promises.writeFile(testFile, minimalPdf);
    }
    
    // Now try pdf-parse
    const pdfParse = require('pdf-parse');
    const fileBuffer = await require('fs').promises.readFile(filePath);
    const data = await pdfParse(fileBuffer);

    return {
      text: data.text || '',
      numPages: data.numpages || 1,
      metadata: data.info || {}
    };
  } catch (error) {
    console.error(`Alternative method failed for ${filePath}:`, error);
    throw error;
  }
}

// Custom PDF processor that uses the fixed method
class FixedPDFProcessor extends PDFProcessor {
  async extractTextFromPDF(filePath: string): Promise<{
    text: string;
    numPages: number;
    metadata: any;
  }> {
    return await processWithAlternativeMethod(filePath);
  }
}

async function main() {
  console.log('🚀 Starting FIXED PDF Processing for Regulation Documents\n');

  // Validate environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing required environment variable: ${envVar}`);
      process.exit(1);
    }
  }

  try {
    // Initialize FIXED PDF processor
    const processor = new FixedPDFProcessor();
    
    // Path to regulation documents
    const regulationDocsPath = path.join(process.cwd(), 'data', 'Regulation Docs');
    
    console.log(`📂 Processing PDFs from: ${regulationDocsPath}\n`);
    console.log('🔧 Using FIXED PDF processing method to bypass pdf-parse bug\n');

    // Process all PDFs in the directory
    const results = await processor.processDirectory(regulationDocsPath);

    // Display results summary
    console.log('\n📊 PROCESSING SUMMARY');
    console.log('='.repeat(50));
    
    let totalSuccess = 0;
    let totalFailures = 0;
    let totalChunks = 0;

    for (const result of results) {
      if (result.success) {
        console.log(`✅ ${result.document_name}: ${result.chunks_created} chunks`);
        totalSuccess++;
        totalChunks += result.chunks_created;
      } else {
        console.log(`❌ ${result.document_name}: ${result.error}`);
        totalFailures++;
      }
    }

    console.log('\n📈 FINAL STATISTICS');
    console.log('='.repeat(50));
    console.log(`📄 Total Documents: ${results.length}`);
    console.log(`✅ Successful: ${totalSuccess}`);
    console.log(`❌ Failed: ${totalFailures}`);
    console.log(`📝 Total Chunks Created: ${totalChunks}`);
    console.log(`🧠 Gemini Embeddings Generated: ${totalChunks}`);

    if (totalSuccess > 0) {
      console.log('\n🎉 SUCCESS! Your regulation documents are now searchable!');
      console.log('\nNext steps:');
      console.log('1. Test the chatbot with CHSP questions');
      console.log('2. Try queries about Home Care Packages');
      console.log('3. Ask about fee schedules and retirement village regulations');
    }

    if (totalFailures > 0) {
      console.log(`\n⚠️  Warning: ${totalFailures} documents failed to process.`);
    }

  } catch (error) {
    console.error('❌ Fatal error during processing:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Processing interrupted by user');
  process.exit(0);
});

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
} 