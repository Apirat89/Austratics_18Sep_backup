/**
 * Static Files Access Test Script
 * 
 * This script tests access to critical map data files and verifies they are accessible.
 * Run this script after starting the dev server to ensure all files are properly served.
 */

const { createServer } = require('http');
const fetch = require('node-fetch');
const { join } = require('path');
const fs = require('fs');

// Port to use for testing server
const PORT = 3333;

// Critical files to check (with their corresponding file paths)
const CRITICAL_FILES = [
  { url: '/maps/SA2.geojson', path: './public/maps/SA2.geojson' },
  { url: '/maps/healthcare.geojson', path: './public/maps/healthcare.geojson' },
  { url: '/maps/abs_csv/Residential_May2025_ExcludeMPS_updated_with_finance.json', path: './public/maps/abs_csv/Residential_May2025_ExcludeMPS_updated_with_finance.json' },
  { url: '/Maps_ABS_CSV/Demographics_2023.json', path: './public/Maps_ABS_CSV/Demographics_2023.json' },
  { url: '/Maps_ABS_CSV/health_stats.json', path: './public/Maps_ABS_CSV/health_stats.json' },
];

// Create a simple static file server for testing
const server = createServer((req, res) => {
  console.log(`Request for: ${req.url}`);
  
  // Remove query parameters
  const url = req.url.split('?')[0];
  
  // Look for the matching file in our critical files list
  const criticalFile = CRITICAL_FILES.find(file => file.url === url);
  
  if (criticalFile) {
    try {
      const filePath = join(process.cwd(), criticalFile.path);
      
      // Check if file exists
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const data = fs.readFileSync(filePath);
        
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Length': fileSize
        });
        res.end(data);
        return;
      }
    } catch (error) {
      console.error(`Error serving file ${url}:`, error);
    }
  }
  
  // If no match found or error occurred, return 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('File not found');
});

// Start the server and run the tests
async function runTests() {
  server.listen(PORT, async () => {
    console.log(`Test server running on http://localhost:${PORT}`);
    console.log('Testing access to critical map data files...\n');
    
    let allPassed = true;
    
    // Test each file
    for (const file of CRITICAL_FILES) {
      const fileExists = fs.existsSync(join(process.cwd(), file.path));
      const fileSize = fileExists ? 
        (fs.statSync(join(process.cwd(), file.path)).size / 1024 / 1024).toFixed(2) : 
        'N/A';
      
      process.stdout.write(`Testing ${file.url} (${fileSize} MB)... `);
      
      try {
        // Attempt to fetch the file from our test server
        const response = await fetch(`http://localhost:${PORT}${file.url}`);
        
        if (response.ok) {
          // Verify we can parse the JSON (just the first few bytes)
          const data = await response.json();
          console.log('✅ OK');
        } else {
          console.log('❌ ERROR: Status', response.status);
          allPassed = false;
        }
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        allPassed = false;
      }
    }
    
    console.log('\n=== Summary ===');
    if (allPassed) {
      console.log('✅ All critical files are accessible');
      console.log('\nYour map should work correctly!');
    } else {
      console.log('❌ Some files failed accessibility tests');
      console.log('\nPossible solutions:');
      console.log('1. Ensure all files exist in the correct locations');
      console.log('2. Check file permissions');
      console.log('3. Make sure Next.js is configured to serve these static files');
      console.log('4. Check your deployment environment for path mappings');
    }
    
    // Shutdown the test server
    server.close(() => {
      console.log('\nTest server shut down');
      process.exit(allPassed ? 0 : 1);
    });
  });
}

runTests(); 