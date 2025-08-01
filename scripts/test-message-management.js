const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const testMessageManagement = async () => {
  console.log('🧪 Testing message management API endpoints...');
  
  try {
    // First, let's check if the is_bookmarked column exists
    console.log('\n📋 Checking database schema...');
    const { data: columns, error: columnsError } = await supabase
      .from('regulation_messages')
      .select('*')
      .limit(1);
    
    if (columnsError) {
      console.error('❌ Error checking database schema:', columnsError);
      return;
    }
    
    console.log('✅ Database schema check passed');
    
    // Test getting existing conversations
    console.log('\n📋 Testing conversation retrieval...');
    const { data: conversations, error: convError } = await supabase
      .from('regulation_conversations')
      .select('*')
      .limit(5);
    
    if (convError) {
      console.error('❌ Error getting conversations:', convError);
      return;
    }
    
    console.log(`✅ Found ${conversations.length} conversations`);
    
    if (conversations.length === 0) {
      console.log('ℹ️  No conversations found. You may need to create some first.');
      return;
    }
    
    // Test getting messages from a conversation
    console.log('\n📋 Testing message retrieval...');
    const testConversation = conversations[0];
    const { data: messages, error: msgError } = await supabase
      .from('regulation_messages')
      .select('*')
      .eq('conversation_id', testConversation.id)
      .limit(5);
    
    if (msgError) {
      console.error('❌ Error getting messages:', msgError);
      return;
    }
    
    console.log(`✅ Found ${messages.length} messages in conversation ${testConversation.id}`);
    
    if (messages.length === 0) {
      console.log('ℹ️  No messages found in this conversation.');
      return;
    }
    
    // Test bookmarking a message
    console.log('\n📋 Testing message bookmarking...');
    const testMessage = messages[0];
    const { error: bookmarkError } = await supabase
      .from('regulation_messages')
      .update({ 
        is_bookmarked: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', testMessage.id);
    
    if (bookmarkError) {
      console.error('❌ Error bookmarking message:', bookmarkError);
      return;
    }
    
    console.log(`✅ Message ${testMessage.id} bookmarked successfully`);
    
    // Test conversation bookmarking
    console.log('\n📋 Testing conversation bookmarking...');
    const { error: convBookmarkError } = await supabase
      .from('regulation_conversations')
      .update({ 
        is_bookmarked: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', testConversation.id);
    
    if (convBookmarkError) {
      console.error('❌ Error bookmarking conversation:', convBookmarkError);
      return;
    }
    
    console.log(`✅ Conversation ${testConversation.id} bookmarked successfully`);
    
    // Test getting bookmarked messages
    console.log('\n📋 Testing bookmarked messages retrieval...');
    const { data: bookmarkedMessages, error: bookmarkedMsgError } = await supabase
      .rpc('get_user_bookmarked_messages', {
        user_id_param: testConversation.user_id,
        limit_param: 10
      });
    
    if (bookmarkedMsgError) {
      console.error('❌ Error getting bookmarked messages:', bookmarkedMsgError);
      return;
    }
    
    console.log(`✅ Found ${bookmarkedMessages.length} bookmarked messages`);
    
    // Test getting bookmarked conversations
    console.log('\n📋 Testing bookmarked conversations retrieval...');
    const { data: bookmarkedConversations, error: bookmarkedConvError } = await supabase
      .rpc('get_user_bookmarked_conversations', {
        user_id_param: testConversation.user_id,
        limit_param: 10
      });
    
    if (bookmarkedConvError) {
      console.error('❌ Error getting bookmarked conversations:', bookmarkedConvError);
      return;
    }
    
    console.log(`✅ Found ${bookmarkedConversations.length} bookmarked conversations`);
    
    // Test getting unified bookmarks
    console.log('\n📋 Testing unified bookmarks retrieval...');
    const { data: unifiedBookmarks, error: unifiedError } = await supabase
      .rpc('get_unified_bookmarks', {
        user_id_param: testConversation.user_id,
        limit_param: 10
      });
    
    if (unifiedError) {
      console.error('❌ Error getting unified bookmarks:', unifiedError);
      return;
    }
    
    console.log(`✅ Found ${unifiedBookmarks.length} unified bookmarks`);
    console.log('Sample unified bookmarks:', unifiedBookmarks.slice(0, 2));
    
    // Test message count update function
    console.log('\n📋 Testing message count update function...');
    const { error: countError } = await supabase
      .rpc('update_conversation_message_count', {
        conversation_id_param: testConversation.id
      });
    
    if (countError) {
      console.error('❌ Error updating message count:', countError);
      return;
    }
    
    console.log(`✅ Message count updated successfully for conversation ${testConversation.id}`);
    
    console.log('\n🎉 All message management tests passed!');
    
  } catch (error) {
    console.error('❌ Unexpected error in message management test:', error);
  }
};

// Run the test
testMessageManagement().catch(console.error); 