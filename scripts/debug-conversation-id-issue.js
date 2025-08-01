const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugConversationIdIssue() {
  console.log('🔍 DEBUGGING CONVERSATION_ID FOREIGN KEY ISSUE');
  console.log('='.repeat(60));

  try {
    // Step 1: Check existing conversations
    console.log('\n📋 STEP 1: Check Existing Conversations');
    console.log('-'.repeat(40));

    const { data: conversations, error: convError } = await supabase
      .from('regulation_conversations')
      .select('id, title, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(5);

    if (convError) {
      console.error('❌ Error fetching conversations:', convError);
    } else {
      console.log(`✅ Found ${conversations.length} conversations:`);
      conversations.forEach(conv => {
        console.log(`   - ID: ${conv.id}, Title: "${conv.title}", User: ${conv.user_id}`);
      });
    }

    // Step 2: Check recent search history
    console.log('\n📚 STEP 2: Check Recent Search History');
    console.log('-'.repeat(40));

    const { data: history, error: histError } = await supabase
      .from('regulation_search_history')
      .select('id, search_term, conversation_id, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (histError) {
      console.error('❌ Error fetching history:', histError);
    } else {
      console.log(`✅ Found ${history.length} history entries:`);
      history.forEach(item => {
        const convStatus = item.conversation_id ? `conv_id: ${item.conversation_id}` : 'NO conv_id';
        console.log(`   - "${item.search_term}" - ${convStatus}, User: ${item.user_id}`);
      });
    }

    // Step 3: Check for orphaned conversation_ids
    console.log('\n🔍 STEP 3: Check for Orphaned Conversation IDs');
    console.log('-'.repeat(40));

    const { data: orphaned, error: orphanError } = await supabase
      .from('regulation_search_history')
      .select(`
        id, 
        search_term, 
        conversation_id,
        regulation_conversations!left(id, title)
      `)
      .not('conversation_id', 'is', null);

    if (orphanError) {
      console.error('❌ Error checking orphaned IDs:', orphanError);
    } else {
      console.log(`📊 Checked ${orphaned.length} history entries with conversation_id:`);
      const orphanedEntries = orphaned.filter(item => !item.regulation_conversations);
      
      if (orphanedEntries.length > 0) {
        console.log(`⚠️  Found ${orphanedEntries.length} ORPHANED entries:`);
        orphanedEntries.forEach(item => {
          console.log(`   - History ID: ${item.id}, conversation_id: ${item.conversation_id} (MISSING)`);
        });
      } else {
        console.log('✅ No orphaned conversation_ids found');
      }
    }

    // Step 4: Check foreign key constraint details
    console.log('\n🔧 STEP 4: Check Foreign Key Constraint');
    console.log('-'.repeat(40));

    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'regulation_search_history')
      .eq('constraint_type', 'FOREIGN KEY');

    if (constraintError) {
      console.error('❌ Error checking constraints:', constraintError);
    } else {
      console.log(`✅ Found ${constraints.length} foreign key constraints:`);
      constraints.forEach(constraint => {
        console.log(`   - ${constraint.constraint_name}: ${constraint.constraint_type}`);
      });
    }

    // Step 5: Test conversation creation manually
    console.log('\n🧪 STEP 5: Test Manual Conversation Creation');
    console.log('-'.repeat(40));

    // Create a test conversation
    const { data: testConv, error: createError } = await supabase
      .from('regulation_conversations')
      .insert({
        title: 'Test Conversation for Debug',
        user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
        message_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (createError) {
      console.error('❌ Error creating test conversation:', createError);
    } else {
      console.log(`✅ Created test conversation with ID: ${testConv.id}`);

      // Try to create history entry with this conversation_id
      const { data: testHist, error: histCreateError } = await supabase
        .from('regulation_search_history')
        .insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          search_term: 'Test search for debug',
          conversation_id: testConv.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (histCreateError) {
        console.error('❌ Error creating test history:', histCreateError);
      } else {
        console.log(`✅ Successfully created test history with ID: ${testHist.id}`);
        
        // Clean up test data
        await supabase.from('regulation_search_history').delete().eq('id', testHist.id);
        await supabase.from('regulation_conversations').delete().eq('id', testConv.id);
        console.log('✅ Cleaned up test data');
      }
    }

    console.log('\n🎯 SUMMARY:');
    console.log('- Check the console output above for specific issues');
    console.log('- Look for orphaned conversation_ids or constraint violations');
    console.log('- The test creation should reveal if the constraint is working properly');

  } catch (error) {
    console.error('❌ Unexpected error during debugging:', error);
  }
}

// Run the debugging
debugConversationIdIssue().catch(console.error); 