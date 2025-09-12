/**
 * Script to fix the master admin user status
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
  console.log('Checking admin user status...');

  // Check current status
  const { data: userBefore, error: queryError } = await supabase
    .from('admin_users')
    .select('id, email, status, created_at, is_master')
    .eq('email', 'apirat.kongchanagul@gmail.com')
    .single();

  if (queryError) {
    console.error('Error checking admin user:', queryError);
    process.exit(1);
  }

  console.log('Current admin user state:', userBefore);

  // Update status if needed
  if (!userBefore.status || userBefore.status !== 'active') {
    console.log('Updating admin user status to "active"...');

    const { data: updateResult, error: updateError } = await supabase
      .from('admin_users')
      .update({ status: 'active' })
      .eq('email', 'apirat.kongchanagul@gmail.com');

    if (updateError) {
      console.error('Error updating admin user status:', updateError);
      process.exit(1);
    }

    console.log('Status updated successfully');

    // Verify the update
    const { data: userAfter, error: verifyError } = await supabase
      .from('admin_users')
      .select('id, email, status, created_at, is_master')
      .eq('email', 'apirat.kongchanagul@gmail.com')
      .single();

    if (verifyError) {
      console.error('Error verifying admin user update:', verifyError);
      process.exit(1);
    }

    console.log('Updated admin user state:', userAfter);
  } else {
    console.log('Admin user status is already "active", no update needed');
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
}); 