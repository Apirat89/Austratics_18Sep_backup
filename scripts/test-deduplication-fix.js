const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Simulate the getUnifiedSearchHistory logic with deduplication
async function testDeduplicationFix() {
  console.log('🔧 TESTING DEDUPLICATION FIX');  
  console.log('='.repeat(60));

  const userId = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5';
  const limit = 20;

  try {
    // Get old search history (past 2 weeks)
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    
    const oldHistoryPromise = supabase
      .from('regulation_search_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', twoWeeksAgo)
      .order('updated_at', { ascending: false })
      .limit(Math.ceil(limit / 2));

    // Get conversation messages (user messages only, past 2 weeks)
    const conversationHistoryPromise = supabase
      .from('regulation_messages')
      .select(`
        id,
        conversation_id,
        content,
        message_index,
        created_at,
        search_intent,
        is_bookmarked,
        regulation_conversations!inner(
          title
        )
      `)
      .eq('regulation_conversations.user_id', userId)
      .eq('role', 'user')
      .gte('created_at', twoWeeksAgo)
      .order('created_at', { ascending: false })
      .limit(Math.ceil(limit / 2));

    const [oldHistoryResult, conversationResult] = await Promise.all([
      oldHistoryPromise,
      conversationHistoryPromise
    ]);

    if (oldHistoryResult.error) console.error('Error fetching old history:', oldHistoryResult.error);
    if (conversationResult.error) console.error('Error fetching conversations:', conversationResult.error);

    const unifiedItems = [];

    // Add old search history items
    if (oldHistoryResult.data) {
      for (const item of oldHistoryResult.data) {
        unifiedItems.push({
          ...item,
          source_type: 'search_history'
        });
      }
    }

    // Add conversation messages as history items
    if (conversationResult.data) {
      for (const msg of conversationResult.data) {
        const conversationData = msg.regulation_conversations;
        unifiedItems.push({
          id: msg.id,
          user_id: userId,
          search_term: msg.content,
          response_preview: msg.search_intent || undefined,
          citations_count: undefined,
          document_types: undefined,
          processing_time: undefined,
          created_at: msg.created_at,
          updated_at: msg.created_at,
          source_type: 'conversation_message',
          conversation_id: msg.conversation_id,
          message_id: msg.id,
          conversation_title: conversationData?.title || 'Untitled Conversation',
          is_bookmarked: msg.is_bookmarked
        });
      }
    }

    console.log(`\n📊 BEFORE DEDUPLICATION:`);
    console.log(`   📋 Search history items: ${oldHistoryResult.data?.length || 0}`);
    console.log(`   💬 Conversation messages: ${conversationResult.data?.length || 0}`);
    console.log(`   📈 Total unified items: ${unifiedItems.length}`);

    // Show items before deduplication
    console.log(`\n🔍 ITEMS BEFORE DEDUPLICATION:`);
    unifiedItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.source_type}: "${item.search_term}" (ConvoID: ${item.conversation_id || 'none'})`);
    });

    // Apply deduplication logic (from the fixed function)
    const deduplicatedItems = [];
    const seenConversationIds = new Set();
    const itemsWithoutConversation = [];

    // First pass: collect items with conversation_id, preferring search_history
    for (const item of unifiedItems) {
      if (item.conversation_id) {
        if (!seenConversationIds.has(item.conversation_id)) {
          seenConversationIds.add(item.conversation_id);
          // Prefer search_history source over conversation_message
          if (item.source_type === 'search_history') {
            deduplicatedItems.push(item);
          } else {
            // Check if we already have a search_history for this conversation
            const existingIndex = deduplicatedItems.findIndex(
              existing => existing.conversation_id === item.conversation_id && existing.source_type === 'search_history'
            );
            if (existingIndex === -1) {
              deduplicatedItems.push(item);
            }
          }
        }
      } else {
        // Items without conversation_id (legacy items)
        itemsWithoutConversation.push(item);
      }
    }

    // Add items without conversation_id
    deduplicatedItems.push(...itemsWithoutConversation);

    // Sort by created_at descending
    deduplicatedItems.sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    });

    console.log(`\n📊 AFTER DEDUPLICATION:`);
    console.log(`   📈 Total items: ${deduplicatedItems.length}`);
    console.log(`   🗑️ Removed duplicates: ${unifiedItems.length - deduplicatedItems.length}`);

    // Show items after deduplication
    console.log(`\n✅ ITEMS AFTER DEDUPLICATION:`);
    deduplicatedItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.source_type}: "${item.search_term}" (ConvoID: ${item.conversation_id || 'none'})`);
    });

    console.log(`\n🎯 EXPECTED RESULT:`);
    if (unifiedItems.length > deduplicatedItems.length) {
      console.log(`✅ DEDUPLICATION WORKING: Removed ${unifiedItems.length - deduplicatedItems.length} duplicate(s)`);
      console.log(`✅ Each conversation appears only once in history list`);
    } else {
      console.log(`ℹ️ NO DUPLICATES TO REMOVE: All items were unique`);
    }

  } catch (error) {
    console.error('Error testing deduplication:', error);
  }
}

// Run the test
testDeduplicationFix().catch(console.error); 