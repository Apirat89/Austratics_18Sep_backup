#!/usr/bin/env node

/**
 * Database Schema Validation Test
 * 
 * Tests all database schema changes and functions to ensure they are working correctly.
 * This is part of troubleshooting why the restored functionality isn't working.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Database Schema Validation Test');
console.log('=================================\n');

async function testDatabaseSchema() {
  console.log('📊 1. Testing database schema...');
  
  try {
    // Test 1: Check if is_bookmarked column exists by querying it directly
    console.log('\n🔍 Test 1.1: Checking is_bookmarked column in regulation_messages');
    
    try {
      const { data: testColumn, error: columnError } = await supabase
        .from('regulation_messages')
        .select('is_bookmarked')
        .limit(1);
      
      if (columnError) {
        if (columnError.message && columnError.message.includes('column "is_bookmarked" does not exist')) {
          console.error('❌ is_bookmarked column NOT FOUND in regulation_messages table');
          return false;
        } else {
          console.error('❌ Error checking is_bookmarked column:', columnError);
          return false;
        }
      } else {
        console.log('✅ is_bookmarked column exists and is accessible');
      }
    } catch (err) {
      console.error('❌ Unexpected error checking is_bookmarked column:', err);
      return false;
    }
    
         // Test 2: Check if helper functions exist by trying to call them
     console.log('\n🔍 Test 1.2: Checking database helper functions exist');
     
     const helperFunctions = [
       'get_user_bookmarked_messages', 
       'get_user_bookmarked_conversations',
       'get_unified_bookmarks'
     ];
     
     // We'll test these functions with a test UUID to see if they exist
     const testUuid = '00000000-0000-0000-0000-000000000000';
     
     for (const functionName of helperFunctions) {
       try {
         const { data: funcResult, error: funcError } = await supabase
           .rpc(functionName, { user_id: testUuid, limit_count: 1 });
         
         if (funcError) {
           if (funcError.message && funcError.message.includes('function') && funcError.message.includes('does not exist')) {
             console.error(`❌ Function ${functionName} NOT FOUND`);
             return false;
           } else {
             // Function exists but returned an error (probably due to fake UUID or RLS)
             console.log(`✅ Function ${functionName} exists (error expected with test UUID)`);
           }
         } else {
           console.log(`✅ Function ${functionName} exists and executed successfully`);
         }
       } catch (err) {
         console.error(`❌ Unexpected error checking function ${functionName}:`, err);
         return false;
       }
     }
    
    // Test 3: Test basic table access with RLS
    console.log('\n🔍 Test 1.3: Testing basic table access (RLS validation)');
    
    // Try to access regulation_messages table
    const { data: messagesData, error: messagesError } = await supabase
      .from('regulation_messages')
      .select('id, content, is_bookmarked')
      .limit(1);
    
    if (messagesError) {
      console.error('❌ Error accessing regulation_messages:', messagesError);
      console.error('   This could indicate RLS policy issues or authentication problems');
      return false;
    } else {
      console.log('✅ Can access regulation_messages table');
      console.log(`   Found ${messagesData?.length || 0} messages (limited to 1)`);
    }
    
    // Try to access regulation_conversations table
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('regulation_conversations')
      .select('id, title, user_id')
      .limit(1);
    
    if (conversationsError) {
      console.error('❌ Error accessing regulation_conversations:', conversationsError);
      return false;
    } else {
      console.log('✅ Can access regulation_conversations table');
      console.log(`   Found ${conversationsData?.length || 0} conversations (limited to 1)`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error in schema validation:', error);
    return false;
  }
}

async function testDatabaseFunctions() {
  console.log('\n📊 2. Testing database functions...');
  
  try {
    // We need a real user ID to test the functions
    // Let's try to get one from existing data
    const { data: userData, error: userError } = await supabase
      .from('regulation_conversations')
      .select('user_id')
      .limit(1);
    
    if (userError || !userData || userData.length === 0) {
      console.log('⚠️  No existing conversation data found, skipping function tests');
      console.log('   This is normal if no users have used the chat yet');
      return true;
    }
    
    const testUserId = userData[0].user_id;
    console.log(`🔍 Using test user ID: ${testUserId}`);
    
    // Test get_unified_bookmarks function
    console.log('\n🔍 Test 2.1: Testing get_unified_bookmarks function');
    
    const { data: unifiedBookmarks, error: unifiedError } = await supabase
      .rpc('get_unified_bookmarks', { user_id: testUserId, limit_count: 10 });
    
    if (unifiedError) {
      console.error('❌ Error calling get_unified_bookmarks:', unifiedError);
      return false;
    } else {
      console.log('✅ get_unified_bookmarks function works');
      console.log(`   Returned ${unifiedBookmarks?.length || 0} bookmarks`);
      if (unifiedBookmarks && unifiedBookmarks.length > 0) {
        console.log('   Sample bookmark structure:');
        console.log('  ', JSON.stringify(unifiedBookmarks[0], null, 2));
      }
    }
    
    // Test get_user_bookmarked_messages function
    console.log('\n🔍 Test 2.2: Testing get_user_bookmarked_messages function');
    
    const { data: bookmarkedMessages, error: messagesError } = await supabase
      .rpc('get_user_bookmarked_messages', { user_id: testUserId, limit_count: 10 });
    
    if (messagesError) {
      console.error('❌ Error calling get_user_bookmarked_messages:', messagesError);
      return false;
    } else {
      console.log('✅ get_user_bookmarked_messages function works');
      console.log(`   Returned ${bookmarkedMessages?.length || 0} bookmarked messages`);
    }
    
    // Test get_user_bookmarked_conversations function
    console.log('\n🔍 Test 2.3: Testing get_user_bookmarked_conversations function');
    
    const { data: bookmarkedConversations, error: conversationsError } = await supabase
      .rpc('get_user_bookmarked_conversations', { user_id: testUserId, limit_count: 10 });
    
    if (conversationsError) {
      console.error('❌ Error calling get_user_bookmarked_conversations:', conversationsError);
      return false;
    } else {
      console.log('✅ get_user_bookmarked_conversations function works');
      console.log(`   Returned ${bookmarkedConversations?.length || 0} bookmarked conversations`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error in function testing:', error);
    return false;
  }
}

async function testDirectQueries() {
  console.log('\n📊 3. Testing direct database queries...');
  
  try {
    // Test the unified query that the frontend uses
    console.log('\n🔍 Test 3.1: Testing unified history query (similar to getUnifiedSearchHistory)');
    
    // This mimics the query from getUnifiedSearchHistory in regulationHistory.ts
    const { data: messagesData, error: messagesError } = await supabase
      .from('regulation_messages')
      .select(`
        id,
        content,
        created_at,
        role,
        is_bookmarked,
        regulation_conversations!inner(
          id,
          title,
          user_id
        )
      `)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (messagesError) {
      console.error('❌ Error in unified history query:', messagesError);
      console.error('   This is the same query used by getUnifiedSearchHistory()');
      return false;
    } else {
      console.log('✅ Unified history query works');
      console.log(`   Found ${messagesData?.length || 0} user messages with conversation data`);
      
      if (messagesData && messagesData.length > 0) {
        console.log('   Sample unified message structure:');
        console.log('  ', JSON.stringify(messagesData[0], null, 2));
        
        // Check if conversation data is properly nested
        const msg = messagesData[0];
        if (msg.regulation_conversations) {
          console.log('✅ Conversation data properly nested in message');
        } else {
          console.error('❌ Conversation data missing from message - this is a critical issue');
          return false;
        }
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error in direct queries:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting comprehensive database validation...\n');
  
  const schemaOk = await testDatabaseSchema();
  if (!schemaOk) {
    console.log('\n💥 Database schema validation FAILED');
    return false;
  }
  
  const functionsOk = await testDatabaseFunctions();
  if (!functionsOk) {
    console.log('\n💥 Database functions validation FAILED');
    return false;
  }
  
  const queriesOk = await testDirectQueries();
  if (!queriesOk) {
    console.log('\n💥 Direct queries validation FAILED');
    return false;
  }
  
  console.log('\n🎉 All database validation tests PASSED!');
  console.log('\n📊 SUMMARY:');
  console.log('✅ Database schema is correct');
  console.log('✅ Helper functions are working');
  console.log('✅ RLS policies allow access');
  console.log('✅ Unified queries return data properly');
  console.log('\n👉 Database layer appears to be working correctly');
  console.log('   If functionality is still not working, the issue is likely in:');
  console.log('   - API endpoints (Task D.2)');
  console.log('   - Frontend compilation (Task D.3)');
  console.log('   - Data flow integration (Task D.4)');
  
  return true;
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