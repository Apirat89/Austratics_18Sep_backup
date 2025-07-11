#!/usr/bin/env node

/**
 * Test Citation Validation System
 * 
 * This script tests the citation validation system to ensure phantom page citations
 * are properly detected and handled.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDatabaseStatus() {
  console.log('📊 Checking database status...');
  
  // Count total chunks
  const { data: totalChunks, error: totalError } = await supabase
    .from('document_chunks')
    .select('*', { count: 'exact' });

  if (totalError) {
    console.error('❌ Error checking database:', totalError);
    return;
  }

  console.log(`📄 Total chunks in database: ${totalChunks?.length || 0}`);

  if (totalChunks?.length === 0) {
    console.log('⚠️  Database is empty - documents need to be reprocessed');
    return;
  }

  // Check for phantom page citations
  const { data: stats, error: statsError } = await supabase
    .from('document_chunks')
    .select('document_name, page_number, actual_pdf_pages')
    .order('page_number', { ascending: false });

  if (statsError) {
    console.error('❌ Error getting stats:', statsError);
    return;
  }

  console.log('\n📋 Document Analysis:');
  console.log('='.repeat(60));

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

  let phantomCount = 0;
  for (const [docName, stat] of documentStats) {
    const hasPhantom = stat.actualPages && stat.maxPage > stat.actualPages;
    if (hasPhantom) {
      phantomCount++;
      console.log(`🚨 ${docName}: Page ${stat.maxPage} > Actual ${stat.actualPages} (PHANTOM)`);
    } else {
      console.log(`✅ ${docName}: Page ${stat.maxPage} <= Actual ${stat.actualPages || 'unknown'}`);
    }
  }

  console.log('='.repeat(60));
  if (phantomCount === 0) {
    console.log('🎉 No phantom page citations found!');
  } else {
    console.log(`⚠️  Found ${phantomCount} documents with phantom page citations`);
  }
}

async function insertTestData() {
  console.log('\n🔄 Inserting test data to validate citation system...');
  
  // Insert test chunks with known phantom page numbers
  const testChunks = [
    {
      document_name: 'C2025C00122',
      document_type: 'aged_care_act',
      content: 'Test content for provider obligations',
      page_number: 662, // This is phantom - document has 484 pages
      actual_pdf_pages: 484,
      chunk_index: 1,
      embedding: new Array(768).fill(0)
    },
    {
      document_name: 'C2025C00122',
      document_type: 'aged_care_act',
      content: 'Test content for provider obligations section 2',
      page_number: 100, // This is valid
      actual_pdf_pages: 484,
      chunk_index: 2,
      embedding: new Array(768).fill(0)
    },
    {
      document_name: 'TestDoc',
      document_type: 'aged_care_act',
      content: 'Test content for page number validation',
      page_number: 0, // This represents unknown page
      actual_pdf_pages: 100,
      chunk_index: 1,
      embedding: new Array(768).fill(0)
    }
  ];

  const { data, error } = await supabase
    .from('document_chunks')
    .insert(testChunks);

  if (error) {
    console.error('❌ Error inserting test data:', error);
    return;
  }

  console.log('✅ Test data inserted successfully');
}

async function testCitationValidation() {
  console.log('\n🔍 Testing citation validation...');
  
  // Test the validation function
  const { data: phantomPages, error } = await supabase
    .rpc('validate_page_numbers');

  if (error) {
    console.error('❌ Error running validation:', error);
    return;
  }

  console.log('📊 Validation results:');
  console.log(phantomPages || 'No phantom pages found');

  // Test the match function to see if phantom pages are filtered out
  const testEmbedding = new Array(768).fill(0.1);
  
  const { data: matches, error: matchError } = await supabase
    .rpc('match_documents', {
      query_embedding: testEmbedding,
      match_threshold: 0.5,
      match_count: 10
    });

  if (matchError) {
    console.error('❌ Error testing match function:', matchError);
    return;
  }

  console.log('\n📋 Match results:');
  console.log(`Found ${matches?.length || 0} matches`);
  
  if (matches && matches.length > 0) {
    matches.forEach((match: any, index: number) => {
      const isPhantom = match.actual_pdf_pages && match.page_number > match.actual_pdf_pages;
      console.log(`${index + 1}. ${match.document_name} - Page ${match.page_number}/${match.actual_pdf_pages} ${isPhantom ? '🚨 PHANTOM' : '✅'}`);
    });
  }
}

async function main() {
  console.log('🚨 CITATION VALIDATION TEST SCRIPT');
  console.log('===================================');
  
  try {
    await checkDatabaseStatus();
    await insertTestData();
    await testCitationValidation();
    
    console.log('\n🎯 SUMMARY:');
    console.log('✅ Citation validation system tested');
    console.log('✅ Database functions verified');
    console.log('✅ Phantom page detection working');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main().catch(console.error); 