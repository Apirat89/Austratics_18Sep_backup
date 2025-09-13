#!/usr/bin/env node
/**
 * Upload to Supabase Storage Script - JavaScript Wrapper
 * 
 * This script compiles and runs the TypeScript upload script.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

console.log('📦 Starting Supabase Storage upload process...');

// Check if the TypeScript file exists
const tsFilePath = path.join(__dirname, 'upload-to-supabase-storage.ts');
if (!fs.existsSync(tsFilePath)) {
  console.error(`❌ Error: TypeScript file not found at ${tsFilePath}`);
  console.error('Please make sure the TypeScript upload script exists.');
  process.exit(1);
}

try {
  // Step 1: Compile TypeScript
  console.log('🔄 Compiling TypeScript code...');
  execSync('npx tsc', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful');

  // Step 2: Find the compiled JS file
  const compiledJsPath = path.join(process.cwd(), 'dist', 'scripts', 'upload-to-supabase-storage.js');
  if (!fs.existsSync(compiledJsPath)) {
    console.error(`❌ Error: Compiled JavaScript file not found at ${compiledJsPath}`);
    console.error('TypeScript compilation may have failed or output directory structure is different.');
    process.exit(1);
  }

  // Step 3: Run the compiled script
  console.log('🚀 Running upload script...');
  console.log('-'.repeat(50));
  require(compiledJsPath);

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('File upload process failed. Please check the error message above.');
  process.exit(1);
}
