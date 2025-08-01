const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFixMissingRpcFunction() {
  console.log('🔧 FIXING MISSING RPC FUNCTION');
  console.log('===============================\n');

  try {
    // Step 1: Test if the function exists
    console.log('🧪 Step 1: Testing if add_message_to_conversation RPC exists...');
    
    const { data, error } = await supabase
      .rpc('add_message_to_conversation', {
        conversation_id_param: -1, // Use invalid ID to test function existence
        role_param: 'user',
        content_param: 'test'
      });

    // If we get here without a "function does not exist" error, the function exists
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      console.log('❌ RPC function does NOT exist - needs to be created');
      
      // Step 2: Apply the SQL to create the function
      console.log('\n🛠️ Step 2: Creating add_message_to_conversation RPC function...');
      
      // Read the SQL file content
      const sqlFilePath = path.join(__dirname, '..', 'sql', 'create_regulation_messages_table.sql');
      
      if (!fs.existsSync(sqlFilePath)) {
        console.error('❌ SQL file not found:', sqlFilePath);
        return false;
      }
      
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      console.log('✅ SQL file loaded successfully');
      
      // Execute the entire SQL file (it's safe to run multiple times due to CREATE OR REPLACE)
      const { error: sqlError } = await supabase.rpc('exec', { sql: sqlContent });
      
      if (sqlError) {
        console.error('❌ Failed to execute SQL:', sqlError);
        
        // Fallback: Try to execute just the function creation part
        console.log('🔄 Trying fallback approach...');
        
        // Extract just the add_message_to_conversation function
        const functionStart = sqlContent.indexOf('CREATE OR REPLACE FUNCTION add_message_to_conversation');
        const functionEnd = sqlContent.indexOf('$$ LANGUAGE plpgsql;', functionStart) + '$$ LANGUAGE plpgsql;'.length;
        
        if (functionStart !== -1 && functionEnd !== -1) {
          const functionSql = sqlContent.substring(functionStart, functionEnd);
          console.log('📝 Extracted function SQL:', functionSql.substring(0, 200) + '...');
          
          // Manual application via Supabase client is limited, so let's provide the SQL for manual execution
          console.log('\n📋 MANUAL EXECUTION REQUIRED:');
          console.log('Please run this SQL in your Supabase SQL Editor:');
          console.log('=' .repeat(60));
          console.log(functionSql);
          console.log('=' .repeat(60));
          
          return false;
        } else {
          console.error('❌ Could not extract function SQL from file');
          return false;
        }
      } else {
        console.log('✅ SQL executed successfully!');
      }
      
      // Step 3: Test the function again
      console.log('\n🧪 Step 3: Testing function after creation...');
      
      const { data: testData, error: testError } = await supabase
        .rpc('add_message_to_conversation', {
          conversation_id_param: -1,
          role_param: 'user', 
          content_param: 'test'
        });

      if (testError && !testError.message.includes('function') && !testError.message.includes('does not exist')) {
        console.log('✅ Function now exists! (Expected error due to invalid conversation_id)');
        console.log('📝 Test error (expected):', testError.message);
        return true;
      } else if (!testError) {
        console.log('✅ Function created and working!');
        return true;
      } else {
        console.error('❌ Function still missing after creation attempt');
        return false;
      }
      
    } else {
      console.log('✅ RPC function already exists!');
      console.log('📝 Test result:', error ? error.message : 'Success');
      return true;
    }

  } catch (error) {
    console.error('💥 Script failed:', error);
    return false;
  }
}

async function testFullConversationFlow() {
  console.log('\n🧪 TESTING FULL CONVERSATION FLOW');
  console.log('==================================');
  
  const testUserId = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5';
  
  try {
    // Create a test conversation
    console.log('📝 Creating test conversation...');
    const { data: conversation, error: convError } = await supabase
      .from('regulation_conversations')
      .insert({
        user_id: testUserId,
        title: 'Test Conversation - RPC Fix',
        status: 'active'
      })
      .select('id')
      .single();

    if (convError) {
      console.error('❌ Failed to create conversation:', convError.message);
      return false;
    }

    const conversationId = conversation.id;
    console.log('✅ Created conversation:', conversationId);

    // Test adding user message
    console.log('\n👤 Adding user message...');
    const { data: userMsgId, error: userError } = await supabase
      .rpc('add_message_to_conversation', {
        conversation_id_param: conversationId,
        role_param: 'user',
        content_param: 'What are the key changes in the new Aged Care Act 2024?',
        citations_param: null,
        processing_time_param: null,
        search_intent_param: 'question'
      });

    if (userError) {
      console.error('❌ Failed to add user message:', userError.message);
      return false;
    }

    console.log('✅ Added user message:', userMsgId);

    // Test adding assistant message  
    console.log('\n🤖 Adding assistant message...');
    const { data: assistantMsgId, error: assistantError } = await supabase
      .rpc('add_message_to_conversation', {
        conversation_id_param: conversationId,
        role_param: 'assistant',
        content_param: 'The Aged Care Act 2024 introduces several key changes...',
        citations_param: null,
        processing_time_param: 1500,
        search_intent_param: null
      });

    if (assistantError) {
      console.error('❌ Failed to add assistant message:', assistantError.message);
      return false;
    }

    console.log('✅ Added assistant message:', assistantMsgId);

    // Verify messages were saved
    console.log('\n🔍 Verifying messages in database...');
    const { data: messages, error: fetchError } = await supabase
      .from('regulation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('message_index', { ascending: true });

    if (fetchError) {
      console.error('❌ Failed to fetch messages:', fetchError.message);
      return false;
    }

    console.log(`✅ Found ${messages.length} messages:`);
    messages.forEach((msg, i) => {
      console.log(`  ${i + 1}. [${msg.role}] ${msg.content.substring(0, 50)}...`);
    });

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('regulation_messages').delete().eq('conversation_id', conversationId);
    await supabase.from('regulation_conversations').delete().eq('id', conversationId);
    console.log('✅ Cleanup completed');

    return true;

  } catch (error) {
    console.error('💥 Full conversation flow test failed:', error);
    return false;
  }
}

// Run the fix and test
(async () => {
  try {
    const functionFixed = await checkAndFixMissingRpcFunction();
    
    if (functionFixed) {
      const flowWorked = await testFullConversationFlow();
      
      console.log('\n' + '='.repeat(50));
      if (flowWorked) {
        console.log('🎉 SUCCESS! CONVERSATION SAVING IS NOW FIXED!');
        console.log('✅ add_message_to_conversation RPC function working');
        console.log('✅ Full conversation flow working');
        console.log('🚀 The app should now save chatbot replies correctly!');
      } else {
        console.log('⚠️ Function exists but conversation flow still has issues');
      }
    } else {
      console.log('❌ Could not create/fix the RPC function');
      console.log('📋 Manual SQL execution may be required');
    }
    console.log('='.repeat(50));
    
    process.exit(functionFixed && flowWorked ? 0 : 1);
  } catch (error) {
    console.error('💥 Script crashed:', error);
    process.exit(1);
  }
})(); 