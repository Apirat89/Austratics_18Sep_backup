#!/usr/bin/env node

/**
 * Test Chat Flow with Authentication
 * 
 * This script simulates the complete chat flow to identify where conversation saving breaks:
 * 1. Check environment variables
 * 2. Test service role authentication
 * 3. Simulate conversation creation
 * 4. Test message saving
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('🔍 Testing Complete Chat Flow with Authentication');
console.log('=================================================\n');

async function checkEnvironmentVariables() {
  console.log('📋 Phase 1: Environment Variables Check');
  console.log('---------------------------------------');
  
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY'
  ];
  
  const missing = [];
  const present = [];
  
  required.forEach(key => {
    if (process.env[key]) {
      present.push(key);
      console.log(`✅ ${key}: Available`);
    } else {
      missing.push(key);
      console.log(`❌ ${key}: MISSING!`);
    }
  });
  
  console.log(`\n📊 Environment Status: ${present.length}/${required.length} variables present`);
  
  if (missing.length > 0) {
    console.log('\n🚨 **CRITICAL ISSUE: Missing Environment Variables**');
    console.log('Missing variables:', missing);
    console.log('\nThis explains why conversations are not being saved!');
    console.log('The RegulationChatService needs these variables to function.');
    return false;
  }
  
  return true;
}

async function testServiceRoleAuthentication() {
  console.log('\n📋 Phase 2: Service Role Authentication Test');
  console.log('--------------------------------------------');
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY missing - cannot test service role');
    return false;
  }
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('🧪 Testing service role permissions...');
    
    // Test if service role can access tables
    const { data: testAccess, error: accessError } = await supabase
      .from('regulation_conversations')
      .select('id')
      .limit(1);
    
    if (accessError) {
      console.log('❌ Service role cannot access regulation_conversations:', accessError.message);
      return false;
    } else {
      console.log('✅ Service role has database access');
    }
    
    // Test if service role can call RPC functions
    const { data: rpcTest, error: rpcError } = await supabase
      .rpc('get_user_recent_conversations', {
        user_id_param: '00000000-0000-0000-0000-000000000000',
        limit_param: 1
      });
    
    if (rpcError) {
      console.log('❌ Service role cannot call RPC functions:', rpcError.message);
      return false;
    } else {
      console.log('✅ Service role can call RPC functions');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Service role authentication failed:', error);
    return false;
  }
}

async function testGeminiAPI() {
  console.log('\n📋 Phase 3: Gemini API Test');
  console.log('----------------------------');
  
  if (!process.env.GEMINI_API_KEY) {
    console.log('❌ GEMINI_API_KEY missing - AI responses will fail');
    return false;
  }
  
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    console.log('🧪 Testing Gemini API connection...');
    
    const result = await model.generateContent('Hello, this is a test. Please respond with "Test successful."');
    const response = await result.response;
    const text = response.text();
    
    if (text.includes('Test successful') || text.includes('test')) {
      console.log('✅ Gemini API connection working');
      console.log(`   Response: "${text.substring(0, 100)}..."`);
      return true;
    } else {
      console.log('⚠️ Gemini API responds but may have issues');
      console.log(`   Response: "${text.substring(0, 100)}..."`);
      return true; // Still working, just unexpected response
    }
  } catch (error) {
    console.error('❌ Gemini API test failed:', error.message);
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('   Issue: Invalid Gemini API key');
    } else if (error.message.includes('quota')) {
      console.log('   Issue: API quota exceeded');
    }
    return false;
  }
}

async function simulateConversationCreation() {
  console.log('\n📋 Phase 4: Conversation Creation Simulation');
  console.log('--------------------------------------------');
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ Cannot test conversation creation without service role key');
    return false;
  }
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('🧪 Creating test conversation...');
    
    // Generate a test user ID (in real app, this comes from auth)
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    const { data: conversation, error: convError } = await supabase
      .from('regulation_conversations')
      .insert({
        user_id: testUserId,
        title: 'Test Conversation - DELETE ME',
        status: 'active'
      })
      .select('id')
      .single();
    
    if (convError) {
      console.error('❌ Failed to create test conversation:', convError);
      
      if (convError.message.includes('violates row-level security policy')) {
        console.log('   Issue: RLS policies blocking conversation creation');
        console.log('   Solution: Check RLS policies or use authenticated user ID');
      }
      
      return false;
    }
    
    console.log('✅ Test conversation created with ID:', conversation.id);
    
    // Now test adding a message
    console.log('🧪 Adding test message to conversation...');
    
    const { data: messageId, error: msgError } = await supabase
      .rpc('add_message_to_conversation', {
        conversation_id_param: conversation.id,
        role_param: 'user',
        content_param: 'This is a test message - DELETE ME',
        citations_param: null,
        processing_time_param: null,
        search_intent_param: 'question'
      });
    
    if (msgError) {
      console.error('❌ Failed to add test message:', msgError);
      return false;
    }
    
    console.log('✅ Test message added with ID:', messageId);
    
    // Clean up - delete test data
    await supabase.from('regulation_conversations').delete().eq('id', conversation.id);
    console.log('🧹 Cleaned up test data');
    
    return true;
  } catch (error) {
    console.error('❌ Conversation creation simulation failed:', error);
    return false;
  }
}

async function checkUserAuthentication() {
  console.log('\n📋 Phase 5: User Authentication Flow Check');
  console.log('------------------------------------------');
  
  console.log('🔍 Checking if users can authenticate properly...');
  
  // Test with anon key (simulating unauthenticated user)
  const anonSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  const { data: { user }, error } = await anonSupabase.auth.getUser();
  
  if (error) {
    console.log('⚠️ No authenticated user session (expected for testing)');
    console.log('   Real users need to sign in first');
  } else if (user) {
    console.log('✅ Found authenticated user:', user.id);
  } else {
    console.log('ℹ️ No user session found (expected for testing)');
  }
  
  console.log('\n💡 **Important Notes:**');
  console.log('- Users must be signed in to create conversations');
  console.log('- The regulation page should redirect to /auth/signin if not authenticated');
  console.log('- Check browser console for authentication errors');
  
  return true;
}

async function generateFinalReport(results) {
  console.log('\n📋 FINAL DIAGNOSIS REPORT');
  console.log('=========================\n');
  
  const issues = [];
  const working = [];
  
  Object.entries(results).forEach(([phase, success]) => {
    if (success) {
      working.push(phase);
    } else {
      issues.push(phase);
    }
  });
  
  if (issues.length === 0) {
    console.log('🎉 **ALL SYSTEMS WORKING!**\n');
    console.log('The conversation system should be functional.');
    console.log('If conversations still aren\'t saving, the issue is likely:');
    console.log('1. Users not properly signed in');
    console.log('2. Frontend not sending requests correctly');
    console.log('3. Browser console errors preventing API calls');
    
  } else {
    console.log('🚨 **ISSUES FOUND!**\n');
    console.log('❌ Problems detected in:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    
    console.log('\n✅ Working components:');
    working.forEach(component => console.log(`   - ${component}`));
    
    console.log('\n🔧 **IMMEDIATE ACTION REQUIRED:**');
    if (issues.includes('Environment Variables')) {
      console.log('1. **Set up missing environment variables in .env file**');
      console.log('2. Restart the development server');
    }
    if (issues.includes('Service Role Auth')) {
      console.log('3. **Check SUPABASE_SERVICE_ROLE_KEY is correct**');
    }
    if (issues.includes('Gemini API')) {
      console.log('4. **Check GEMINI_API_KEY is valid and has quota**');
    }
  }
  
  console.log('\n📝 **Testing Instructions:**');
  console.log('1. Go to http://localhost:3001/regulation');
  console.log('2. Sign in with a valid account');
  console.log('3. Ask a question in the chat');
  console.log('4. Check browser console for any errors');
  console.log('5. Check if conversation appears in "History & Bookmarks"');
}

async function main() {
  const results = {
    'Environment Variables': await checkEnvironmentVariables(),
    'Service Role Auth': await testServiceRoleAuthentication(),
    'Gemini API': await testGeminiAPI(),
    'Conversation Creation': await simulateConversationCreation(),
    'User Authentication Flow': await checkUserAuthentication()
  };
  
  await generateFinalReport(results);
}

// Install @google/generative-ai if needed
async function installDependencies() {
  try {
    require('@google/generative-ai');
  } catch (error) {
    console.log('📦 Installing @google/generative-ai for testing...');
    const { exec } = require('child_process');
    await new Promise((resolve) => {
      exec('npm install @google/generative-ai --legacy-peer-deps', (error) => {
        if (error) {
          console.log('⚠️ Could not install @google/generative-ai, skipping Gemini test');
        } else {
          console.log('✅ @google/generative-ai installed');
        }
        resolve();
      });
    });
  }
}

installDependencies().then(() => main()).catch(console.error); 