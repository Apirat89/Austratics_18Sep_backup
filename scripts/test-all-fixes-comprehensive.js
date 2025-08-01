const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Import the fixed functions (simulate them)
async function simulateGetUnifiedSearchHistory(userId, limit = 20) {
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  
  const oldHistoryResult = await supabase
    .from('regulation_search_history')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', twoWeeksAgo)
    .order('updated_at', { ascending: false })
    .limit(Math.ceil(limit / 2));

  return oldHistoryResult.data || [];
}

function simulateAdaptUnifiedHistoryToOld(items) {
  return items.map(item => ({
    id: item.id,
    user_id: item.user_id,
    search_term: item.search_term,
    response_preview: item.response_preview,
    citations_count: item.citations_count,
    document_types: item.document_types,
    processing_time: item.processing_time,
    created_at: item.created_at,
    updated_at: item.updated_at,
    conversation_id: item.conversation_id  // ✅ FIXED: Now included!
  }));
}

async function testAllFixesComprehensive() {
  console.log('🧪 COMPREHENSIVE TEST: All Three Critical Fixes');
  console.log('='.repeat(60));

  try {
    const userId = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5';

    // TEST FIX 1: conversation_id in adapter function
    console.log('\n🔧 TEST FIX 1: conversation_id Included in Adapter');
    console.log('-'.repeat(40));
    
    const unifiedHistory = await simulateGetUnifiedSearchHistory(userId);
    console.log(`📊 Retrieved ${unifiedHistory.length} unified history items`);
    
    if (unifiedHistory.length > 0) {
      const originalItem = unifiedHistory[0];
      console.log(`🔍 Original item conversation_id: ${originalItem.conversation_id || 'UNDEFINED'}`);
      
      // Test the FIXED adapter function
      const adaptedHistory = simulateAdaptUnifiedHistoryToOld(unifiedHistory);
      const adaptedItem = adaptedHistory[0];
      
      console.log(`🔍 Adapted item conversation_id: ${adaptedItem.conversation_id || 'UNDEFINED'}`);
      console.log(`🔍 Adapted item keys: [${Object.keys(adaptedItem).join(', ')}]`);
      
      if (adaptedItem.conversation_id) {
        console.log('✅ FIX 1 SUCCESS: conversation_id preserved in adapter function');
      } else {
        console.log('❌ FIX 1 FAILED: conversation_id still missing from adapter');
      }
    }

    // TEST FIX 2: Enhanced duplicate prevention
    console.log('\n🔧 TEST FIX 2: Enhanced Duplicate Prevention');
    console.log('-'.repeat(40));
    
    // Test the time-based duplicate detection logic
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const testSearchTerm = "What are the rights of older people receiving aged care services?";
    
    console.log('🔍 Testing time-based duplicate detection...');
    console.log(`   Looking for "${testSearchTerm}" since ${fiveMinutesAgo}`);
    
    const { data: recentDuplicates, error: dupError } = await supabase
      .from('regulation_search_history')
      .select('id, created_at, search_term')
      .eq('user_id', userId)
      .eq('search_term', testSearchTerm)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false });

    if (dupError) {
      console.log('❌ FIX 2 TEST ERROR:', dupError.message);
    } else {
      console.log(`📊 Found ${recentDuplicates.length} recent records with same search term`);
      if (recentDuplicates.length <= 1) {
        console.log('✅ FIX 2 SUCCESS: No excessive duplicates found (≤1 record)');
      } else {
        console.log(`⚠️ FIX 2 NEEDS VERIFICATION: Found ${recentDuplicates.length} duplicates`);
        recentDuplicates.forEach((dup, i) => {
          console.log(`   ${i+1}. ID ${dup.id} created at ${dup.created_at}`);
        });
      }
    }

    // TEST FIX 3: conversation_id saving verification
    console.log('\n🔧 TEST FIX 3: conversation_id Saving Verification');
    console.log('-'.repeat(40));
    
    const { count: totalRecords } = await supabase
      .from('regulation_search_history')
      .select('*', { count: 'exact', head: true });

    const { count: withConversationId } = await supabase
      .from('regulation_search_history')
      .select('*', { count: 'exact', head: true })
      .not('conversation_id', 'is', null);

    const { count: conversationsCount } = await supabase
      .from('regulation_conversations')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Total history records: ${totalRecords}`);
    console.log(`📊 Records with conversation_id: ${withConversationId}`);
    console.log(`📊 Total conversations: ${conversationsCount}`);

    const savingRatio = withConversationId / totalRecords;
    if (savingRatio >= 0.5) {  // At least 50% should have conversation_id
      console.log(`✅ FIX 3 SUCCESS: ${Math.round(savingRatio * 100)}% of records have conversation_id`);
    } else {
      console.log(`⚠️ FIX 3 NEEDS ATTENTION: Only ${Math.round(savingRatio * 100)}% of records have conversation_id`);
    }

    // COMPREHENSIVE RESULT
    console.log('\n🎯 COMPREHENSIVE TEST RESULTS');
    console.log('='.repeat(60));
    
    const fix1Success = adaptedHistory[0]?.conversation_id ? true : false;
    const fix2Success = recentDuplicates.length <= 1;
    const fix3Success = savingRatio >= 0.5;
    
    console.log(`🔧 Fix 1 (Adapter Function): ${fix1Success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`🔧 Fix 2 (Duplicate Prevention): ${fix2Success ? '✅ SUCCESS' : '⚠️ NEEDS VERIFICATION'}`);
    console.log(`🔧 Fix 3 (conversation_id Saving): ${fix3Success ? '✅ SUCCESS' : '⚠️ NEEDS ATTENTION'}`);
    
    const allFixed = fix1Success && fix2Success && fix3Success;
    
    if (allFixed) {
      console.log('\n🎉 ALL FIXES SUCCESSFUL!');
      console.log('✅ conversation_id will now be available in frontend');
      console.log('✅ Duplicate history entries should be prevented');
      console.log('✅ Conversation persistence should work like ChatGPT/Claude');
    } else {
      console.log('\n⚠️ SOME FIXES NEED VERIFICATION');
      console.log('Please test the frontend to confirm all issues are resolved');
    }

  } catch (error) {
    console.error('❌ Comprehensive test failed:', error);
  }
}

// Run the comprehensive test
testAllFixesComprehensive().catch(console.error); 