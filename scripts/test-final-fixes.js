const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFinalFixes() {
  console.log('🧪 TESTING FINAL FIXES');
  console.log('='.repeat(50));

  try {
    // Test 1: Check if duplicate detection is now working
    console.log('\n🔍 TEST 1: Duplicate Detection Fix');
    console.log('-'.repeat(30));

    // Get a real user ID from existing data
    const { data: users, error: userError } = await supabase
      .from('regulation_search_history')
      .select('user_id')
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.log('⚠️ No existing users found, skipping duplicate test');
    } else {
      const userId = users[0].user_id;
      console.log('📋 Testing with user:', userId);
      
      // Check the duplicate detection query (this should not cause 406 error now)
      const testSearchTerm = 'Test search for duplicate detection';
      
      const { data: existing, error: selectError } = await supabase
        .from('regulation_search_history')
        .select('id, updated_at')
        .eq('user_id', userId)
        .eq('search_term', testSearchTerm)
        .maybeSingle();

      if (selectError) {
        console.log('❌ Duplicate check still has error:', selectError.message);
      } else {
        console.log('✅ Duplicate check working - found:', existing ? 'existing record' : 'no record');
      }
    }

    // Test 2: Check conversation_id in search history
    console.log('\n🔍 TEST 2: Conversation ID in History');
    console.log('-'.repeat(30));

    const { data: historyWithConversations, error: histError } = await supabase
      .from('regulation_search_history')
      .select('id, search_term, conversation_id, created_at')
      .not('conversation_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(3);

    if (histError) {
      console.log('❌ Error fetching history with conversations:', histError.message);
    } else {
      console.log(`✅ Found ${historyWithConversations.length} history items with conversation_id:`);
      historyWithConversations.forEach(item => {
        console.log(`   - "${item.search_term}" → conversation ${item.conversation_id}`);
      });
    }

    // Test 3: Check conversation loading API
    console.log('\n🔍 TEST 3: Conversation Loading API');
    console.log('-'.repeat(30));

    if (historyWithConversations && historyWithConversations.length > 0) {
      const testConversationId = historyWithConversations[0].conversation_id;
      console.log('📖 Testing conversation loading for ID:', testConversationId);

      // Test the API endpoint directly
      try {
        const response = await fetch(`http://localhost:3002/api/regulation/chat?action=conversation-history&conversation_id=${testConversationId}`);
        const data = await response.json();

        console.log('🌐 API Response status:', response.status);
        if (data.success) {
          console.log(`✅ API returned ${data.data.length} messages for conversation ${testConversationId}`);
        } else {
          console.log('❌ API failed:', data.error);
        }
      } catch (apiError) {
        console.log('❌ API test failed:', apiError.message);
      }
    } else {
      console.log('⚠️ No conversations with IDs found to test API');
    }

    // Test 4: Check recent searches and their conversation_ids
    console.log('\n🔍 TEST 4: Recent Search History Structure');
    console.log('-'.repeat(30));

    const { data: recentHistory, error: recentError } = await supabase
      .from('regulation_search_history')
      .select('id, search_term, conversation_id, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.log('❌ Error fetching recent history:', recentError.message);
    } else {
      console.log(`📊 Recent ${recentHistory.length} search history items:`);
      recentHistory.forEach(item => {
        const convStatus = item.conversation_id ? `✅ conv:${item.conversation_id}` : '❌ no conv_id';
        console.log(`   - "${item.search_term.substring(0, 40)}..." ${convStatus}`);
      });
    }

    console.log('\n🎯 SUMMARY:');
    console.log('1. Duplicate detection should now work without 406 errors');
    console.log('2. History items should have conversation_id values');
    console.log('3. API endpoint should load conversation messages');
    console.log('4. Frontend debugging will show exact click behavior');
    
    console.log('\n✨ Next: Test the frontend by making a search and clicking history!');

  } catch (error) {
    console.error('❌ Unexpected error during testing:', error);
  }
}

// Run the test
testFinalFixes().catch(console.error); 