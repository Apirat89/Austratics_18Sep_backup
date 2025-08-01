const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test user ID (you should replace this with a real user ID from your auth system)
const TEST_USER_ID = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5'; // From the logs you showed earlier

async function testConversationSaving() {
  console.log('🧪 CONVERSATION SAVING TEST');
  console.log('===========================\n');
  
  console.log('🔍 Using test user ID:', TEST_USER_ID);
  console.log('');

  let testPassed = true;
  let conversationId = null;

  try {
    // Step 1: Create a new conversation
    console.log('📝 Step 1: Creating new conversation...');
    const { data: conversation, error: convError } = await supabase
      .from('regulation_conversations')
      .insert({
        title: 'Test Conversation - Message Saving',
        user_id: TEST_USER_ID
      })
      .select()
      .single();

    if (convError) {
      console.error('❌ Failed to create conversation:', convError.message);
      testPassed = false;
      return;
    }

    conversationId = conversation.id;
    console.log('✅ Conversation created successfully!');
    console.log('📊 Conversation ID:', conversationId);
    console.log('📊 Conversation data:', conversation);
    console.log('');

    // Step 2: Add user message using RPC function
    console.log('👤 Step 2: Adding user message...');
    const userMessage = 'What are the key changes in the new Aged Care Act 2024?';
    
    const { data: userMsgResult, error: userMsgError } = await supabase
      .rpc('add_message_to_conversation', {
        p_conversation_id: conversationId,
        p_content: userMessage,
        p_role: 'user',
        p_user_id: TEST_USER_ID
      });

    if (userMsgError) {
      console.error('❌ Failed to add user message:', userMsgError.message);
      testPassed = false;
    } else {
      console.log('✅ User message added successfully!');
      console.log('📊 User message result:', userMsgResult);
    }
    console.log('');

    // Step 3: Add assistant message using RPC function
    console.log('🤖 Step 3: Adding assistant message...');
    const assistantMessage = 'The Aged Care Act 2024 introduces several key changes: 1) Enhanced rights-based approach, 2) New Support at Home program replacing existing programs, 3) Strengthened quality and safety standards, 4) Improved transparency in pricing and services.';
    
    const { data: assistantMsgResult, error: assistantMsgError } = await supabase
      .rpc('add_message_to_conversation', {
        p_conversation_id: conversationId,
        p_content: assistantMessage,
        p_role: 'assistant',
        p_user_id: TEST_USER_ID
      });

    if (assistantMsgError) {
      console.error('❌ Failed to add assistant message:', assistantMsgError.message);
      testPassed = false;
    } else {
      console.log('✅ Assistant message added successfully!');
      console.log('📊 Assistant message result:', assistantMsgResult);
    }
    console.log('');

    // Step 4: Verify messages were saved correctly
    console.log('🔍 Step 4: Verifying saved messages...');
    const { data: savedMessages, error: fetchError } = await supabase
      .from('regulation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Failed to fetch saved messages:', fetchError.message);
      testPassed = false;
    } else {
      console.log(`✅ Found ${savedMessages.length} saved messages`);
      
      if (savedMessages.length === 2) {
        console.log('✅ Correct number of messages saved!');
        
        // Verify user message
        const userMsg = savedMessages.find(m => m.role === 'user');
        if (userMsg && userMsg.content === userMessage) {
          console.log('✅ User message saved correctly');
        } else {
          console.error('❌ User message not saved correctly');
          testPassed = false;
        }
        
        // Verify assistant message
        const assistantMsg = savedMessages.find(m => m.role === 'assistant');
        if (assistantMsg && assistantMsg.content === assistantMessage) {
          console.log('✅ Assistant message saved correctly');
        } else {
          console.error('❌ Assistant message not saved correctly');
          testPassed = false;
        }
        
        console.log('\n💬 Saved Messages:');
        savedMessages.forEach((msg, i) => {
          console.log(`  ${i + 1}. [${msg.role}] ${msg.created_at}`);
          console.log(`     Content: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
        });
      } else {
        console.error(`❌ Expected 2 messages, but found ${savedMessages.length}`);
        testPassed = false;
      }
    }
    console.log('');

    // Step 5: Test message retrieval using RPC
    console.log('📖 Step 5: Testing message retrieval via RPC...');
    const { data: rpcMessages, error: rpcError } = await supabase
      .rpc('get_conversation_messages', {
        conversation_id: conversationId
      });

    if (rpcError) {
      console.error('❌ Failed to retrieve messages via RPC:', rpcError.message);
      testPassed = false;
    } else {
      console.log(`✅ RPC retrieved ${rpcMessages ? rpcMessages.length : 0} messages`);
      console.log('📊 RPC messages data:', rpcMessages);
    }

  } catch (error) {
    console.error('💥 Test crashed:', error.message);
    testPassed = false;
  }

  // Cleanup: Remove test conversation
  if (conversationId) {
    console.log('\n🧹 Cleanup: Removing test conversation...');
    try {
      // Delete messages first (due to foreign key constraints)
      await supabase
        .from('regulation_messages')
        .delete()
        .eq('conversation_id', conversationId);
      
      // Delete conversation
      await supabase
        .from('regulation_conversations')
        .delete()
        .eq('id', conversationId);
      
      console.log('✅ Test conversation cleaned up');
    } catch (cleanupError) {
      console.error('⚠️  Cleanup failed:', cleanupError.message);
    }
  }

  // Final result
  console.log('\n' + '='.repeat(50));
  if (testPassed) {
    console.log('🎉 CONVERSATION SAVING TEST PASSED!');
    console.log('✅ All conversation and message operations work correctly');
  } else {
    console.log('❌ CONVERSATION SAVING TEST FAILED!');
    console.log('🔧 There are issues with conversation/message saving');
  }
  console.log('='.repeat(50));

  return testPassed;
}

// Run the test
testConversationSaving()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Test script crashed:', error);
    process.exit(1);
  }); 