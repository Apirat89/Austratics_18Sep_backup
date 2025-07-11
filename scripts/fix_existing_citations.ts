#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { PDFProcessor } from '../src/lib/pdfProcessor';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

async function main() {
  console.log('🚨 CRITICAL: Fixing Citation Hallucinations');
  console.log('This script will update existing chunks with actual PDF page counts\n');

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Initialize PDF processor
  const pdfProcessor = new PDFProcessor();

  try {
    // Get all unique document names from the database
    const { data: documents, error } = await supabase
      .rpc('get_distinct_document_names');

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`📄 Found ${documents.length} unique documents in database`);

    // Path to regulation documents
    const regulationDocsPath = path.join(process.cwd(), 'data', 'Regulation Docs');
    
    let updatedDocuments = 0;
    let totalChunksUpdated = 0;

    for (const doc of documents) {
      const documentName = doc.document_name;
      const pdfPath = await findPdfFile(regulationDocsPath, documentName);

      if (!pdfPath) {
        console.log(`⚠️  Could not find PDF file for document: ${documentName}`);
        continue;
      }

      try {
        // Extract PDF metadata to get actual page count
        const { numPages } = await pdfProcessor.extractTextFromPDF(pdfPath);
        
        // Update all chunks for this document
        const { data: updateResult, error: updateError } = await supabase
          .from('document_chunks')
          .update({ actual_pdf_pages: numPages })
          .eq('document_name', documentName)
          .select('id');

        if (updateError) {
          console.error(`❌ Error updating ${documentName}:`, updateError.message);
          continue;
        }

        const chunksUpdated = updateResult.length;
        totalChunksUpdated += chunksUpdated;
        updatedDocuments++;

        console.log(`✅ Updated ${documentName}: ${chunksUpdated} chunks (${numPages} pages)`);

      } catch (error) {
        console.error(`❌ Error processing ${documentName}:`, error);
      }
    }

    console.log('\n📊 CITATION FIX SUMMARY');
    console.log('='.repeat(50));
    console.log(`📄 Documents Updated: ${updatedDocuments}/${documents.length}`);
    console.log(`📝 Total Chunks Updated: ${totalChunksUpdated}`);

    // Run validation to check for phantom page numbers
    console.log('\n🔍 Checking for phantom page numbers...');
    const { data: phantomPages, error: phantomError } = await supabase
      .rpc('validate_page_numbers');

    if (phantomError) {
      console.error('❌ Error checking phantom pages:', phantomError.message);
    } else {
      if (phantomPages && phantomPages.length > 0) {
        console.log(`❌ Found ${phantomPages.length} phantom page citations:`);
        phantomPages.forEach((phantom: any) => {
          console.log(`   - ${phantom.document_name}: Page ${phantom.invalid_page_number} (max: ${phantom.actual_pdf_pages})`);
        });
        console.log('\n🚨 CRITICAL: Phantom page numbers detected. Consider reprocessing these documents.');
      } else {
        console.log('✅ No phantom page numbers found. Citation validation is working correctly.');
      }
    }

    // Show citation validation statistics
    console.log('\n📈 Citation Validation Statistics:');
    const { data: stats, error: statsError } = await supabase
      .from('citation_validation_stats')
      .select('*')
      .order('phantom_citations', { ascending: false });

    if (statsError) {
      console.error('❌ Error fetching stats:', statsError.message);
    } else if (stats && stats.length > 0) {
      console.log('Document Name | Total Chunks | Actual Pages | Max Cited Page | Phantom Citations');
      console.log('-'.repeat(85));
      stats.forEach((stat: any) => {
        const phantomWarning = stat.phantom_citations > 0 ? ' ⚠️' : '';
        console.log(`${stat.document_name.padEnd(20)} | ${stat.total_chunks.toString().padEnd(12)} | ${stat.actual_pages.toString().padEnd(12)} | ${stat.max_cited_page.toString().padEnd(14)} | ${stat.phantom_citations}${phantomWarning}`);
      });
    }

    console.log('\n🎉 Citation validation fix completed!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Find PDF file for a given document name
 */
async function findPdfFile(baseDir: string, documentName: string): Promise<string | null> {
  try {
    const allFiles = await getAllFiles(baseDir);
    const pdfFiles = allFiles.filter(file => file.endsWith('.pdf'));
    
    // Try to find exact match
    for (const file of pdfFiles) {
      const fileName = path.basename(file, '.pdf');
      if (fileName === documentName) {
        return file;
      }
    }
    
    // Try to find partial match
    for (const file of pdfFiles) {
      const fileName = path.basename(file, '.pdf');
      if (fileName.includes(documentName) || documentName.includes(fileName)) {
        return file;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error finding PDF file for ${documentName}:`, error);
    return null;
  }
}

/**
 * Recursively get all files in a directory
 */
async function getAllFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await getAllFiles(fullPath);
        files.push(...subFiles);
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
} 