#!/usr/bin/env node

/**
 * FAQ Document Processing Script
 * Processes all FAQ DOCX files into vector embeddings for the FAQ chatbot
 */

require('dotenv').config();
const path = require('path');

// Since we're using ES modules in TypeScript files, we need to use dynamic imports
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('🚀 FAQ DOCUMENT PROCESSING');
    console.log('='.repeat(60));
    
    // Dynamic import of the FAQ processor
    console.log('📦 Loading FAQ Document Processor...');
    const { FAQDocumentProcessor } = await import('../src/lib/faqDocumentProcessor.js');
    
    // Initialize the processor
    const processor = new FAQDocumentProcessor();
    
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
    
    // Get and display FAQ statistics
    console.log('\n📈 FAQ PROCESSING STATISTICS:');
    console.log('='.repeat(60));
    
    try {
      const stats = await processor.getFAQStats();
      console.log(`Total Documents: ${stats.total_documents}`);
      console.log(`Total Chunks: ${stats.total_chunks}`);
      console.log('\nDocuments by Category:');
      
      Object.entries(stats.documents_by_category).forEach(([category, count]) => {
        console.log(`  ${category}: ${count} chunks`);
      });
    } catch (error) {
      console.log('⚠️  Could not fetch statistics (database may not be ready)');
    }
    
    // Test FAQ search functionality
    console.log('\n🔍 TESTING FAQ SEARCH:');
    console.log('='.repeat(60));
    
    try {
      const testQueries = [
        'How do I use the homecare feature?',
        'What is residential care?',
        'How do I navigate the maps?',
        'Where do I find news?',
        'What is SA2 analysis?'
      ];
      
      for (const query of testQueries) {
        console.log(`\n🔎 Testing: "${query}"`);
        
        const searchResults = await processor.searchFAQContent(query, 2, 0.3);
        
        if (searchResults.length > 0) {
          console.log(`   Found ${searchResults.length} results:`);
          searchResults.forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.document_name} (${result.guide_category})`);
            console.log(`      Similarity: ${(result.similarity * 100).toFixed(1)}%`);
            console.log(`      Preview: ${result.content.substring(0, 100)}...`);
          });
        } else {
          console.log('   No results found');
        }
      }
    } catch (error) {
      console.log('⚠️  Search testing failed (database may not be ready):', error.message);
    }
    
    console.log('\n✨ FAQ DOCUMENT PROCESSING COMPLETE!');
    console.log('\n📋 Next Steps:');
    console.log('  1. ✅ FAQ documents processed into vector embeddings');  
    console.log('  2. 🔄 Test Gemini 2.5 Flash model availability');
    console.log('  3. 🔄 Create FAQ chat service');
    console.log('  4. 🔄 Build FAQ API endpoints');
    console.log('  5. 🔄 Create FAQ page');
    
  } catch (error) {
    console.error('❌ Fatal error during FAQ processing:', error);
    
    if (error.message.includes('Cannot find module')) {
      console.log('\n💡 SOLUTION: Build TypeScript files first:');
      console.log('   npm run build');
      console.log('   OR');
      console.log('   npx tsc');
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Process interrupted. Exiting gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
} 