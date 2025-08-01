const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 SERVICE ROLE AUTHENTICATION TEST');
console.log('===================================\n');

// Test user ID from logs
const TEST_USER_ID = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5';

async function testServiceRoleAuth() {
  console.log('🔧 Environment Check:');
  console.log('📍 Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('📍 Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  console.log('📍 Service Role Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  console.log('');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  // Test 1: Try with anon key (should fail due to RLS)
  console.log('🧪 Test 1: Anon Key (Expected to fail due to RLS)');
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error } = await anonClient
      .from('regulation_conversations')
      .insert({
        user_id: TEST_USER_ID,
        title: 'Test - Anon Key',
        status: 'active'
      })
      .select('id')
      .single();

    if (error) {
      console.log('✅ Expected RLS error with anon key:', error.message);
    } else {
      console.log('⚠️ Unexpected success with anon key:', data);
    }
  } catch (err) {
    console.log('✅ Expected error with anon key:', err.message);
  }
  console.log('');

  // Test 2: Try with service role key (should bypass RLS)
  console.log('🧪 Test 2: Service Role Key (Should bypass RLS)');
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  
  let conversationId = null;
  try {
    const { data, error } = await serviceClient
      .from('regulation_conversations')
      .insert({
        user_id: TEST_USER_ID,
        title: 'Test - Service Role Key',
        status: 'active'
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Service role key failed:', error.message);
      console.error('❌ This indicates the service role key is not working properly');
      return false;
    } else {
      conversationId = data.id;
      console.log('✅ Service role key worked! Created conversation:', conversationId);
    }
  } catch (err) {
    console.error('❌ Service role key crashed:', err.message);
    return false;
  }

  // Test 3: Verify the conversation was created
  if (conversationId) {
    console.log('');
    console.log('🔍 Test 3: Verify conversation exists');
    try {
      const { data, error } = await serviceClient
        .from('regulation_conversations')
        .select('id, title, user_id, created_at')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('❌ Failed to verify conversation:', error.message);
      } else {
        console.log('✅ Conversation verified:', data);
      }
    } catch (err) {
      console.error('❌ Verification failed:', err.message);
    }

    // Cleanup
    console.log('');
    console.log('🧹 Cleanup: Removing test conversation...');
    try {
      await serviceClient
        .from('regulation_conversations')
        .delete()
        .eq('id', conversationId);
      console.log('✅ Test conversation cleaned up');
    } catch (cleanupErr) {
      console.error('⚠️ Cleanup failed:', cleanupErr.message);
    }
  }

  return true;
}

async function testActualRegulationChatService() {
  console.log('');
  console.log('🧪 Test 4: Simulate RegulationChatService behavior');
  console.log('================================================');
  
  // This simulates exactly what RegulationChatService does
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  
  let conversationId = null;
  try {
    // Exact same insert as in RegulationChatService.createConversation()
    const { data, error } = await serviceClient
      .from('regulation_conversations')
      .insert({
        user_id: TEST_USER_ID,
        title: 'Test RegulationChatService Simulation',
        status: 'active'
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ RegulationChatService simulation failed:', error.message);
      console.error('❌ Error details:', error);
      return false;
    }

    conversationId = data.id;
    console.log('✅ RegulationChatService simulation succeeded!');
    console.log('📊 Created conversation ID:', conversationId);

    // Cleanup
    await serviceClient
      .from('regulation_conversations')
      .delete()
      .eq('id', conversationId);
    console.log('✅ Cleanup completed');

    return true;
  } catch (err) {
    console.error('❌ RegulationChatService simulation crashed:', err.message);
    return false;
  }
}

// Run all tests
(async () => {
  try {
    const serviceRoleWorked = await testServiceRoleAuth();
    if (serviceRoleWorked) {
      const simulationWorked = await testActualRegulationChatService();
      
      console.log('');
      console.log('='.repeat(50));
      if (simulationWorked) {
        console.log('🎉 ALL TESTS PASSED!');
        console.log('✅ Service role key is working correctly');
        console.log('✅ The issue is NOT with authentication/RLS');
        console.log('🔍 Need to investigate why the actual app fails');
      } else {
        console.log('❌ SERVICE ROLE KEY ISSUES DETECTED');
        console.log('🔧 Check environment variables and Supabase configuration');
      }
      console.log('='.repeat(50));
    }
  } catch (error) {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  }
})(); 