#!/usr/bin/env tsx

import { PDFProcessor, ProcessingResult } from '../src/lib/pdfProcessor';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

async function main() {
  console.log('🚀 Starting PDF Processing for Regulation Documents\n');

  // Validate environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing required environment variable: ${envVar}`);
      console.error('\nPlease ensure you have these in your .env.local file:');
      console.error('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
      console.error('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
      console.error('GEMINI_API_KEY=your_gemini_api_key');
      process.exit(1);
    }
  }

  try {
    // Initialize PDF processor
    const processor = new PDFProcessor();
    
    // Path to regulation documents
    const regulationDocsPath = path.join(process.cwd(), 'data', 'Regulation Docs');
    
    console.log(`📂 Processing PDFs from: ${regulationDocsPath}\n`);

    // Check if directory exists
    try {
      await import('fs/promises').then(fs => fs.access(regulationDocsPath));
    } catch (error) {
      console.error(`❌ Cannot access directory: ${regulationDocsPath}`);
      console.error('Please ensure the "data/Regulation Docs" directory exists and contains PDF files.');
      process.exit(1);
    }

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
      console.log('1. Run the updated Supabase SQL commands (shown above)');
      console.log('2. Test the search functionality');
      console.log('3. Build the chatbot interface');
    }

    if (totalFailures > 0) {
      console.log(`\n⚠️  Warning: ${totalFailures} documents failed to process.`);
      console.log('Common issues:');
      console.log('- Scanned PDFs may need OCR processing');
      console.log('- Password-protected PDFs cannot be processed');
      console.log('- Corrupted PDF files');
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

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
} 