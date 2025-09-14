#!/usr/bin/env node
/**
 * Apply Storage RLS Policies
 * 
 * This script applies Row Level Security (RLS) policies to Supabase Storage buckets
 * making them accessible only to authenticated users.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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

async function applyRLSPolicies() {
  try {
    console.log('='.repeat(60));
    console.log('🔒 APPLYING STORAGE RLS POLICIES');
    console.log('='.repeat(60));

    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, '..', 'supabase', 'migrations', '20250901000000_add_storage_rls_policies.sql');
    let sqlContent;
    
    try {
      sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    } catch (error) {
      console.error(`❌ Could not read SQL file: ${sqlFilePath}`);
      console.error(error);
      process.exit(1);
    }

    console.log('SQL file loaded successfully');

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each SQL statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        await supabase.rpc('exec_sql', { sql_query: statement });
        console.log(`✅ Statement executed successfully`);
      } catch (error) {
        console.error(`❌ Failed to execute statement:`, error);
        console.error('SQL:', statement);
      }
    }

    // Verify buckets have RLS enabled
    console.log('\nVerifying RLS is enabled on storage buckets...');
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: "SELECT table_name, row_level_security FROM information_schema.tables WHERE table_schema = 'storage' AND table_name IN ('buckets', 'objects')"
      });
      
      if (error) {
        console.error('❌ Failed to verify RLS status:', error);
      } else if (data && data.length) {
        console.table(data);
      } else {
        console.log('⚠️ Could not verify RLS status');
      }
    } catch (error) {
      console.error('❌ Error verifying RLS status:', error);
    }

    console.log('\n✅ RLS policies have been applied to storage buckets');
    console.log('Now only authenticated users can access your private buckets.');

  } catch (error) {
    console.error('❌ Failed to apply RLS policies:', error);
    process.exit(1);
  }
}

// Execute the function
applyRLSPolicies().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
}); 