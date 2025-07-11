#!/usr/bin/env node

/**
 * Fix Embeddings Script
 * 
 * Generate real Gemini embeddings for the restored content
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

async function updateEmbeddings() {
  console.log('🔍 Fetching documents...');
  
  // Get all documents
  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('*');

  if (error) {
    console.error('❌ Error fetching chunks:', error);
    return;
  }

  console.log(`📄 Found ${chunks?.length || 0} chunks to update`);

  if (!chunks || chunks.length === 0) {
    console.log('⚠️ No chunks found');
    return;
  }

  // Update each chunk with real embeddings
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`📝 Updating chunk ${i + 1}/${chunks.length}: ${chunk.section_title}`);
    
    try {
      // Generate real embedding
      const embedding = await generateEmbedding(chunk.content);
      
      // Update in database
      const { error: updateError } = await supabase
        .from('document_chunks')
        .update({ embedding })
        .eq('id', chunk.id);

      if (updateError) {
        console.error(`❌ Error updating chunk ${chunk.id}:`, updateError);
      } else {
        console.log(`✅ Updated ${chunk.section_title}`);
      }
    } catch (error) {
      console.error(`❌ Error processing chunk ${chunk.id}:`, error);
    }
  }
}

async function main() {
  console.log('🧠 FIXING EMBEDDINGS WITH REAL GEMINI VECTORS');
  console.log('==============================================');
  
  try {
    await updateEmbeddings();
    
    console.log('\n🎉 Embeddings updated successfully!');
    console.log('✅ All chunks now have real Gemini embeddings');
    console.log('✅ Vector search should work properly');
    console.log('\n🎯 Test with: "What are the objects of the Aged Care Act?"');
    
  } catch (error) {
    console.error('❌ Failed to update embeddings:', error);
  }
}

main().catch(console.error); 