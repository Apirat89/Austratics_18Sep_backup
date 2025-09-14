#!/usr/bin/env node
/**
 * Apply Storage RLS Policies Directly
 * 
 * This script applies Row Level Security (RLS) policies to Supabase Storage buckets
 * directly through the Supabase Management API instead of using SQL
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase credentials from .env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Please add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Define the buckets we need to configure
const buckets = ['images', 'json_data', 'documents', 'faq'];

async function configureBucket(bucketName, isPublic = false) {
  try {
    console.log(`Checking if bucket exists: ${bucketName}`);
    
    // Check if bucket exists
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName);
    
    if (bucketError) {
      if (bucketError.message.includes('not found')) {
        // Create bucket if it doesn't exist
        console.log(`Creating bucket: ${bucketName}`);
        const { data, error } = await supabase.storage.createBucket(bucketName, {
          public: isPublic,
          fileSizeLimit: bucketName === 'documents' ? 100 * 1024 * 1024 : 50 * 1024 * 1024
        });
        
        if (error) {
          console.error(`Error creating bucket ${bucketName}:`, error);
          return false;
        }
        
        console.log(`Created bucket: ${bucketName}`);
      } else {
        console.error(`Error checking bucket ${bucketName}:`, bucketError);
        return false;
      }
    } else {
      // Update bucket if it exists
      console.log(`Updating bucket: ${bucketName}`);
      const { data, error } = await supabase.storage.updateBucket(bucketName, {
        public: isPublic,
        fileSizeLimit: bucketName === 'documents' ? 100 * 1024 * 1024 : 50 * 1024 * 1024
      });
      
      if (error) {
        console.error(`Error updating bucket ${bucketName}:`, error);
        return false;
      }
      
      console.log(`Updated bucket: ${bucketName}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error configuring bucket ${bucketName}:`, error);
    return false;
  }
}

async function applyRLSPoliciesDirectly() {
  try {
    console.log('='.repeat(60));
    console.log('🔒 APPLYING STORAGE RLS POLICIES DIRECTLY');
    console.log('='.repeat(60));
    
    console.log('NOTE: We are using direct Supabase Storage API calls instead of SQL scripts');
    console.log('This will make all buckets private (not public), which achieves the goal of requiring authentication');
    console.log('You will need to manually create the special policies for login page images using the Supabase Dashboard');
    
    // Configure all buckets
    let successCount = 0;
    
    for (const bucket of buckets) {
      console.log(`\nConfiguring bucket: ${bucket}`);
      const success = await configureBucket(bucket, false); // Set all buckets to private
      
      if (success) {
        successCount++;
      }
    }
    
    console.log('\n='.repeat(60));
    console.log(`✅ Successfully configured ${successCount}/${buckets.length} buckets`);
    console.log('='.repeat(60));
    
    // Instructions for manual policy creation
    console.log('\n🔍 IMPORTANT MANUAL STEPS:');
    console.log('To complete the setup with special policies for the login page:');
    console.log('1. Go to your Supabase Dashboard: https://app.supabase.com/');
    console.log('2. Navigate to Storage → Policies');
    console.log('3. For the "images" bucket, add the following policy:');
    console.log('   - Name: "Allow public access to login page background images"');
    console.log('   - Allowed operation: SELECT');
    console.log('   - FOR: Anonymous users (anon)');
    console.log('   - WITH CHECK expression:');
    console.log(`     name LIKE '%koala%' OR name LIKE '%aerial%' OR name LIKE '%scarborough%'`);
    console.log('          OR name LIKE \'%australian%\' OR name LIKE \'%aerial-view%\'');
    console.log('\nThis will make login page background images publicly accessible.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Execute the function
applyRLSPoliciesDirectly().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 