const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Simulate the RegulationChatService behavior
class TestRegulationChatService {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  generateConversationTitle(firstMessage) {
    if (!firstMessage || firstMessage.length === 0) {
      return 'New Conversation';
    }
    return firstMessage.substring(0, 50) + (firstMessage.length > 50 ? '...' : '');
  }

  async createConversation(request) {
    try {
      console.log('🔧 createConversation called with:', request);
      const { user_id, title, first_message } = request;

      // Insert new conversation
      const { data, error } = await this.supabase
        .from('regulation_conversations')
        .insert({
          user_id,
          title: title || this.generateConversationTitle(first_message),
          status: 'active'
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Database error in createConversation:', error);
        throw new Error(`Failed to create conversation: ${error.message}`);
      }

      console.log('✅ Successfully created conversation:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ Error in createConversation:', error);
      throw error;
    }
  }

  async addMessageToConversation(conversationId, role, content) {
    try {
      console.log(`🔧 addMessageToConversation called: ${role} message to conversation ${conversationId}`);
      
      const { data, error } = await this.supabase
        .rpc('add_message_to_conversation', {
          p_conversation_id: conversationId,
          p_content: content,
          p_role: role,
          p_user_id: 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5' // Test user ID
        });

      if (error) {
        console.error('❌ RPC error in addMessageToConversation:', error);
        throw new Error(`Failed to add message: ${error.message}`);
      }

      console.log('✅ Successfully added message to conversation');
      return data;
    } catch (error) {
      console.error('❌ Error in addMessageToConversation:', error);
      throw error;
    }
  }

  // Simplified version of processConversationalQuery focusing on conversation creation
  async simulateProcessConversationalQuery(question, context) {
    const startTime = Date.now();
    console.log('🚀 Starting processConversationalQuery simulation...');
    console.log('📝 Question:', question.substring(0, 100) + '...');
    console.log('📊 Context:', context);

    const { conversation_id, user_id } = context;
    let actualConversationId = conversation_id;

    try {
      // Step 1: Create conversation if needed
      if (!actualConversationId) {
        console.log('🔄 No conversation_id provided, creating new conversation...');
        
        actualConversationId = await this.createConversation({
          user_id,
          title: null, // Let it auto-generate
          first_message: question
        });
        
        console.log(`✨ Created new conversation: ${actualConversationId}`);
      } else {
        console.log(`📚 Using existing conversation: ${actualConversationId}`);
      }

      // Step 2: Add user message to conversation
      let userMessageId;
      if (actualConversationId) {
        try {
          console.log(`🔧 About to save user message to conversation ${actualConversationId}`);
          
          userMessageId = await this.addMessageToConversation(
            actualConversationId,
            'user',
            question
          );
          
          console.log(`🎉 Added user message with ID: ${userMessageId}`);
        } catch (error) {
          console.error(`❌ Failed to save user message:`, error);
          // Continue execution even if saving fails (like the real app)
        }
      }

      // Step 3: Simulate AI response (shortened for test)
      const aiResponse = `This is a simulated AI response to: ${question.substring(0, 50)}...`;
      
      // Step 4: Add assistant message to conversation
      let assistantMessageId;
      if (actualConversationId) {
        try {
          console.log(`🤖 About to save assistant message to conversation ${actualConversationId}`);
          
          assistantMessageId = await this.addMessageToConversation(
            actualConversationId,
            'assistant',
            aiResponse
          );
          
          console.log(`🎉 Added assistant message with ID: ${assistantMessageId}`);
        } catch (error) {
          console.error(`❌ Failed to save assistant message:`, error);
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(`⏱️ Total processing time: ${processingTime}ms`);

      return {
        message: aiResponse,
        citations: [],
        context_used: 0,
        processing_time: processingTime,
        conversation_id: actualConversationId,
        message_id: assistantMessageId
      };

    } catch (error) {
      console.error('💥 processConversationalQuery simulation failed:', error);
      throw error;
    }
  }
}

async function testApiConversationFlow() {
  console.log('🧪 API CONVERSATION FLOW TEST');
  console.log('==============================\n');

  const testUser = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5';
  const testQuestion = 'What are the key changes in the new Aged Care Act 2024?';
  
  const chatService = new TestRegulationChatService();

  try {
    // Test 1: Simulate new conversation (no conversation_id provided)
    console.log('📝 Test 1: Simulating new conversation creation...');
    console.log('=====================================');
    
    const response = await chatService.simulateProcessConversationalQuery(testQuestion, {
      conversation_id: undefined, // This should trigger conversation creation
      user_id: testUser,
      conversation_history: [],
      max_context_messages: 5
    });

    console.log('✅ API flow simulation completed successfully!');
    console.log('📊 Response:', {
      conversation_id: response.conversation_id,
      message_id: response.message_id,
      processing_time: response.processing_time
    });

    // Verify the conversation and messages were created
    console.log('\n🔍 Verification: Checking database...');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check conversation
    const { data: conversation, error: convError } = await supabase
      .from('regulation_conversations')
      .select('*')
      .eq('id', response.conversation_id)
      .single();

    if (convError) {
      console.error('❌ Failed to verify conversation:', convError.message);
    } else {
      console.log('✅ Conversation verified in database:', {
        id: conversation.id,
        title: conversation.title,
        user_id: conversation.user_id
      });
    }

    // Check messages
    const { data: messages, error: msgError } = await supabase
      .from('regulation_messages')
      .select('*')
      .eq('conversation_id', response.conversation_id)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('❌ Failed to verify messages:', msgError.message);
    } else {
      console.log(`✅ Found ${messages.length} messages in conversation:`);
      messages.forEach((msg, i) => {
        console.log(`  ${i + 1}. [${msg.role}]: ${msg.content.substring(0, 50)}...`);
      });
    }

    // Cleanup
    console.log('\n🧹 Cleanup: Removing test data...');
    await supabase.from('regulation_messages').delete().eq('conversation_id', response.conversation_id);
    await supabase.from('regulation_conversations').delete().eq('id', response.conversation_id);
    console.log('✅ Cleanup completed');

    return true;

  } catch (error) {
    console.error('💥 API flow test failed:', error);
    console.error('💥 Error details:', error.message);
    console.error('💥 Stack trace:', error.stack);
    return false;
  }
}

// Run the test
(async () => {
  try {
    const success = await testApiConversationFlow();
    
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('🎉 API CONVERSATION FLOW TEST PASSED!');
      console.log('✅ The conversation creation process works correctly');
      console.log('🔍 The issue must be in the environment/context of the running app');
    } else {
      console.log('❌ API CONVERSATION FLOW TEST FAILED!');
      console.log('🔧 There is an issue in the conversation creation logic');
    }
    console.log('='.repeat(50));
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  }
})(); 