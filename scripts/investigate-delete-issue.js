#!/usr/bin/env node

/**
 * Investigation Script: Delete & Conversation Persistence Issues
 * 
 * This script will systematically investigate:
 * 1. Why delete/clear buttons don't work
 * 2. Why AI responses aren't being saved (regenerating each time)
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Investigating Delete & Conversation Persistence Issues');
console.log('=====================================================\n');

async function investigatePhaseA_DeleteFunctionality() {
  console.log('📋 Phase A: Delete Functionality Investigation\n');
  
  console.log('🔍 A.1: Database Schema Analysis');
  console.log('-----------------------------------');
  
  try {
    // Check regulation_search_history table structure
    console.log('📊 Checking regulation_search_history table...');
    const { data: searchHistory, error: searchError } = await supabase
      .from('regulation_search_history')
      .select('*')
      .limit(3);
    
    if (searchError) {
      console.error('❌ Cannot access regulation_search_history:', searchError.message);
    } else {
      console.log(`✅ regulation_search_history: ${searchHistory?.length || 0} records`);
      if (searchHistory && searchHistory.length > 0) {
        console.log('   Sample record keys:', Object.keys(searchHistory[0]));
        console.log('   Sample ID:', searchHistory[0].id, 'Type:', typeof searchHistory[0].id);
      }
    }
    
    // Check regulation_conversations table structure
    console.log('\n📊 Checking regulation_conversations table...');
    const { data: conversations, error: convError } = await supabase
      .from('regulation_conversations')
      .select('*')
      .limit(3);
    
    if (convError) {
      console.error('❌ Cannot access regulation_conversations:', convError.message);
    } else {
      console.log(`✅ regulation_conversations: ${conversations?.length || 0} records`);
      if (conversations && conversations.length > 0) {
        console.log('   Sample record keys:', Object.keys(conversations[0]));
        console.log('   Sample ID:', conversations[0].id, 'Type:', typeof conversations[0].id);
      }
    }
    
    // Check regulation_messages table structure  
    console.log('\n📊 Checking regulation_messages table...');
    const { data: messages, error: msgError } = await supabase
      .from('regulation_messages')
      .select('*')
      .limit(3);
    
    if (msgError) {
      console.error('❌ Cannot access regulation_messages:', msgError.message);
    } else {
      console.log(`✅ regulation_messages: ${messages?.length || 0} records`);
      if (messages && messages.length > 0) {
        console.log('   Sample record keys:', Object.keys(messages[0]));
        console.log('   Sample ID:', messages[0].id, 'Type:', typeof messages[0].id);
        console.log('   Sample role:', messages[0].role);
        console.log('   Has content?', !!messages[0].content);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database schema analysis failed:', error);
    return false;
  }
}

async function investigatePhaseB_ConversationPersistence() {
  console.log('\n📋 Phase B: Conversation Persistence Investigation\n');
  
  console.log('🔍 B.1: Message Role Distribution Analysis');
  console.log('------------------------------------------');
  
  try {
    // Count messages by role
    const { data: userMessages, error: userError } = await supabase
      .from('regulation_messages')
      .select('id', { count: 'exact' })
      .eq('role', 'user');
    
    const { data: assistantMessages, error: assistantError } = await supabase
      .from('regulation_messages')
      .select('id', { count: 'exact' })
      .eq('role', 'assistant');
    
    if (userError || assistantError) {
      console.error('❌ Error counting messages by role');
    } else {
      console.log(`👤 User messages: ${userMessages?.length || 0}`);
      console.log(`🤖 Assistant messages: ${assistantMessages?.length || 0}`);
      
      const ratio = (assistantMessages?.length || 0) / (userMessages?.length || 1);
      console.log(`📊 Assistant:User ratio: ${ratio.toFixed(2)}`);
      
      if (ratio < 0.8) {
        console.log('🚨 ISSUE DETECTED: Low assistant message ratio suggests responses not being saved!');
      } else {
        console.log('✅ Message ratio looks normal');
      }
    }
    
    console.log('\n🔍 B.2: Sample Conversation Analysis');
    console.log('------------------------------------');
    
    // Get a sample conversation with its messages
    const { data: sampleConv, error: convError } = await supabase
      .from('regulation_conversations')
      .select(`
        id,
        title,
        message_count,
        regulation_messages (
          id,
          role,
          content,
          created_at
        )
      `)
      .limit(1)
      .single();
    
    if (convError) {
      console.log('📝 No conversations found or error accessing them');
    } else if (sampleConv) {
      console.log(`📄 Sample conversation: "${sampleConv.title}"`);
      console.log(`   Message count in DB: ${sampleConv.message_count}`);
      console.log(`   Actual messages found: ${sampleConv.regulation_messages?.length || 0}`);
      
      if (sampleConv.regulation_messages && sampleConv.regulation_messages.length > 0) {
        console.log('   Message sequence:');
        sampleConv.regulation_messages
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          .forEach((msg, i) => {
            const preview = msg.content ? msg.content.substring(0, 50) + '...' : '[No content]';
            console.log(`     ${i+1}. ${msg.role}: ${preview}`);
          });
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Conversation persistence analysis failed:', error);
    return false;
  }
}

async function investigatePhaseC_UnifiedHistorySystem() {
  console.log('\n📋 Phase C: Unified History System Analysis\n');
  
  console.log('🔍 C.1: Data Source Compatibility');
  console.log('----------------------------------');
  
  try {
    // Check if unified history correctly maps IDs
    console.log('🔗 Testing ID mapping in unified history system...');
    
    // Simulate what getUnifiedSearchHistory does
    const { data: oldHistory, error: oldError } = await supabase
      .from('regulation_search_history')
      .select('*')
      .limit(2);
    
    const { data: newMessages, error: newError } = await supabase
      .from('regulation_messages')
      .select(`
        id as message_id,
        conversation_id,
        content,
        role,
        created_at,
        regulation_conversations!inner (
          title,
          user_id
        )
      `)
      .eq('role', 'user')  // Only user messages for history
      .limit(2);
    
    if (!oldError && oldHistory) {
      console.log('📊 Old search history IDs:', oldHistory.map(h => ({ id: h.id, type: typeof h.id })));
    }
    
    if (!newError && newMessages) {
      console.log('📊 New message IDs:', newMessages.map(m => ({ 
        message_id: m.message_id, 
        type: typeof m.message_id,
        prefixed_id: `msg_${m.message_id}`
      })));
    }
    
    console.log('\n🔍 C.2: Delete Operation Simulation');
    console.log('-----------------------------------');
    
    // Test what happens when we try to delete
    if (oldHistory && oldHistory.length > 0) {
      const testId = oldHistory[0].id;
      console.log(`🧪 Testing delete operation with old history ID: ${testId}`);
      
      // Try to find this ID in the "unified" system
      const unifiedItems = [];
      
      // Add old history items
      if (oldHistory) {
        oldHistory.forEach(item => {
          unifiedItems.push({
            id: item.id,
            source_type: 'search_history',
            ...item
          });
        });
      }
      
      // Add new message items with prefixed IDs
      if (newMessages) {
        newMessages.forEach(msg => {
          unifiedItems.push({
            id: `msg_${msg.message_id}`,
            source_type: 'conversation_message',
            message_id: msg.message_id,
            content: msg.content,
            created_at: msg.created_at
          });
        });
      }
      
      console.log('🔍 Unified items for delete testing:');
      unifiedItems.forEach(item => {
        console.log(`   ID: ${item.id} (${item.source_type})`);
      });
      
      // Test finding an item for deletion
      const itemToDelete = unifiedItems.find(item => item.id === testId);
      if (itemToDelete) {
        console.log(`✅ Found item to delete: ${itemToDelete.id} (${itemToDelete.source_type})`);
      } else {
        console.log(`❌ Could not find item with ID ${testId} in unified system`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Unified history analysis failed:', error);
    return false;
  }
}

async function investigatePhaseD_APIEndpoints() {
  console.log('\n📋 Phase D: API Endpoint Testing\n');
  
  console.log('🔍 D.1: Delete API Endpoint Test');
  console.log('---------------------------------');
  
  try {
    const axios = require('axios');
    const BASE_URL = 'http://localhost:3001'; // Using the port from the dev server
    
    // Test the chat API endpoint with delete action
    console.log('🧪 Testing /api/regulation/chat with delete-message action...');
    
    const testPayload = {
      action: 'delete-message',
      messageId: 'test-id-123'
    };
    
    try {
      const response = await axios.post(`${BASE_URL}/api/regulation/chat`, testPayload, {
        timeout: 5000
      });
      console.log(`✅ API responded with status: ${response.status}`);
      console.log('📄 Response data:', response.data);
    } catch (apiError) {
      if (apiError.response) {
        console.log(`📊 API Error Response: ${apiError.response.status}`);
        console.log('📄 Error data:', apiError.response.data);
        
        if (apiError.response.status === 401) {
          console.log('🔐 Expected: Authentication required (this is normal for unauthenticated test)');
        } else if (apiError.response.status === 404) {
          console.log('❌ ISSUE: API endpoint not found or action not supported');
        }
      } else {
        console.error('❌ Network error:', apiError.message);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ API endpoint testing failed:', error);
    return false;
  }
}

async function generateDiagnosticReport() {
  console.log('\n📋 DIAGNOSTIC REPORT');
  console.log('===================\n');
  
  console.log('🎯 **FINDINGS SUMMARY:**\n');
  
  console.log('**Issue 1: Delete Functionality**');
  console.log('- Database access: Need to verify in investigation');
  console.log('- ID mapping: Need to check unified system compatibility');
  console.log('- API endpoints: Need to verify delete actions work');
  console.log('- Frontend handlers: Need to trace click events\n');
  
  console.log('**Issue 2: Conversation Persistence**');
  console.log('- Message storage: Need to verify assistant messages are saved');
  console.log('- Response regeneration: Need to check why responses are recreated');
  console.log('- Data retrieval: Need to verify full conversations are loaded\n');
  
  console.log('**Next Steps:**');
  console.log('1. Run this investigation script');
  console.log('2. Check browser console for JavaScript errors');
  console.log('3. Test delete buttons with authentication');
  console.log('4. Examine AI response saving in chat flow');
  console.log('5. Create fixes based on findings');
}

async function runFullInvestigation() {
  console.log('🚀 Starting comprehensive investigation...\n');
  
  const results = {
    schemaAnalysis: await investigatePhaseA_DeleteFunctionality(),
    persistenceAnalysis: await investigatePhaseB_ConversationPersistence(),
    unifiedSystemAnalysis: await investigatePhaseC_UnifiedHistorySystem(),
    apiTesting: await investigatePhaseD_APIEndpoints()
  };
  
  await generateDiagnosticReport();
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n✅ Investigation completed successfully');
  } else {
    console.log('\n⚠️ Investigation completed with some issues');
  }
  
  return results;
}

// Install axios if needed and run investigation
async function main() {
  try {
    // Try to require axios, install if missing
    require('axios');
  } catch (error) {
    console.log('📦 Installing axios for API testing...');
    const { exec } = require('child_process');
    await new Promise((resolve, reject) => {
      exec('npm install axios --legacy-peer-deps', (error, stdout, stderr) => {
        if (error) {
          console.log('⚠️ Could not install axios, skipping API tests');
          resolve();
        } else {
          console.log('✅ Axios installed');
          resolve();
        }
      });
    });
  }
  
  await runFullInvestigation();
}

main().catch(console.error); 