#!/usr/bin/env node

/**
 * Test PDF Processing
 * 
 * Simple test to verify PDF processing is working after fixing the library issue
 */

import { PDFProcessor } from '../src/lib/pdfProcessor';
import path from 'path';

async function testPDFProcessing() {
  console.log('🔍 Testing PDF processing...');
  
  try {
    const pdfProcessor = new PDFProcessor();
    
    // Test with one specific document
    const testFile = 'data/Regulation Docs/Aged Care Act/Current/C2025C00122.pdf';
    const fullPath = path.resolve(testFile);
    
    console.log(`📄 Testing file: ${fullPath}`);
    
    const result = await pdfProcessor.processPDF(fullPath);
    
    if (result.success) {
      console.log(`✅ Success! Created ${result.chunks_created} chunks`);
      console.log(`📝 Document: ${result.document_name}`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPDFProcessing(); 