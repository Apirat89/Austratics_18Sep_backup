const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugConversationFlow() {
  console.log('🔍 COMPREHENSIVE CONVERSATION FLOW DEBUGGING');
  console.log('='.repeat(60));

  try {
    // Step 1: Check current database state
    console.log('\n📋 STEP 1: Current Database State');
    console.log('-'.repeat(40));

    // Check conversations
    const { data: conversations, error: convError } = await supabase
      .from('regulation_conversations')
      .select('id, title, message_count, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
      return;
    }

    console.log(`📊 Recent Conversations (${conversations.length}):`);
    conversations.forEach(conv => {
      console.log(`   - ID: ${conv.id}, Title: "${conv.title}", Messages: ${conv.message_count}`);
      console.log(`     Created: ${conv.created_at}, Updated: ${conv.updated_at}`);
    });

    // Check messages for latest conversation
    if (conversations.length > 0) {
      const latestConvId = conversations[0].id;
      console.log(`\n📨 Messages for conversation ${latestConvId}:`);
      
      const { data: messages, error: msgError } = await supabase
        .from('regulation_messages')
        .select('id, role, content, created_at, conversation_id')
        .eq('conversation_id', latestConvId)
        .order('message_index', { ascending: true });

      if (msgError) {
        console.error('❌ Error fetching messages:', msgError);
      } else {
        console.log(`   Found ${messages.length} messages:`);
        messages.forEach((msg, idx) => {
          console.log(`   ${idx + 1}. ${msg.role}: "${msg.content.substring(0, 50)}..." (${msg.created_at})`);
        });
      }
    }

    // Check search history
    console.log('\n📚 Recent Search History:');
    const { data: history, error: histError } = await supabase
      .from('regulation_search_history')
      .select('id, search_term, conversation_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (histError) {
      console.error('❌ Error fetching history:', histError);
    } else {
      console.log(`   Found ${history.length} history entries:`);
      history.forEach((item, idx) => {
        const hasConvId = item.conversation_id ? `✅ (conv: ${item.conversation_id})` : '❌ (no conv_id)';
        console.log(`   ${idx + 1}. "${item.search_term}" ${hasConvId}`);
      });
    }

    // Step 2: Simulate the frontend conversation flow
    console.log('\n🔄 STEP 2: Simulating Frontend Flow');
    console.log('-'.repeat(40));

    // Test the API endpoints that the frontend calls
    const testQuestion = 'What are the basic requirements for aged care providers?';
    console.log(`📝 Testing with question: "${testQuestion}"`);

    // Step 2a: Test conversation creation
    console.log('\n🆕 Testing conversation creation...');
    const createResponse = await fetch('http://localhost:3001/api/regulation/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create-conversation',
        title: testQuestion.slice(0, 50),
        first_message: testQuestion
      })
    });

    const createData = await createResponse.json();
    if (createResponse.ok && createData.success) {
      const newConvId = createData.data.conversation_id;
      console.log(`✅ Conversation created successfully: ID ${newConvId}`);

      // Step 2b: Test message sending
      console.log('\n💬 Testing message sending...');
      const messageResponse = await fetch('http://localhost:3001/api/regulation/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: testQuestion,
          conversation_id: newConvId,
          conversation_history: []
        })
      });

      const messageData = await messageResponse.json();
      if (messageResponse.ok && messageData.success) {
        console.log(`✅ Message sent successfully`);
        console.log(`   Response length: ${messageData.data.message.length} chars`);
        console.log(`   Citations: ${messageData.data.citations.length}`);
        console.log(`   Conversation ID in response: ${messageData.data.conversation_id}`);

        // Step 2c: Verify messages were saved
        console.log('\n🔍 Verifying messages were saved...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

        const { data: newMessages, error: newMsgError } = await supabase
          .from('regulation_messages')
          .select('id, role, content, created_at')
          .eq('conversation_id', newConvId)
          .order('message_index', { ascending: true });

        if (newMsgError) {
          console.error('❌ Error fetching new messages:', newMsgError);
        } else {
          console.log(`✅ Found ${newMessages.length} messages in conversation ${newConvId}:`);
          newMessages.forEach((msg, idx) => {
            console.log(`   ${idx + 1}. ${msg.role}: "${msg.content.substring(0, 50)}..."`);
          });

          if (newMessages.length === 2) {
            console.log('✅ SUCCESS: Both user and assistant messages saved!');
          } else {
            console.log('❌ ISSUE: Expected 2 messages, found ' + newMessages.length);
          }
        }

        // Step 2d: Check if history was created with conversation_id
        console.log('\n📖 Checking if history was created with conversation_id...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

        const { data: newHistory, error: newHistError } = await supabase
          .from('regulation_search_history')
          .select('id, search_term, conversation_id, created_at')
          .eq('search_term', testQuestion)
          .order('created_at', { ascending: false })
          .limit(3);

        if (newHistError) {
          console.error('❌ Error fetching new history:', newHistError);
        } else {
          console.log(`📊 Found ${newHistory.length} history entries for this search:`);
          newHistory.forEach((item, idx) => {
            const convInfo = item.conversation_id ? 
              `✅ conversation_id: ${item.conversation_id}` : 
              '❌ NO conversation_id';
            console.log(`   ${idx + 1}. "${item.search_term}" - ${convInfo}`);
          });

          // Check for duplicates
          if (newHistory.length > 1) {
            console.log('⚠️  DUPLICATE ISSUE: Multiple history entries found for same search!');
            console.log('   This explains why 1 search creates 2 history items.');
          } else {
            console.log('✅ No duplicates found for this search.');
          }
        }

        // Step 2e: Test conversation history loading
        console.log('\n📚 Testing conversation history loading...');
        const historyResponse = await fetch(`http://localhost:3001/api/regulation/chat?action=conversation-history&conversation_id=${newConvId}`);
        const historyData = await historyResponse.json();

        if (historyResponse.ok && historyData.success) {
          console.log(`✅ Conversation history loaded: ${historyData.data.length} messages`);
          historyData.data.forEach((msg, idx) => {
            console.log(`   ${idx + 1}. ${msg.role}: "${msg.content.substring(0, 50)}..." (${msg.created_at})`);
          });
        } else {
          console.log('❌ Failed to load conversation history:', historyData.error);
        }

      } else {
        console.log('❌ Failed to send message:', messageData.error);
      }
    } else {
      console.log('❌ Failed to create conversation:', createData.error);
    }

    // Step 3: Analysis and recommendations
    console.log('\n📊 STEP 3: Analysis & Recommendations');
    console.log('-'.repeat(40));

    console.log('\n🔍 ISSUE ANALYSIS:');
    console.log('1. DUPLICATE HISTORY: Check if saveRegulationSearchToHistory is called multiple times');
    console.log('2. CONVERSATION SAVING: Check if conversation_id is properly linked to history');
    console.log('3. FRONTEND LOADING: Check if handleSearchSelect uses conversation_id correctly');

    console.log('\n✅ TESTING COMPLETE - Check the output above for specific issues!');

  } catch (error) {
    console.error('❌ Unexpected error during debugging:', error);
  }
}

// Run the comprehensive debugging
debugConversationFlow().catch(console.error); 