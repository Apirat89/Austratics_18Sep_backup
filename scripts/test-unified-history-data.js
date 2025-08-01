const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Simulate the getUnifiedSearchHistory function logic
async function testUnifiedHistoryData() {
  console.log('🔍 TESTING: getUnifiedSearchHistory Data Flow');
  console.log('='.repeat(50));

  try {
    const userId = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5'; // From your logs
    const limit = 20;
    
    // Get old search history (past 2 weeks) - EXACT same query as in the function
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    
    console.log('\n1. TESTING OLD HISTORY QUERY:');
    console.log('Query: .select("*") from regulation_search_history');
    
    const oldHistoryResult = await supabase
      .from('regulation_search_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', twoWeeksAgo)
      .order('updated_at', { ascending: false })
      .limit(Math.ceil(limit / 2));

    if (oldHistoryResult.error) {
      console.error('❌ Old history query failed:', oldHistoryResult.error);
      return;
    }

    console.log(`📊 Found ${oldHistoryResult.data.length} old history records`);
    
    if (oldHistoryResult.data.length > 0) {
      const firstRecord = oldHistoryResult.data[0];
      console.log('\n📋 FIRST RECORD FIELDS:');
      Object.keys(firstRecord).forEach(key => {
        const marker = key === 'conversation_id' ? '👉 ' : '   ';
        console.log(`${marker}${key}: ${JSON.stringify(firstRecord[key])}`);
      });
      
      console.log(`\n🔍 conversation_id in first record: ${firstRecord.conversation_id || 'UNDEFINED'}`);
    }

    // Simulate the processing logic
    console.log('\n2. TESTING DATA PROCESSING:');
    const unifiedItems = [];
    
    if (oldHistoryResult.data) {
      for (const item of oldHistoryResult.data) {
        const processedItem = {
          ...item,
          source_type: 'search_history'
        };
        unifiedItems.push(processedItem);
      }
    }

    console.log(`📊 Processed ${unifiedItems.length} unified items`);
    
    if (unifiedItems.length > 0) {
      const firstUnified = unifiedItems[0];
      console.log('\n📋 FIRST UNIFIED ITEM FIELDS:');
      Object.keys(firstUnified).forEach(key => {
        const marker = key === 'conversation_id' ? '👉 ' : '   ';
        console.log(`${marker}${key}: ${JSON.stringify(firstUnified[key])}`);
      });
      
      console.log(`\n🔍 conversation_id in unified item: ${firstUnified.conversation_id || 'UNDEFINED'}`);
    }

    // Test the actual function behavior
    console.log('\n3. ROOT CAUSE ANALYSIS:');
    if (oldHistoryResult.data[0]?.conversation_id && unifiedItems[0]?.conversation_id) {
      console.log('✅ conversation_id is present in both raw data and processed items');
      console.log('🚨 Issue must be elsewhere - possibly in frontend processing');
    } else if (oldHistoryResult.data[0]?.conversation_id && !unifiedItems[0]?.conversation_id) {
      console.log('❌ conversation_id lost during processing (bug in spread operator)');
    } else if (!oldHistoryResult.data[0]?.conversation_id) {
      console.log('❌ conversation_id missing from database query result');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testUnifiedHistoryData().catch(console.error); 