const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabaseSchema() {
  console.log('🔍 CONVERSATION SCHEMA VALIDATION TEST');
  console.log('=====================================\n');

  let allTestsPassed = true;

  // Test 1: Check regulation_conversations table
  console.log('📋 Test 1: Checking regulation_conversations table...');
  try {
    const { data, error } = await supabase
      .from('regulation_conversations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ regulation_conversations table error:', error.message);
      allTestsPassed = false;
    } else {
      console.log('✅ regulation_conversations table exists and is accessible');
      console.log('📊 Sample structure:', data.length > 0 ? Object.keys(data[0]) : 'No data to show structure');
    }
  } catch (err) {
    console.error('❌ regulation_conversations table test failed:', err.message);
    allTestsPassed = false;
  }

  // Test 2: Check regulation_messages table
  console.log('\n📋 Test 2: Checking regulation_messages table...');
  try {
    const { data, error } = await supabase
      .from('regulation_messages')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ regulation_messages table error:', error.message);
      allTestsPassed = false;
    } else {
      console.log('✅ regulation_messages table exists and is accessible');
      console.log('📊 Sample structure:', data.length > 0 ? Object.keys(data[0]) : 'No data to show structure');
    }
  } catch (err) {
    console.error('❌ regulation_messages table test failed:', err.message);
    allTestsPassed = false;
  }

  // Test 3: Check add_message_to_conversation RPC function
  console.log('\n🔧 Test 3: Checking add_message_to_conversation RPC function...');
  try {
    // Test with minimal parameters to see if function exists
    const { data, error } = await supabase
      .rpc('add_message_to_conversation', {
        p_conversation_id: '00000000-0000-0000-0000-000000000000', // fake UUID
        p_content: 'test',
        p_role: 'user',
        p_user_id: '00000000-0000-0000-0000-000000000000' // fake UUID
      });
    
    if (error) {
      // We expect this to fail due to fake data, but if it's a "function doesn't exist" error, that's bad
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.error('❌ add_message_to_conversation RPC function does not exist:', error.message);
        allTestsPassed = false;
      } else {
        console.log('✅ add_message_to_conversation RPC function exists (expected error with fake data)');
        console.log('📝 Error (expected):', error.message);
      }
    } else {
      console.log('✅ add_message_to_conversation RPC function exists and responded');
      console.log('📊 Response:', data);
    }
  } catch (err) {
    console.error('❌ add_message_to_conversation RPC test failed:', err.message);
    allTestsPassed = false;
  }

  // Test 4: Check get_conversation_messages RPC function
  console.log('\n🔧 Test 4: Checking get_conversation_messages RPC function...');
  try {
    const { data, error } = await supabase
      .rpc('get_conversation_messages', {
        conversation_id: '00000000-0000-0000-0000-000000000000' // fake UUID
      });
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.error('❌ get_conversation_messages RPC function does not exist:', error.message);
        allTestsPassed = false;
      } else {
        console.log('✅ get_conversation_messages RPC function exists');
        console.log('📝 Response with fake ID:', error.message || 'No error');
      }
    } else {
      console.log('✅ get_conversation_messages RPC function exists and responded');
      console.log('📊 Response:', data);
    }
  } catch (err) {
    console.error('❌ get_conversation_messages RPC test failed:', err.message);
    allTestsPassed = false;
  }

  // Test 5: Check for existing conversations (to understand current data state)
  console.log('\n📊 Test 5: Checking existing conversation data...');
  try {
    const { data: conversations, error: convError } = await supabase
      .from('regulation_conversations')
      .select('id, title, user_id, created_at')
      .limit(5);
    
    if (convError) {
      console.error('❌ Error fetching conversations:', convError.message);
    } else {
      console.log(`✅ Found ${conversations.length} existing conversations`);
      if (conversations.length > 0) {
        console.log('📋 Sample conversations:');
        conversations.forEach((conv, i) => {
          console.log(`  ${i + 1}. ID: ${conv.id}, Title: "${conv.title}", Created: ${conv.created_at}`);
        });
      }
    }

    // Check messages for first conversation if it exists
    if (conversations && conversations.length > 0) {
      const firstConvId = conversations[0].id;
      const { data: messages, error: msgError } = await supabase
        .from('regulation_messages')
        .select('id, content, role, created_at')
        .eq('conversation_id', firstConvId)
        .order('created_at', { ascending: true });
      
      if (msgError) {
        console.error('❌ Error fetching messages:', msgError.message);
      } else {
        console.log(`📝 Found ${messages.length} messages in first conversation`);
        if (messages.length > 0) {
          console.log('💬 Sample messages:');
          messages.forEach((msg, i) => {
            console.log(`  ${i + 1}. [${msg.role}]: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
          });
        }
      }
    }
  } catch (err) {
    console.error('❌ Existing data check failed:', err.message);
  }

  // Final result
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 ALL SCHEMA TESTS PASSED!');
    console.log('✅ Database schema appears to be correctly set up');
  } else {
    console.log('❌ SOME SCHEMA TESTS FAILED!');
    console.log('🔧 Database schema needs attention');
  }
  console.log('='.repeat(50));

  return allTestsPassed;
}

// Run the test
testDatabaseSchema()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Test script crashed:', error);
    process.exit(1);
  }); 