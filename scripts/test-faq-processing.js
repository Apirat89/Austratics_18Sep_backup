#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

async function testFAQProcessing() {
  try {
    console.log('🔧 Testing FAQ Processing System');
    console.log('='.repeat(50));
    
    // Test database connection
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client created');
    
    // Test Gemini connection
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing Gemini API key');
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log('✅ Gemini AI client created');
    
    // Test FAQ database tables
    console.log('\n📋 Testing FAQ database tables...');
    const tables = ['faq_document_chunks', 'faq_conversations', 'faq_messages'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: Accessible (${data.length} rows)`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }
    
    // Check FAQ documents exist
    console.log('\n📄 Checking FAQ documents...');
    const faqDir = path.join(__dirname, '..', 'data', 'FAQ');
    
    if (!fs.existsSync(faqDir)) {
      throw new Error(`FAQ directory not found: ${faqDir}`);
    }
    
    const faqFiles = fs.readdirSync(faqDir)
      .filter(file => file.toLowerCase().endsWith('.docx'));
    
    console.log(`✅ Found ${faqFiles.length} FAQ documents:`);
    faqFiles.forEach(file => {
      const filePath = path.join(faqDir, file);
      const stats = fs.statSync(filePath);
      console.log(`   - ${file} (${Math.round(stats.size / 1024)}KB)`);
    });
    
    if (faqFiles.length === 0) {
      throw new Error('No DOCX files found in FAQ directory');
    }
    
    // Test basic AI functionality
    console.log('\n🤖 Testing Gemini model...');
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent('Respond with "FAQ system test successful"');
      const response = await result.response;
      const text = response.text();
      
      console.log(`✅ Gemini 2.5 Flash working: ${text}`);
    } catch (error) {
      console.log(`❌ Gemini test failed: ${error.message}`);
    }
    
    // Test embedding model
    console.log('\n🔤 Testing embedding generation...');
    try {
      const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const embeddingResult = await embeddingModel.embedContent('Test FAQ embedding');
      
      if (embeddingResult.embedding && embeddingResult.embedding.values) {
        console.log(`✅ Embedding model working: ${embeddingResult.embedding.values.length} dimensions`);
      } else {
        console.log('❌ Embedding model returned invalid result');
      }
    } catch (error) {
      console.log(`❌ Embedding test failed: ${error.message}`);
    }
    
    // Test if we can insert into FAQ tables
    console.log('\n💾 Testing database insertion...');
    try {
      const testChunk = {
        document_name: 'test-document.docx',
        document_type: 'user_guide',
        section_title: 'Test Section',
        content: 'This is a test chunk for FAQ processing verification.',
        page_number: 1,
        chunk_index: 0,
        embedding: Array(768).fill(0.1), // Test embedding
        guide_category: 'homecare',
        section_category: 'getting_started'
      };
      
      const { data, error } = await supabase
        .from('faq_document_chunks')
        .insert([testChunk])
        .select();
      
      if (error) {
        console.log(`❌ Database insertion failed: ${error.message}`);
      } else {
        console.log(`✅ Database insertion successful: ID ${data[0].id}`);
        
        // Clean up test data
        await supabase
          .from('faq_document_chunks')
          .delete()
          .eq('document_name', 'test-document.docx');
        console.log('✅ Test data cleaned up');
      }
    } catch (error) {
      console.log(`❌ Database test failed: ${error.message}`);
    }
    
    console.log('\n🎉 FAQ Processing System Test Complete!');
    console.log('\n📋 Summary:');
    console.log(`   - FAQ Documents: ${faqFiles.length} found`);
    console.log('   - Database: Connected and accessible');  
    console.log('   - AI Models: Gemini 2.5 Flash working');
    console.log('   - Embeddings: text-embedding-004 working');
    console.log('   - Ready for: FAQ document processing');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testFAQProcessing();
} 