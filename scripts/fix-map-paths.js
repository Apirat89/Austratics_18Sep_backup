/**
 * Supabase Storage URL Migration Helper
 * 
 * This script helps identify remaining local file paths that need to be migrated to Supabase URLs.
 * It can scan the codebase for file path patterns and report which files need to be updated.
 */

const { readFileSync, writeFileSync } = require('fs');
const { resolve, join, dirname } = require('path');
const { execSync } = require('child_process');
const { glob } = require('glob');

// Supabase storage base URL
const SUPABASE_STORAGE_URL = 'https://ejhmrjcvjrrsbopffhuo.supabase.co/storage/v1/object/public';

// Path patterns to search for
const PATH_PATTERNS = [
  { pattern: '/Maps_ABS_CSV/', bucket: 'json_data', prefix: 'maps' },
  { pattern: '/maps_abs_csv/', bucket: 'json_data', prefix: 'maps' },
  { pattern: '/maps/abs_csv/', bucket: 'json_data', prefix: 'maps' },
  { pattern: '/data/sa2/', bucket: 'json_data', prefix: 'sa2' },
  { pattern: '/data/FAQ/', bucket: 'faq', prefix: 'guides' },
  { pattern: '/public/Maps_ABS_CSV/', bucket: 'json_data', prefix: 'maps' },
  { pattern: '/public/maps/abs_csv/', bucket: 'json_data', prefix: 'maps' },
];

// File extensions to target
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

// Find files that might contain path references
async function findSourceFiles() {
  try {
    const files = await glob(`src/**/*{${FILE_EXTENSIONS.join(',')}}`, {
      ignore: ['node_modules/**', '.next/**', 'dist/**']
    });
    console.log(`Found ${files.length} source files to check`);
    return files;
  } catch (error) {
    console.error('Error finding source files:', error);
    throw error;
  }
}

// Generate Supabase URL for a file path
function generateSupabaseUrl(path, pattern) {
  // Extract the filename
  const filename = path.split('/').pop();
  return `${SUPABASE_STORAGE_URL}/${pattern.bucket}/${pattern.prefix}/${filename}`;
}

// Check a single file for path patterns
function checkFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const matches = [];
    
    for (const pattern of PATH_PATTERNS) {
      // Find all instances of the pattern
      const regex = new RegExp(`(["'\\(])${pattern.pattern}[\\w\\-_.]+\\.(json|geojson|docx)\\1`, 'g');
      let match;
      
      while ((match = regex.exec(content)) !== null) {
        const fullMatch = match[0];
        const innerMatch = fullMatch.substring(1, fullMatch.length - 1); // Remove quotes
        
        matches.push({
          pattern: pattern.pattern,
          fullPath: innerMatch,
          supabaseUrl: generateSupabaseUrl(innerMatch, pattern)
        });
      }
    }
    
    return matches.length > 0 ? { file: filePath, matches } : null;
  } catch (error) {
    console.error(`Error checking file ${filePath}:`, error);
    return null;
  }
}

// Report findings in a readable format
function reportFindings(findings) {
  console.log('\n=== Supabase URL Migration Report ===\n');
  console.log(`Found ${findings.length} files with local path references that need updating:\n`);
  
  let totalMatches = 0;
  
  findings.forEach((finding, index) => {
    console.log(`${index + 1}. ${finding.file} (${finding.matches.length} references):`);
    
    finding.matches.forEach((match, mIndex) => {
      console.log(`   ${mIndex + 1}. ${match.fullPath}`);
      console.log(`      → ${match.supabaseUrl}`);
    });
    
    console.log(''); // Empty line between files
    totalMatches += finding.matches.length;
  });
  
  console.log(`Total: ${findings.length} files with ${totalMatches} path references to update`);
}

// Main function
async function main() {
  try {
    console.log('Starting Supabase URL migration check...');
    
    // Find all source files
    const files = await findSourceFiles();
    
    // Check each file for path patterns
    console.log('Checking files for local path references...');
    const results = files.map(checkFile).filter(Boolean);
    
    // Report findings
    reportFindings(results);
    
    console.log('\nNext steps:');
    console.log('1. Use the supabaseStorage.ts helper functions in your imports');
    console.log('2. Replace fetch calls with Supabase URLs');
    console.log('3. Update image references to use Supabase URLs');
    console.log('4. Run tests to ensure everything is working correctly');
  } catch (error) {
    console.error('Error running migration check:', error);
    process.exit(1);
  }
}

// Run the main function
main(); 