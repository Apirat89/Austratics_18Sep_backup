#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkFAQBookmarksTable() {
  try {
    console.log('🔍 FAQ BOOKMARKS TABLE INVESTIGATION');
    console.log('=' .repeat(50));
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('❌ Missing Supabase credentials in .env file');
    }
    
    console.log('📡 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if faq_search_bookmarks table exists
    console.log('\n1. 🔍 Checking if faq_search_bookmarks table exists...');
    try {
      const { data: tableExists, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'faq_search_bookmarks');
        
      if (tableError) {
        console.log('❌ Error checking table existence:', tableError.message);
      } else if (tableExists && tableExists.length > 0) {
        console.log('✅ faq_search_bookmarks table EXISTS');
      } else {
        console.log('❌ faq_search_bookmarks table DOES NOT EXIST');
      }
    } catch (err) {
      console.log('❌ Error in table existence check:', err.message);
    }
    
    // Check original faq_bookmarks table
    console.log('\n2. 🔍 Checking if original faq_bookmarks table exists...');
    try {
      const { data: originalExists, error: originalError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'faq_bookmarks');
        
      if (originalError) {
        console.log('❌ Error checking original table:', originalError.message);
      } else if (originalExists && originalExists.length > 0) {
        console.log('✅ faq_bookmarks table EXISTS');
      } else {
        console.log('❌ faq_bookmarks table DOES NOT EXIST');
      }
    } catch (err) {
      console.log('❌ Error in original table check:', err.message);
    }
    
    // Test direct access to faq_search_bookmarks
    console.log('\n3. 🧪 Testing direct access to faq_search_bookmarks...');
    try {
      const { data, error } = await supabase
        .from('faq_search_bookmarks')
        .select('*')
        .limit(1);
        
      if (error) {
        console.log('❌ Access error:', error.message);
        console.log('   Error code:', error.code);
        console.log('   Error details:', error.details);
      } else {
        console.log('✅ Table accessible, found', data?.length || 0, 'records');
      }
    } catch (err) {
      console.log('❌ Exception during access test:', err.message);
    }
    
    // Test regulation_bookmarks for comparison
    console.log('\n4. 🧪 Testing regulation_bookmarks table (for comparison)...');
    try {
      const { data, error } = await supabase
        .from('regulation_bookmarks')
        .select('*')
        .limit(1);
        
      if (error) {
        console.log('❌ Regulation bookmarks access error:', error.message);
      } else {
        console.log('✅ Regulation bookmarks accessible, found', data?.length || 0, 'records');
      }
    } catch (err) {
      console.log('❌ Exception during regulation bookmarks test:', err.message);
    }
    
    // Check column structure if table exists
    console.log('\n5. 🔍 Checking table structure...');
    try {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_schema', 'public')
        .eq('table_name', 'faq_search_bookmarks')
        .order('ordinal_position');
        
      if (columnsError) {
        console.log('❌ Error checking columns:', columnsError.message);
      } else if (columns && columns.length > 0) {
        console.log('✅ Table columns:');
        columns.forEach(col => {
          console.log(`   - ${col.column_name} (${col.data_type})`);
        });
      } else {
        console.log('❌ No columns found (table likely doesn\'t exist)');
      }
    } catch (err) {
      console.log('❌ Exception during column check:', err.message);
    }
    
    console.log('\n🏁 Investigation complete!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

if (require.main === module) {
  checkFAQBookmarksTable();
}

module.exports = { checkFAQBookmarksTable }; 