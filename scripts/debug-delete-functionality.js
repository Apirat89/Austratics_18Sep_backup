#!/usr/bin/env node

/**
 * Debug Delete Functionality Test
 * 
 * This script tests the delete functionality by creating test data and attempting to delete it.
 * This will help identify where the delete functionality is failing.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Debug Delete Functionality Test');
console.log('==================================\n');

async function testDeleteFunctionality() {
  try {
    console.log('🔍 Step 1: Check if we can access tables...');
    
    // Try to get some test data from regulation_search_history
    const { data: searchHistory, error: searchError } = await supabase
      .from('regulation_search_history')
      .select('*')
      .limit(5);
    
    if (searchError) {
      console.error('❌ Cannot access regulation_search_history:', searchError);
      console.log('   This indicates an authentication or RLS issue');
      return false;
    }
    
    console.log(`✅ Can access regulation_search_history: ${searchHistory?.length || 0} items`);
    
    // Try to get conversation data
    const { data: conversations, error: convError } = await supabase
      .from('regulation_conversations')
      .select('id, title, user_id')
      .limit(5);
    
    if (convError) {
      console.error('❌ Cannot access regulation_conversations:', convError);
      return false;
    }
    
    console.log(`✅ Can access regulation_conversations: ${conversations?.length || 0} items`);
    
    // Try to get messages
    const { data: messages, error: msgError } = await supabase
      .from('regulation_messages')
      .select('id, content, role, is_bookmarked')
      .limit(5);
    
    if (msgError) {
      console.error('❌ Cannot access regulation_messages:', msgError);
      return false;
    }
    
    console.log(`✅ Can access regulation_messages: ${messages?.length || 0} items`);
    
    console.log('\n🔍 Step 2: Create test data for deletion...');
    
    // Create a test search history item
    const testSearchItem = {
      user_id: '00000000-0000-0000-0000-000000000001', // Test user ID
      search_term: 'Test search for deletion',
      response_preview: 'Test response preview',
      citations_count: 1,
      document_types: ['test_type'],
      processing_time: 500
    };
    
    const { data: createdSearch, error: createError } = await supabase
      .from('regulation_search_history')
      .insert(testSearchItem)
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Cannot create test search item:', createError);
      console.log('   This may indicate RLS policies are blocking inserts');
      console.log('   Or the user_id format is incorrect');
      
      // Try with a different approach - let's see what user IDs exist
      const { data: existingUsers, error: userError } = await supabase
        .from('regulation_search_history')
        .select('user_id')
        .limit(1);
      
      if (!userError && existingUsers && existingUsers.length > 0) {
        console.log(`   Found existing user_id: ${existingUsers[0].user_id}`);
        console.log('   Try testing with this user_id in the browser');
      }
      
      return false;
    }
    
    console.log(`✅ Created test search item with ID: ${createdSearch.id}`);
    
    console.log('\n🔍 Step 3: Test deletion via API...');
    
    // Try to delete the item we just created using the API endpoint
    const axios = require('axios');
    const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    try {
      const deleteResponse = await axios.post(`${BASE_URL}/api/regulation/chat`, {
        action: 'delete-message',
        messageId: createdSearch.id
      });
      
      console.log('✅ API delete call succeeded:', deleteResponse.status);
      
    } catch (apiError) {
      console.error('❌ API delete call failed:', apiError.response?.data || apiError.message);
      console.log('   This indicates the API endpoint has issues');
    }
    
    console.log('\n🔍 Step 4: Test direct database deletion...');
    
    // Try to delete directly from database
    const { error: deleteError } = await supabase
      .from('regulation_search_history')
      .delete()
      .eq('id', createdSearch.id);
    
    if (deleteError) {
      console.error('❌ Direct database deletion failed:', deleteError);
      console.log('   This indicates RLS policies are preventing deletion');
      return false;
    }
    
    console.log('✅ Direct database deletion succeeded');
    
    // Verify it's actually deleted
    const { data: verifyDeleted, error: verifyError } = await supabase
      .from('regulation_search_history')
      .select('id')
      .eq('id', createdSearch.id);
    
    if (verifyError) {
      console.error('❌ Cannot verify deletion:', verifyError);
      return false;
    }
    
    if (verifyDeleted && verifyDeleted.length === 0) {
      console.log('✅ Deletion verified - item no longer exists');
    } else {
      console.error('❌ Item still exists after deletion attempt');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

async function checkBrowserConsoleInstructions() {
  console.log('\n🔍 Step 5: Browser Console Debugging Instructions');
  console.log('================================================\n');
  
  console.log('To debug in the browser:');
  console.log('1. Open the regulation page');
  console.log('2. Open browser dev tools (F12)');
  console.log('3. Go to Console tab');
  console.log('4. Try to expand the History & Bookmarks panel');
  console.log('5. Look for any error messages');
  console.log('6. Try clicking a delete button');
  console.log('7. Check if any errors appear in the console\n');
  
  console.log('Common issues to look for:');
  console.log('❌ "currentUser is null" - Authentication issue');
  console.log('❌ "Cannot read property of undefined" - Data structure issue');  
  console.log('❌ "Network error" - API endpoint issue');
  console.log('❌ "deleteUnifiedHistoryItem is not a function" - Import issue');
  console.log('');
  
  console.log('To test manually in browser console:');
  console.log('console.log("Current user:", window.currentUser);');
  console.log('console.log("Search history:", window.searchHistory);');
  console.log('console.log("Unified history:", window.unifiedHistory);');
}

async function runAllTests() {
  console.log('🚀 Starting delete functionality debugging...\n');
  
  const success = await testDeleteFunctionality();
  
  if (success) {
    console.log('\n🎉 Database-level deletion works!');
    console.log('   The issue is likely in:');
    console.log('   - Frontend authentication (currentUser is null)');
    console.log('   - UI event binding (buttons not calling functions)');
    console.log('   - Browser console errors preventing execution');
  } else {
    console.log('\n💥 Database-level deletion failed');
    console.log('   The issue is in:');
    console.log('   - Database permissions (RLS policies)');
    console.log('   - Authentication setup');
    console.log('   - API endpoint configuration');
  }
  
  await checkBrowserConsoleInstructions();
  
  return success;
}

// Run the tests
runAllTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }); 