const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConversationLoading() {
  console.log('🧪 TESTING CONVERSATION LOADING FRONTEND FIXES');
  console.log('='.repeat(50));

  try {
    // Test 1: Check if we have conversations in the database
    console.log('\n📋 Step 1: Check for existing conversations...');
    const { data: conversations, error: convError } = await supabase
      .from('regulation_conversations')
      .select('id, title, message_count, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
      return;
    }

    console.log(`✅ Found ${conversations.length} conversations:`);
    conversations.forEach(conv => {
      console.log(`   - ID: ${conv.id}, Title: "${conv.title}", Messages: ${conv.message_count}, Created: ${conv.created_at}`);
    });

    if (conversations.length === 0) {
      console.log('ℹ️  No conversations found. The user needs to create a conversation first.');
      return;
    }

    // Test 2: Test the conversation history API endpoint for the most recent conversation
    const testConvId = conversations[0].id;
    console.log(`\n🔍 Step 2: Testing conversation history API for conversation ${testConvId}...`);
    
    // Test the actual API endpoint that the frontend will call
    const testUrl = `http://localhost:3001/api/regulation/chat?action=conversation-history&conversation_id=${testConvId}`;
    console.log(`📡 Testing: GET ${testUrl}`);

    try {
      const response = await fetch(testUrl);
      const data = await response.json();

      if (response.ok && data.success) {
        console.log(`✅ API Response successful! Found ${data.data.length} messages:`);
        data.data.forEach((msg, index) => {
          console.log(`   ${index + 1}. ${msg.role}: "${msg.content.substring(0, 50)}..." (created_at: ${msg.created_at})`);
        });

        // Test 3: Verify frontend timestamp mapping will work
        console.log('\n🕐 Step 3: Testing timestamp mapping...');
        data.data.forEach(msg => {
          if (msg.created_at) {
            const timestamp = new Date(msg.created_at);
            console.log(`   ✅ Message ${msg.id}: created_at="${msg.created_at}" → Date: ${timestamp.toISOString()}`);
          } else {
            console.log(`   ❌ Message ${msg.id}: Missing created_at field!`);
          }
        });

      } else {
        console.error(`❌ API Error: ${response.status}`, data);
      }
    } catch (fetchError) {
      console.error('❌ Fetch error (is the dev server running on localhost:3001?):', fetchError.message);
    }

    // Test 4: Check if unified history contains conversation_id
    console.log('\n🔗 Step 4: Checking if unified history contains conversation_id...');
    const { data: historyData, error: historyError } = await supabase
      .from('regulation_search_history')
      .select('id, search_term, conversation_id, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (historyError) {
      console.error('❌ Error fetching history:', historyError);
    } else {
      console.log(`✅ Found ${historyData.length} history items:`);
      historyData.forEach(item => {
        const hasConvId = item.conversation_id ? '✅ YES' : '❌ NO';
        console.log(`   - ID: ${item.id}, Term: "${item.search_term}", conversation_id: ${item.conversation_id || 'null'} ${hasConvId}`);
      });
    }

    console.log('\n🎯 FRONTEND TESTING RECOMMENDATIONS:');
    console.log('1. Start the dev server: npm run dev');
    console.log('2. Navigate to /regulation page');
    console.log('3. Look at History & Bookmarks panel');
    console.log('4. Click on a recent search item');
    console.log('5. Expected: If conversation_id exists → instant load, no regeneration');
    console.log('6. Expected: If no conversation_id → fallback to regeneration');
    
    console.log('\n✅ CONVERSATION LOADING TEST COMPLETE');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testConversationLoading().catch(console.error); 