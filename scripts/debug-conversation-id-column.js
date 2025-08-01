const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugConversationIdColumn() {
  console.log('🔍 DEBUGGING: conversation_id Column in regulation_search_history');
  console.log('='.repeat(60));

  try {
    // Test if conversation_id column exists by trying to select it
    console.log('\n1. CHECKING conversation_id COLUMN:');
    let hasConversationId = false;
    try {
      const { data: testRecord, error: testError } = await supabase
        .from('regulation_search_history')
        .select('conversation_id')
        .limit(1);
      
      if (testError && testError.message.includes('column "conversation_id" does not exist')) {
        console.log('❌ CRITICAL ISSUE: conversation_id column does NOT exist!');
        console.log('🔧 SOLUTION: Run the database migration to add the column');
        return;
      } else {
        hasConversationId = true;
        console.log('✅ conversation_id column exists');
      }
    } catch (error) {
      console.error('❌ Error testing conversation_id column:', error.message);
      return;
    }

    // Check recent records with conversation_id values
    console.log('\n2. CHECKING RECENT RECORDS:');
    const { data: recentRecords, error: recordsError } = await supabase
      .from('regulation_search_history')
      .select('id, search_term, conversation_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recordsError) {
      console.error('❌ Records check failed:', recordsError.message);
      return;
    }

    console.log(`📋 Recent ${recentRecords.length} records:`);
    recentRecords.forEach(record => {
      const cidStatus = record.conversation_id ? `✅ ${record.conversation_id}` : '❌ NULL';
      console.log(`   ID ${record.id}: "${record.search_term.substring(0, 40)}..." → conversation_id: ${cidStatus}`);
    });

    // Count records with and without conversation_id
    console.log('\n3. CONVERSATION ID STATISTICS:');
    
    const { count: totalCount } = await supabase
      .from('regulation_search_history')
      .select('*', { count: 'exact', head: true });

    const { count: withConversationId } = await supabase
      .from('regulation_search_history')
      .select('*', { count: 'exact', head: true })
      .not('conversation_id', 'is', null);

    const { count: withoutConversationId } = await supabase
      .from('regulation_search_history')
      .select('*', { count: 'exact', head: true })
      .is('conversation_id', null);

    console.log(`📊 Total records: ${totalCount}`);
    console.log(`✅ With conversation_id: ${withConversationId}`);
    console.log(`❌ Without conversation_id: ${withoutConversationId}`);

    if (withConversationId === 0) {
      console.log('\n🚨 CRITICAL ISSUE: NO records have conversation_id values!');
      console.log('🔧 SOLUTION: conversation_id is not being saved during history creation');
    }

    // Check if conversations table has records
    console.log('\n4. CHECKING CONVERSATIONS TABLE:');
    const { count: conversationsCount } = await supabase
      .from('regulation_conversations')
      .select('*', { count: 'exact', head: true });

    console.log(`💬 Total conversations: ${conversationsCount}`);

    if (conversationsCount > 0 && withConversationId === 0) {
      console.log('\n🎯 ROOT CAUSE IDENTIFIED:');
      console.log('- ✅ Conversations are being created');
      console.log('- ❌ conversation_id is NOT being saved to search history');
      console.log('- 🔧 Fix needed in saveRegulationSearchToHistory() function');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the diagnostic
debugConversationIdColumn().catch(console.error); 