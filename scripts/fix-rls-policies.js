const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const fixRlsPolicies = async () => {
  console.log('🔧 Fixing RLS policies for regulation_messages...');
  
  try {
    // Since we can't execute raw SQL through the client easily, 
    // let's try to test the current issue first
    console.log('Testing current database connection...');
    
    // Test getting conversations
    const { data: conversations, error: convError } = await supabase
      .from('regulation_conversations')
      .select('*')
      .limit(1);
    
    if (convError) {
      console.error('Error getting conversations:', convError);
    } else {
      console.log('✅ Conversations table accessible');
      console.log('Sample conversation:', conversations[0]);
    }
    
    // Test getting messages
    const { data: messages, error: msgError } = await supabase
      .from('regulation_messages')
      .select('*')
      .limit(1);
    
    if (msgError) {
      console.error('Error getting messages:', msgError);
    } else {
      console.log('✅ Messages table accessible');
      console.log('Sample message:', messages[0]);
    }
    
    // Test the RPC function that's causing the issue
    console.log('Testing get_conversation_messages function...');
    const testConversationId = conversations && conversations.length > 0 ? conversations[0].id : 2;
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_conversation_messages', {
        conversation_id_param: testConversationId,
        user_id_param: '12345678-1234-1234-1234-123456789012'
      });
    
    if (rpcError) {
      console.error('❌ RPC Error:', rpcError);
      console.log('This confirms the ambiguous column issue');
    } else {
      console.log('✅ RPC function works');
    }
    
    console.log('\n📋 To fix this issue, you need to run the SQL in sql/fix_rls_ambiguous_columns.sql');
    console.log('You can do this through the Supabase dashboard SQL editor or by running:');
    console.log('supabase db push --local (if Docker is running)');
    
  } catch (error) {
    console.error('Error testing database:', error);
  }
};

fixRlsPolicies(); 