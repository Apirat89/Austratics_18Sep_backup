#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testBookmarkQuery() {
  try {
    console.log('🔍 TESTING EXACT BOOKMARK QUERY THAT FAILS');
    console.log('=' .repeat(50));
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('📡 Connected to Supabase');
    
    // First, let's see what data actually exists in the table
    console.log('\n1. 🔍 Checking actual data in faq_search_bookmarks...');
    try {
      const { data, error } = await supabase
        .from('faq_search_bookmarks')
        .select('*');
        
      if (error) {
        console.log('❌ Error fetching all data:', error.message);
      } else {
        console.log('✅ Found', data?.length || 0, 'records:');
        data?.forEach((record, index) => {
          console.log(`   Record ${index + 1}:`, {
            id: record.id,
            bookmark_name: record.bookmark_name,
            search_term: record.search_term,
            user_id: record.user_id?.substring(0, 8) + '...'
          });
        });
      }
    } catch (err) {
      console.log('❌ Exception:', err.message);
    }
    
    // Test the exact query pattern that's failing
    console.log('\n2. 🧪 Testing the exact failing query pattern...');
    
    // Simulate the query from console log: bookmark_name=eq.1
    try {
      const { data, error } = await supabase
        .from('faq_search_bookmarks')
        .select('id')
        .eq('bookmark_name', '1');  // Testing with bookmark name "1"
        
      if (error) {
        console.log('❌ Error with bookmark_name=1:', error.message);
        console.log('   Error code:', error.code);
      } else {
        console.log('✅ Query successful, found', data?.length || 0, 'records');
        if (data && data.length > 0) {
          console.log('   Found bookmark with name "1"');
        }
      }
    } catch (err) {
      console.log('❌ Exception with bookmark_name=1:', err.message);
    }
    
    // Test with different user IDs to see if that's the issue
    console.log('\n3. 🧪 Testing user-specific queries...');
    
    try {
      // Get the actual user_id from existing data first
      const { data: allData } = await supabase
        .from('faq_search_bookmarks')
        .select('user_id, bookmark_name')
        .limit(1);
        
      if (allData && allData[0]) {
        const testUserId = allData[0].user_id;
        const testBookmarkName = allData[0].bookmark_name;
        
        console.log('   Testing with real user_id:', testUserId?.substring(0, 8) + '...');
        console.log('   Testing with real bookmark_name:', testBookmarkName);
        
        const { data, error } = await supabase
          .from('faq_search_bookmarks')
          .select('id')
          .eq('user_id', testUserId)
          .eq('bookmark_name', testBookmarkName);
          
        if (error) {
          console.log('❌ Error with real user/bookmark:', error.message);
          console.log('   Error code:', error.code);
        } else {
          console.log('✅ Real user/bookmark query successful, found', data?.length || 0, 'records');
        }
      }
    } catch (err) {
      console.log('❌ Exception with real user query:', err.message);
    }
    
    // Test if it's a browser vs server key issue
    console.log('\n4. 🧪 Testing with anon key (like browser would use)...');
    
    try {
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (anonKey) {
        const anonSupabase = createClient(supabaseUrl, anonKey);
        
        const { data, error } = await anonSupabase
          .from('faq_search_bookmarks')
          .select('id')
          .limit(1);
          
        if (error) {
          console.log('❌ Error with anon key:', error.message);
          console.log('   Error code:', error.code);
          console.log('   This might be the cause of 406 error!');
        } else {
          console.log('✅ Anon key query successful');
        }
      } else {
        console.log('⚠️  No anon key found in environment');
      }
    } catch (err) {
      console.log('❌ Exception with anon key:', err.message);
    }
    
    console.log('\n🏁 Query testing complete!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

if (require.main === module) {
  testBookmarkQuery();
}

module.exports = { testBookmarkQuery }; 