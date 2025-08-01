#!/usr/bin/env node

/**
 * Test Missing RPC Functions
 * 
 * The conversation saving relies on RPC functions that might not exist in the database.
 * This script tests if the required functions are available.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Testing Required RPC Functions for Conversation System');
console.log('======================================================\n');

async function testRPCFunction(functionName, testParams) {
  console.log(`🧪 Testing RPC function: ${functionName}`);
  console.log(`   Parameters:`, testParams);
  
  try {
    const { data, error } = await supabase.rpc(functionName, testParams);
    
    if (error) {
      if (error.message && error.message.includes('function') && error.message.includes('does not exist')) {
        console.log(`❌ FUNCTION MISSING: ${functionName} does not exist in database`);
        return false;
      } else {
        console.log(`✅ FUNCTION EXISTS: ${functionName} (error expected with test data)`);
        console.log(`   Error: ${error.message}`);
        return true;
      }
    } else {
      console.log(`✅ FUNCTION EXISTS: ${functionName} executed successfully`);
      console.log(`   Result:`, data);
      return true;
    }
  } catch (error) {
    console.error(`❌ UNEXPECTED ERROR testing ${functionName}:`, error);
    return false;
  }
}

async function testAllRequiredFunctions() {
  console.log('🚀 Starting RPC function tests...\n');
  
  const testResults = {};
  
  // Test add_message_to_conversation
  testResults.add_message_to_conversation = await testRPCFunction(
    'add_message_to_conversation',
    {
      conversation_id_param: 999, // Non-existent ID
      role_param: 'user',
      content_param: 'Test message',
      citations_param: null,
      processing_time_param: null,
      search_intent_param: 'question'
    }
  );
  
  console.log();
  
  // Test get_user_recent_conversations
  testResults.get_user_recent_conversations = await testRPCFunction(
    'get_user_recent_conversations',
    {
      user_id_param: '00000000-0000-0000-0000-000000000000', // Test UUID
      limit_param: 10
    }
  );
  
  console.log();
  
  // Test get_unified_bookmarks (from our previous work)
  testResults.get_unified_bookmarks = await testRPCFunction(
    'get_unified_bookmarks',
    {
      user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
      limit_count: 10
    }
  );
  
  console.log();
  
  return testResults;
}

async function checkDatabaseTables() {
  console.log('📊 Checking Database Tables...\n');
  
  const tables = [
    'regulation_conversations',
    'regulation_messages',
    'regulation_search_history',
    'regulation_bookmarks'
  ];
  
  for (const tableName of tables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error && error.message.includes('does not exist')) {
        console.log(`❌ TABLE MISSING: ${tableName}`);
      } else {
        console.log(`✅ TABLE EXISTS: ${tableName}`);
      }
    } catch (error) {
      console.log(`❌ TABLE ERROR: ${tableName} - ${error.message}`);
    }
  }
  
  console.log();
}

async function generateReport(testResults) {
  console.log('📋 DIAGNOSIS REPORT');
  console.log('==================\n');
  
  const missingFunctions = Object.entries(testResults)
    .filter(([name, exists]) => !exists)
    .map(([name]) => name);
  
  if (missingFunctions.length > 0) {
    console.log('🚨 **CRITICAL ISSUE FOUND: Missing Database Functions**\n');
    console.log('❌ Missing RPC Functions:');
    missingFunctions.forEach(func => {
      console.log(`   - ${func}`);
    });
    
    console.log('\n💡 **ROOT CAUSE:**');
    console.log('The conversation system requires PostgreSQL RPC functions that are missing from your database.');
    console.log('This explains why:');
    console.log('1. Conversations are not being saved');
    console.log('2. Messages are not being persisted');
    console.log('3. Delete buttons have nothing to delete');
    console.log('4. AI responses are regenerated each time');
    
    console.log('\n🔧 **SOLUTION:**');
    console.log('You need to run SQL migration scripts to create the missing database functions.');
    console.log('Look for files like:');
    console.log('- sql/create_conversation_functions.sql');
    console.log('- sql/add_message_bookmarking.sql');
    console.log('Run these in your Supabase SQL editor.');
    
  } else {
    console.log('✅ **All Required Functions Exist**\n');
    console.log('The RPC functions are available. The issue might be:');
    console.log('1. Authentication problems preventing function calls');
    console.log('2. RLS policies blocking data access');
    console.log('3. Frontend not calling the API correctly');
    console.log('4. Environment variable issues');
  }
}

async function main() {
  await checkDatabaseTables();
  const testResults = await testAllRequiredFunctions();
  await generateReport(testResults);
}

main().catch(console.error); 