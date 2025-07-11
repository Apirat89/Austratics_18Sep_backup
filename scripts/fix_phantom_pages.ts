#!/usr/bin/env node

/**
 * 🚨 CRITICAL: Fix Phantom Page Citations
 * 
 * This script reprocesses all existing documents with the new conservative
 * page numbering system to eliminate phantom page citations.
 * 
 * The problem: Documents were processed with estimated page numbers that
 * exceeded actual PDF page counts (e.g., citing "Page 662" when PDF has 484 pages).
 * 
 * The solution: Reprocess all documents with the new conservative chunking logic.
 */

import { createClient } from '@supabase/supabase-js';
import { PDFProcessor } from '../src/lib/pdfProcessor';
import { promises as fs } from 'fs';
import path from 'path';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize PDF processor
const pdfProcessor = new PDFProcessor();

async function getDocumentStats() {
  console.log('📊 Analyzing existing document chunks...');
  
  // Get all documents with their max page numbers
  const { data: stats, error } = await supabase
    .from('document_chunks')
    .select('document_name, page_number, actual_pdf_pages')
    .order('page_number', { ascending: false });

  if (error) {
    throw new Error(`Error getting document stats: ${error.message}`);
  }

  // Group by document and find max page numbers
  const documentStats = new Map<string, { maxPage: number, actualPages: number | null }>();
  
  for (const row of stats || []) {
    const current = documentStats.get(row.document_name);
    if (!current || row.page_number > current.maxPage) {
      documentStats.set(row.document_name, {
        maxPage: row.page_number,
        actualPages: row.actual_pdf_pages
      });
    }
  }

  console.log('\n🔍 Document Analysis:');
  console.log('='.repeat(80));
  
  let phantomCount = 0;
  const phantomDocuments: string[] = [];
  
  for (const [docName, stat] of documentStats) {
    const hasPhantom = stat.actualPages && stat.maxPage > stat.actualPages;
    if (hasPhantom) {
      phantomCount++;
      phantomDocuments.push(docName);
      console.log(`🚨 ${docName}: Page ${stat.maxPage} > Actual ${stat.actualPages} (PHANTOM)`);
    } else {
      console.log(`✅ ${docName}: Page ${stat.maxPage} <= Actual ${stat.actualPages || 'unknown'}`);
    }
  }

  console.log('='.repeat(80));
  console.log(`📋 Summary: ${phantomCount}/${documentStats.size} documents have phantom page citations`);
  
  return { documentStats, phantomDocuments };
}

async function findPDFFiles(): Promise<string[]> {
  const pdfFiles: string[] = [];
  const dataDir = path.join(process.cwd(), 'data', 'Regulation Docs');
  
  async function scanDirectory(dir: string): Promise<void> {
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (item.toLowerCase().endsWith('.pdf')) {
        pdfFiles.push(fullPath);
      }
    }
  }
  
  await scanDirectory(dataDir);
  return pdfFiles;
}

async function clearExistingChunks() {
  console.log('\n🧹 Clearing existing document chunks...');
  
  const { error } = await supabase
    .from('document_chunks')
    .delete()
    .gte('id', 0); // Delete all records

  if (error) {
    throw new Error(`Error clearing chunks: ${error.message}`);
  }
  
  console.log('✅ All existing chunks cleared');
}

async function reprocessAllDocuments() {
  console.log('\n🔄 Reprocessing all documents with new conservative page numbering...');
  
  const pdfFiles = await findPDFFiles();
  console.log(`📄 Found ${pdfFiles.length} PDF files to process`);
  
  let processedCount = 0;
  let totalChunks = 0;
  
  for (const pdfPath of pdfFiles) {
    try {
      console.log(`\n📄 Processing: ${path.basename(pdfPath)}`);
      
      const result = await pdfProcessor.processPDF(pdfPath);
      
      if (result.success) {
        processedCount++;
        totalChunks += result.chunks_created;
        console.log(`   ✅ Success: ${result.chunks_created} chunks created`);
      } else {
        console.error(`   ❌ Failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${path.basename(pdfPath)}:`, error);
    }
  }
  
  console.log('\n🎉 Reprocessing complete!');
  console.log(`✅ Successfully processed: ${processedCount}/${pdfFiles.length} documents`);
  console.log(`📝 Total chunks created: ${totalChunks}`);
}

async function validateResults() {
  console.log('\n🔍 Validating results...');
  
  const { data: validation, error } = await supabase
    .from('document_chunks')
    .select('document_name, page_number, actual_pdf_pages')
    .order('page_number', { ascending: false });

  if (error) {
    throw new Error(`Error validating results: ${error.message}`);
  }

  const documentStats = new Map<string, { maxPage: number, actualPages: number | null }>();
  
  for (const row of validation || []) {
    const current = documentStats.get(row.document_name);
    if (!current || row.page_number > current.maxPage) {
      documentStats.set(row.document_name, {
        maxPage: row.page_number,
        actualPages: row.actual_pdf_pages
      });
    }
  }

  console.log('\n📊 Post-Processing Validation:');
  console.log('='.repeat(80));
  
  let remainingPhantoms = 0;
  let conservativeCount = 0;
  
  for (const [docName, stat] of documentStats) {
    if (stat.maxPage === 0) {
      console.log(`📋 ${docName}: Conservative chunking (page numbers marked as uncertain)`);
      conservativeCount++;
    } else if (stat.actualPages && stat.maxPage > stat.actualPages) {
      console.log(`🚨 ${docName}: Still has phantom page ${stat.maxPage} > ${stat.actualPages}`);
      remainingPhantoms++;
    } else {
      console.log(`✅ ${docName}: Valid page range 1-${stat.maxPage} (actual: ${stat.actualPages})`);
    }
  }

  console.log('='.repeat(80));
  console.log(`📋 Results:`);
  console.log(`   🚨 Remaining phantom citations: ${remainingPhantoms}`);
  console.log(`   📋 Conservative chunking applied: ${conservativeCount}`);
  console.log(`   ✅ Documents with valid page ranges: ${documentStats.size - remainingPhantoms - conservativeCount}`);
  
  if (remainingPhantoms === 0) {
    console.log('\n🎉 SUCCESS: All phantom page citations have been eliminated!');
  } else {
    console.log('\n⚠️  WARNING: Some phantom citations remain. Check the processing logic.');
  }
}

async function main() {
  console.log('🚨 PHANTOM PAGE CITATION FIX SCRIPT');
  console.log('=====================================');
  console.log('This script will reprocess all documents with conservative page numbering');
  console.log('to eliminate phantom page citations like "Page 662" when PDF has 484 pages.\n');
  
  try {
    // Step 1: Analyze current state
    await getDocumentStats();
    
    // Step 2: Clear existing chunks
    await clearExistingChunks();
    
    // Step 3: Reprocess all documents
    await reprocessAllDocuments();
    
    // Step 4: Validate results
    await validateResults();
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Test the chatbot with the original problematic query');
    console.log('2. Verify that page citations are now accurate');
    console.log('3. Check that no phantom pages appear in responses');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 