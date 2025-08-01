const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const testMessageSaving = async () => {
  console.log('🧪 Testing message saving functionality...');
  
  try {
    // Check existing messages in conversation 2
    console.log('\n📋 Checking existing messages in conversation 2:');
    const { data: messages, error } = await supabase
      .from('regulation_messages')
      .select('*')
      .eq('conversation_id', 2)
      .order('message_index', { ascending: true });
    
    if (error) {
      console.error('Error getting messages:', error);
      return;
    }
    
    console.log(`Found ${messages.length} messages:`);
    messages.forEach((msg, index) => {
      console.log(`${index + 1}. ${msg.role}: "${msg.content}" (${msg.created_at})`);
    });
    
    // Test adding a new assistant message
    console.log('\n🧪 Testing add_message_to_conversation function:');
    const testContent = 'This is a test assistant response';
    
    const { data: messageId, error: addError } = await supabase
      .rpc('add_message_to_conversation', {
        conversation_id_param: 2,
        role_param: 'assistant',
        content_param: testContent,
        citations_param: null,
        processing_time_param: 1000,
        search_intent_param: null
      });
    
    if (addError) {
      console.error('❌ Error adding message:', addError);
    } else {
      console.log('✅ Successfully added test message. ID:', messageId);
    }
    
    // Check messages again
    console.log('\n📋 Checking messages after adding test message:');
    const { data: updatedMessages, error: getError } = await supabase
      .from('regulation_messages')
      .select('*')
      .eq('conversation_id', 2)
      .order('message_index', { ascending: true });
    
    if (getError) {
      console.error('Error getting updated messages:', getError);
    } else {
      console.log(`Found ${updatedMessages.length} messages:`);
      updatedMessages.forEach((msg, index) => {
        console.log(`${index + 1}. ${msg.role}: "${msg.content}" (${msg.created_at})`);
      });
    }
    
    // Clean up test message
    if (messageId) {
      console.log('\n🧹 Cleaning up test message...');
      const { error: deleteError } = await supabase
        .from('regulation_messages')
        .delete()
        .eq('id', messageId);
      
      if (deleteError) {
        console.error('Error deleting test message:', deleteError);
      } else {
        console.log('✅ Test message cleaned up');
      }
    }
    
  } catch (error) {
    console.error('Error testing message saving:', error);
  }
};

testMessageSaving(); 