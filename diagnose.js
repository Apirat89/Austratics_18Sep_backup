const fs = require('fs');
const path = require('path');

// Check if .next/server/app directory exists
const serverAppDir = path.join(process.cwd(), '.next', 'server', 'app');
console.log(`Checking if ${serverAppDir} exists:`, fs.existsSync(serverAppDir));

// Check the auth directory
const authDir = path.join(serverAppDir, 'auth');
console.log(`Checking if ${authDir} exists:`, fs.existsSync(authDir));

if (fs.existsSync(authDir)) {
  // List files in auth directory
  const authFiles = fs.readdirSync(authDir);
  console.log('Files in auth directory:', authFiles);
  
  // Check for forgot-password directory
  const forgotDir = path.join(authDir, 'forgot-password');
  console.log(`Checking if ${forgotDir} exists:`, fs.existsSync(forgotDir));
  
  if (fs.existsSync(forgotDir)) {
    const forgotFiles = fs.readdirSync(forgotDir);
    console.log('Files in forgot-password directory:', forgotFiles);
  }
}

// Check source files
const srcAuthDir = path.join(process.cwd(), 'src', 'app', 'auth', 'forgot-password');
console.log(`Checking if ${srcAuthDir} exists:`, fs.existsSync(srcAuthDir));

if (fs.existsSync(srcAuthDir)) {
  const srcFiles = fs.readdirSync(srcAuthDir);
  console.log('Files in src/app/auth/forgot-password:', srcFiles);
}

// Look for any page.js files in the build directory
function findPageFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findPageFiles(filePath, results);
    } else if (file.includes('page.js')) {
      results.push(filePath);
    }
  }
  
  return results;
}

console.log('\nSearching for page.js files in .next/server:');
const pageFiles = findPageFiles(path.join(process.cwd(), '.next', 'server'));
console.log('Found page.js files:', pageFiles); 