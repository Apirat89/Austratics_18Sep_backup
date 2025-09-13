#!/usr/bin/env node
/**
 * Supabase Storage Setup Script
 * 
 * This script:
 * 1. Checks if required dependencies are installed
 * 2. Updates .env with required Supabase environment variables
 * 3. Creates example configuration for Supabase buckets
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define the dependencies needed for Supabase Storage
const REQUIRED_DEPENDENCIES = {
  "@supabase/supabase-js": "^2.50.4", // already exists, check version
  "dotenv": "^17.2.1",                 // already exists, check version
  "form-data": "^4.0.0",               // for file uploads
  "blob-polyfill": "^7.0.20220408",    // for browser compatibility
};

// Path to package.json
const packageJsonPath = path.join(process.cwd(), 'package.json');

// Path to .env and .env.example files
const envPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), '.env.example.local');

// Supabase configuration
const supabaseConfig = {
  buckets: [
    { name: 'json_data', public: true, fileSizeLimit: '50MB' },
    { name: 'documents', public: false, fileSizeLimit: '100MB' },
    { name: 'images', public: true, fileSizeLimit: '10MB' },
    { name: 'faq', public: true, fileSizeLimit: '10MB' },
  ],
  requiredEnvVars: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]
};

/**
 * Check and update package.json dependencies
 */
function updatePackageJson() {
  console.log('📦 Checking package.json dependencies...');
  
  try {
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    let needsInstall = false;
    
    // Check dependencies
    const deps = packageJson.dependencies || {};
    
    for (const [pkg, version] of Object.entries(REQUIRED_DEPENDENCIES)) {
      if (!deps[pkg]) {
        console.log(`🔍 Adding missing dependency: ${pkg}@${version}`);
        deps[pkg] = version;
        needsInstall = true;
      } else {
        console.log(`✅ Dependency already exists: ${pkg}@${deps[pkg]}`);
      }
    }
    
    // Update package.json if needed
    if (needsInstall) {
      packageJson.dependencies = deps;
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✏️ Updated package.json with required dependencies');
      
      console.log('📥 Installing new dependencies...');
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ Dependencies installed successfully');
    } else {
      console.log('✅ All required dependencies already installed');
    }
  } catch (error) {
    console.error('❌ Error updating package.json:', error);
    process.exit(1);
  }
}

/**
 * Check and update environment variables
 */
function updateEnvVars() {
  console.log('🔑 Checking environment variables...');
  
  try {
    // Check if .env.local exists
    if (!fs.existsSync(envPath)) {
      console.log('📄 Creating .env.local file...');
      
      const envContent = supabaseConfig.requiredEnvVars
        .map(key => `${key}=`)
        .join('\n');
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ Created .env.local file with required variables');
    } else {
      console.log('📄 .env.local file already exists');
      
      // Read existing .env file
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      const existingVars = envLines
        .filter(line => line.trim() && !line.trim().startsWith('#'))
        .map(line => line.split('=')[0].trim());
      
      // Check for missing variables
      const missingVars = supabaseConfig.requiredEnvVars
        .filter(key => !existingVars.includes(key));
      
      if (missingVars.length > 0) {
        console.log('🔍 Adding missing environment variables...');
        
        const newVars = missingVars.map(key => `${key}=`).join('\n');
        const updatedContent = envContent + (envContent.endsWith('\n') ? '' : '\n') + newVars;
        
        fs.writeFileSync(envPath, updatedContent);
        console.log('✅ Updated .env.local with missing variables');
      } else {
        console.log('✅ All required environment variables exist');
      }
    }
    
    // Create .env.example.local if it doesn't exist
    if (!fs.existsSync(envExamplePath)) {
      console.log('📄 Creating .env.example.local file...');
      
      const envExampleContent = supabaseConfig.requiredEnvVars
        .map(key => `${key}=your_${key.toLowerCase()}_here`)
        .join('\n');
      
      fs.writeFileSync(envExamplePath, envExampleContent);
      console.log('✅ Created .env.example.local file');
    }
  } catch (error) {
    console.error('❌ Error updating environment variables:', error);
    process.exit(1);
  }
}

/**
 * Create Supabase bucket configuration file
 */
function createBucketConfig() {
  console.log('🪣 Creating Supabase bucket configuration...');
  
  try {
    const bucketConfigPath = path.join(process.cwd(), 'supabase', 'bucket-config.json');
    
    // Create supabase directory if it doesn't exist
    if (!fs.existsSync(path.join(process.cwd(), 'supabase'))) {
      fs.mkdirSync(path.join(process.cwd(), 'supabase'));
    }
    
    // Create bucket configuration
    const bucketConfig = {
      buckets: supabaseConfig.buckets.map(bucket => ({
        name: bucket.name,
        public: bucket.public,
        file_size_limit: bucket.fileSizeLimit,
        allowed_mime_types: bucket.name === 'json_data' 
          ? ['application/json'] 
          : bucket.name === 'documents' 
            ? ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
            : null
      }))
    };
    
    fs.writeFileSync(bucketConfigPath, JSON.stringify(bucketConfig, null, 2));
    console.log('✅ Created bucket configuration at supabase/bucket-config.json');
  } catch (error) {
    console.error('❌ Error creating bucket configuration:', error);
    process.exit(1);
  }
}

/**
 * Create upload script 
 */
function createUploadScript() {
  console.log('📤 Creating upload script...');
  
  try {
    // Check if upload script already exists
    const uploadScriptPath = path.join(process.cwd(), 'scripts', 'upload-to-supabase-storage.js');
    
    if (!fs.existsSync(uploadScriptPath)) {
      console.log('📄 Creating upload-to-supabase-storage.js...');
      
      // Create the script
      const uploadScript = `
/**
 * Upload to Supabase Storage Script
 * 
 * Usage: node scripts/upload-to-supabase-storage.js
 * 
 * This script uploads files from local directories to Supabase Storage buckets.
 */
require('dotenv').config({ path: '.env.local' });
const { createStorageClient } = require('../dist/lib/supabase-storage');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabase = createStorageClient();

// Upload a file to Supabase Storage
async function uploadFile(filePath, bucket, storagePath) {
  try {
    console.log(\`Uploading \${filePath} to \${bucket}/\${storagePath}...\`);
    
    // Read file content
    const fileContent = fs.readFileSync(filePath);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileContent, {
        contentType: getMimeType(filePath),
        upsert: true,
      });
    
    if (error) {
      console.error(\`Error uploading \${filePath}:\`, error);
      return false;
    }
    
    console.log(\`✅ Uploaded \${filePath} to \${bucket}/\${storagePath}\`);
    return true;
  } catch (error) {
    console.error(\`Failed to upload \${filePath}:\`, error);
    return false;
  }
}

// Get MIME type based on file extension
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.json': return 'application/json';
    case '.pdf': return 'application/pdf';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

// Main function
async function main() {
  // Run the full upload-to-supabase-storage.ts script
  require('../dist/scripts/upload-to-supabase-storage');
}

main();
`;
      
      fs.writeFileSync(uploadScriptPath, uploadScript);
      console.log('✅ Created upload script at scripts/upload-to-supabase-storage.js');
    } else {
      console.log('✅ Upload script already exists');
    }
  } catch (error) {
    console.error('❌ Error creating upload script:', error);
    process.exit(1);
  }
}

/**
 * Print summary and next steps
 */
function printSummary() {
  console.log('\n🎉 Supabase Storage setup complete!\n');
  console.log('📝 Next steps:');
  console.log('  1. Fill in your Supabase credentials in .env.local:');
  console.log('     - NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.log('     - NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key');
  console.log('     - SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.log('  2. Compile the TypeScript code:');
  console.log('     $ npm run build');
  console.log('  3. Upload your files to Supabase Storage:');
  console.log('     $ node scripts/upload-to-supabase-storage.js');
  console.log('\n👉 For more information, see the README.md file.');
}

// Run the setup
function main() {
  console.log('\n🚀 Setting up Supabase Storage...\n');
  
  updatePackageJson();
  updateEnvVars();
  createBucketConfig();
  createUploadScript();
  printSummary();
}

main(); 