#!/usr/bin/env node

/**
 * Check Database Content
 * 
 * Verify what content is actually stored in the database
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDatabase() {
  console.log('🔍 Checking database content...');
  
  try {
    // Get all chunks
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('*')
      .order('id');

    if (error) {
      console.error('❌ Error fetching chunks:', error);
      return;
    }

    console.log(`📄 Found ${chunks?.length || 0} chunks total`);
    
    if (chunks && chunks.length > 0) {
      console.log('\n📋 Database Content:');
      chunks.forEach((chunk, index) => {
        console.log(`\n${index + 1}. ID: ${chunk.id}`);
        console.log(`   Document: ${chunk.document_name}`);
        console.log(`   Section: ${chunk.section_title || 'No section'}`);
        console.log(`   Page: ${chunk.page_number}`);
        console.log(`   Content Length: ${chunk.content?.length || 0} characters`);
        console.log(`   Has Embedding: ${chunk.embedding ? 'Yes' : 'No'}`);
        console.log(`   Content Preview: ${chunk.content?.substring(0, 100) || 'No content'}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkDatabase(); 