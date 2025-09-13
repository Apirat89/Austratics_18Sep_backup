/**
 * Upload to Supabase Storage Script
 * 
 * This script uploads all data files to Supabase Storage buckets.
 * It handles JSON data files, PDF documents, DOCX documents, and images.
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
// Add node-fetch import for Node.js environments
import fetch from 'node-fetch';
import { createStorageClient } from '../src/lib/supabase-storage';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// For Node.js environments where global fetch might not be available
if (!global.fetch) {
  global.fetch = fetch as any;
}

// Initialize Supabase client
const supabase = createStorageClient();

// File types to process
const JSON_EXTENSIONS = ['.json'];
const DOCUMENT_EXTENSIONS = ['.pdf', '.docx', '.doc'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];

// Bucket names
const BUCKETS = {
  JSON_DATA: 'json_data',
  DOCUMENTS: 'documents',
  IMAGES: 'images',
  FAQ: 'faq',
};

// Source directories
const DIRECTORIES = {
  SA2_DATA: 'data/sa2',
  REGULATION_DOCS: 'data/Regulation Docs',
  MAPS_ABS_CSV: 'Maps_ABS_CSV',
  PUBLIC_MAPS: 'public/maps',
  FAQ: 'data/FAQ',
  PUBLIC_IMAGES: 'public',
  PUBLIC_MARKERS: 'public/markers',
};

/**
 * Create buckets if they don't exist
 */
async function createBuckets() {
  for (const bucket of Object.values(BUCKETS)) {
    console.log(`Checking if bucket exists: ${bucket}`);
    const { data, error } = await supabase.storage.getBucket(bucket);
    
    if (error && error.message.includes('The resource was not found')) {
      console.log(`Creating bucket: ${bucket}`);
      const { data, error: createError } = await supabase.storage.createBucket(
        bucket, 
        { 
          public: bucket === BUCKETS.IMAGES || bucket === BUCKETS.JSON_DATA,
          fileSizeLimit: bucket === BUCKETS.DOCUMENTS ? '100MB' : '50MB',
        }
      );
      
      if (createError) {
        console.error(`Failed to create bucket ${bucket}:`, createError);
        process.exit(1);
      } else {
        console.log(`Created bucket: ${bucket}`);
      }
    } else if (error) {
      console.error(`Error checking bucket ${bucket}:`, error);
      process.exit(1);
    } else {
      console.log(`Bucket already exists: ${bucket}`);
    }
  }
}

/**
 * Get appropriate bucket for a file based on its extension
 */
function getBucketForFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  if (JSON_EXTENSIONS.includes(ext)) {
    return BUCKETS.JSON_DATA;
  } else if (DOCUMENT_EXTENSIONS.includes(ext)) {
    // Special case for FAQ directory
    if (filePath.includes('data/FAQ')) {
      return BUCKETS.FAQ;
    }
    return BUCKETS.DOCUMENTS;
  } else if (IMAGE_EXTENSIONS.includes(ext)) {
    return BUCKETS.IMAGES;
  }
  
  // Default case
  return BUCKETS.JSON_DATA;
}

/**
 * Get MIME type for a file
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  // Common MIME types
  const mimeTypes: Record<string, string> = {
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Upload a single file to Supabase Storage
 */
async function uploadFile(filePath: string, bucket: string, storagePath: string): Promise<boolean> {
  try {
    console.log(`Uploading ${filePath} to ${bucket}/${storagePath}`);
    
    // Read file content
    const fileContent = fs.readFileSync(filePath);
    const fileBlob = new Blob([fileContent], { type: getMimeType(filePath) });
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBlob, {
        contentType: getMimeType(filePath),
        upsert: true,
      });
    
    if (error) {
      console.error(`Error uploading ${filePath}:`, error);
      return false;
    }
    
    console.log(`✅ Uploaded ${filePath} to ${bucket}/${storagePath}`);
    return true;
  } catch (error) {
    console.error(`Failed to upload ${filePath}:`, error);
    return false;
  }
}

/**
 * Process a directory and upload all relevant files
 */
async function processDirectory(
  dirPath: string, 
  baseStoragePath: string = '', 
  specificBucket?: string
): Promise<{ success: number; failed: number }> {
  let successCount = 0;
  let failedCount = 0;
  
  try {
    console.log(`Processing directory: ${dirPath}`);
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        // Recursively process subdirectories
        const storagePath = baseStoragePath ? `${baseStoragePath}/${file}` : file;
        const results = await processDirectory(fullPath, storagePath, specificBucket);
        successCount += results.success;
        failedCount += results.failed;
      } else {
        // Upload file
        const bucket = specificBucket || getBucketForFile(fullPath);
        const storagePath = baseStoragePath ? `${baseStoragePath}/${file}` : file;
        
        const success = await uploadFile(fullPath, bucket, storagePath);
        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error);
    failedCount++;
  }
  
  return { success: successCount, failed: failedCount };
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting Supabase Storage upload process...');
    
    // Create buckets
    await createBuckets();
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    // Process SA2 data (JSON files)
    console.log('Processing SA2 data...');
    const sa2Results = await processDirectory(DIRECTORIES.SA2_DATA, 'sa2', BUCKETS.JSON_DATA);
    totalSuccess += sa2Results.success;
    totalFailed += sa2Results.failed;
    
    // Process regulation documents (PDFs)
    console.log('Processing regulation documents...');
    const regulationResults = await processDirectory(DIRECTORIES.REGULATION_DOCS, 'regulations', BUCKETS.DOCUMENTS);
    totalSuccess += regulationResults.success;
    totalFailed += regulationResults.failed;
    
    // Process Maps ABS CSV data (JSON files)
    console.log('Processing Maps ABS CSV data...');
    const mapsDataResults = await processDirectory(DIRECTORIES.MAPS_ABS_CSV, 'maps', BUCKETS.JSON_DATA);
    totalSuccess += mapsDataResults.success;
    totalFailed += mapsDataResults.failed;
    
    // Process public maps data
    console.log('Processing public maps data...');
    const publicMapsResults = await processDirectory(DIRECTORIES.PUBLIC_MAPS, 'public-maps', BUCKETS.JSON_DATA);
    totalSuccess += publicMapsResults.success;
    totalFailed += publicMapsResults.failed;
    
    // Process FAQ documents (DOCX files)
    console.log('Processing FAQ documents...');
    const faqResults = await processDirectory(DIRECTORIES.FAQ, 'guides', BUCKETS.FAQ);
    totalSuccess += faqResults.success;
    totalFailed += faqResults.failed;
    
    // Process public images
    console.log('Processing public images...');
    const imageFiles = fs.readdirSync(DIRECTORIES.PUBLIC_IMAGES)
      .filter(file => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()))
      .map(file => path.join(DIRECTORIES.PUBLIC_IMAGES, file));
    
    for (const imagePath of imageFiles) {
      const fileName = path.basename(imagePath);
      const success = await uploadFile(imagePath, BUCKETS.IMAGES, fileName);
      if (success) {
        totalSuccess++;
      } else {
        totalFailed++;
      }
    }
    
    // Process markers
    console.log('Processing markers...');
    const markerResults = await processDirectory(DIRECTORIES.PUBLIC_MARKERS, 'markers', BUCKETS.IMAGES);
    totalSuccess += markerResults.success;
    totalFailed += markerResults.failed;
    
    console.log('\n======= UPLOAD SUMMARY =======');
    console.log(`✅ Successfully uploaded: ${totalSuccess} files`);
    console.log(`❌ Failed to upload: ${totalFailed} files`);
    console.log('=============================');
    
    if (totalFailed > 0) {
      console.log('\nSome files failed to upload. Check the logs above for details.');
      process.exit(1);
    } else {
      console.log('\nAll files uploaded successfully!');
    }
  } catch (error) {
    console.error('Error in upload process:', error);
    process.exit(1);
  }
}

// Execute the script
main(); 