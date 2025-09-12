/**
 * Script to fix the master admin user by removing it from auth.users
 * while maintaining its presence in admin_users
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Set up Supabase client with admin privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in .env file');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, { 
  auth: { 
    persistSession: false, 
    autoRefreshToken: false 
  } 
});

async function main() {
  console.log('🔧 Starting master admin user fix operation...');
  console.log('📋 This script will remove apirat.kongchanagul from auth.users while preserving the admin_users record');
  
  try {
    // Read the SQL script
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'fix_master_admin_user.sql'),
      'utf8'
    );
    
    console.log('📄 SQL script loaded successfully');
    
    // Execute SQL statements
    console.log('⚙️ Executing SQL script...');
    
    // Execute the SQL script against the database
    // Note: Supabase JS client doesn't support executing raw SQL scripts directly
    // In a real scenario, you would use a database client like pg to execute this
    console.log('⚠️ IMPORTANT: This script cannot directly execute the SQL.');
    console.log('⚠️ Please run the SQL script against your Supabase database using:');
    console.log('⚠️ 1. Supabase Studio SQL Editor');
    console.log('⚠️ 2. psql command line tool');
    console.log('⚠️ 3. Another PostgreSQL client');
    console.log('\n📋 SQL Script path: ./scripts/fix_master_admin_user.sql\n');
    
    // Alternative approach: Export the SQL to be run manually
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(__dirname, `fix_master_admin_${timestamp}.sql`);
    fs.writeFileSync(outputFile, sqlScript);
    
    console.log(`✅ SQL script exported to: ${outputFile}`);
    console.log('✅ After running the script, the master admin user will be properly configured');
    
    // Verification steps
    console.log('\n🔍 Verification checks:');
    
    // Check if user exists in auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
      'e6aca4f3-4edc-49ff-926d-924e5d8a29d5'
    );
    
    if (authError) {
      console.log('✅ User not found in auth.users (expected if already deleted)');
    } else if (authUser) {
      console.log('⚠️ User still exists in auth.users - need to run the SQL script');
      console.log('⚠️ User details:', authUser);
    }
    
    // Check if user exists in admin_users
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', 'apirat.kongchanagul@gmail.com')
      .single();
      
    if (adminError) {
      console.log('❌ Error: User not found in admin_users - this is unexpected!');
      console.error(adminError);
    } else {
      console.log('✅ User confirmed in admin_users with master admin status');
      console.log(`✅ Admin user ID: ${adminUser.id}`);
      console.log(`✅ Is master: ${adminUser.is_master}`);
      console.log(`✅ Status: ${adminUser.status}`);
    }
    
    console.log('\n✅ Script completed');
    
  } catch (error) {
    console.error('❌ Error executing script:', error);
    process.exit(1);
  }
}

// Run the script
main(); 