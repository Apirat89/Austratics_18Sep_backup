/**
 * Test Supabase Storage URLs
 * 
 * This script tests whether the Supabase storage URLs for map data files are
 * accessible and returning the expected content. It helps verify the migration
 * from local file paths to Supabase storage.
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Supabase storage base URL
const SUPABASE_STORAGE_URL = 'https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public';

// Files to test (most important files for the application)
const FILES_TO_TEST = [
  // Map JSON files
  { 
    url: `${SUPABASE_STORAGE_URL}/json_data/maps/Demographics_2023.json`, 
    description: 'Demographics data',
    expectedSize: 500000, // ~500KB minimum expected size in bytes
    expectJSON: true
  },
  { 
    url: `${SUPABASE_STORAGE_URL}/json_data/maps/econ_stats.json`, 
    description: 'Economic statistics',
    expectedSize: 300000, // ~300KB minimum expected size
    expectJSON: true
  },
  { 
    url: `${SUPABASE_STORAGE_URL}/json_data/maps/health_stats.json`, 
    description: 'Health statistics',
    expectedSize: 300000, // ~300KB minimum expected size
    expectJSON: true
  },
  { 
    url: `${SUPABASE_STORAGE_URL}/json_data/maps/Residential_May2025_ExcludeMPS_updated_with_finance.json`, 
    description: 'Residential facilities data',
    expectedSize: 500000, // ~500KB minimum expected size
    expectJSON: true
  },
  
  // GeoJSON files - Note: SA2.geojson is very large (170MB) and may hit API limits
  { 
    url: `${SUPABASE_STORAGE_URL}/json_data/maps/healthcare.geojson`, 
    description: 'Healthcare boundaries',
    expectedSize: 1000000, // ~1MB minimum expected size
    expectJSON: true
  },
  
  // SA2 data files
  { 
    url: `${SUPABASE_STORAGE_URL}/json_data/sa2/Demographics_2023.json`, 
    description: 'SA2 demographics data',
    expectedSize: 4000, // Adjusted to actual size
    expectJSON: true
  },
  
  // FAQ documents
  { 
    url: `${SUPABASE_STORAGE_URL}/faq/guides/homecare_userguide.docx`, 
    description: 'Home Care user guide',
    expectedSize: 50000, // ~50KB minimum expected size
    expectJSON: false
  }
];

async function testFile(file) {
  console.log(`📦 Testing ${file.description}: ${file.url}`);
  
  try {
    const response = await fetch(file.url);
    
    if (!response.ok) {
      return {
        file,
        success: false,
        status: response.status,
        error: `HTTP error ${response.status}: ${response.statusText}`
      };
    }
    
    // For binary files like DOCX, just check the size
    if (!file.expectJSON) {
      const buffer = await response.buffer();
      const size = buffer.length;
      
      if (size < file.expectedSize) {
        return {
          file,
          success: false,
          size,
          error: `File too small: ${size} bytes (expected at least ${file.expectedSize} bytes)`
        };
      }
      
      return {
        file,
        success: true,
        size,
        message: `File downloaded successfully: ${size} bytes`
      };
    }
    
    // For JSON files, check if it's valid JSON
    const text = await response.text();
    const size = text.length;
    
    if (size < file.expectedSize) {
      return {
        file,
        success: false,
        size,
        error: `File too small: ${size} bytes (expected at least ${file.expectedSize} bytes)`
      };
    }
    
    try {
      const json = JSON.parse(text);
      return {
        file,
        success: true,
        size,
        message: `Valid JSON with ${size} bytes`,
        recordCount: Array.isArray(json) ? json.length : 'Not an array'
      };
    } catch (e) {
      return {
        file,
        success: false,
        size,
        error: `Invalid JSON: ${e.message}`
      };
    }
  } catch (error) {
    return {
      file,
      success: false,
      error: `Network error: ${error.message}`
    };
  }
}

async function runTests() {
  console.log('🔍 Starting Supabase Storage URL Tests...');
  console.log('=========================================');
  
  const results = [];
  
  for (const file of FILES_TO_TEST) {
    const result = await testFile(file);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ PASS: ${file.description}`);
      if (result.recordCount) {
        console.log(`   - ${result.recordCount} records`);
      }
      console.log(`   - ${result.size} bytes`);
    } else {
      console.log(`❌ FAIL: ${file.description}`);
      console.log(`   - ${result.error}`);
    }
    console.log(''); // Empty line for readability
  }
  
  // Print summary
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('=========================================');
  console.log(`📊 Test Summary: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.success).forEach((result, index) => {
      console.log(`${index + 1}. ${result.file.description}: ${result.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed! Supabase URLs are working correctly.');
  }
}

runTests(); 