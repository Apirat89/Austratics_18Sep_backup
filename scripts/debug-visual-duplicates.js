const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugVisualDuplicates() {
  console.log('🔍 DEBUGGING VISUAL DUPLICATES IN HISTORY');  
  console.log('='.repeat(60));

  const userId = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5';

  // Check actual database records
  console.log('\n📊 DATABASE RECORDS CHECK:');
  const { data: allHistory, error } = await supabase
    .from('regulation_search_history')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.log('❌ Error fetching history:', error.message);
    return;
  }

  console.log(`📋 Total history records: ${allHistory?.length || 0}`);
  
  // Group by search term to find duplicates
  const groupedByTerm = {};
  allHistory?.forEach(record => {
    const term = record.search_term;
    if (!groupedByTerm[term]) {
      groupedByTerm[term] = [];
    }
    groupedByTerm[term].push(record);
  });

  console.log('\n🔍 DUPLICATE ANALYSIS:');
  let actualDuplicates = 0;
  let uniqueSearches = 0;

  Object.entries(groupedByTerm).forEach(([searchTerm, records]) => {
    if (records.length > 1) {
      actualDuplicates += records.length - 1; // Count extra records as duplicates
      console.log(`❌ DUPLICATE: "${searchTerm}" (${records.length} entries)`);
      records.forEach((record, index) => {
        console.log(`   ${index + 1}. ID: ${record.id}, ConvoID: ${record.conversation_id}, Created: ${record.created_at}`);
      });
    } else {
      uniqueSearches++;
    }
  });

  console.log(`\n📊 SUMMARY:`);
  console.log(`   ✅ Unique searches: ${uniqueSearches}`);
  console.log(`   ❌ Actual duplicates: ${actualDuplicates}`);
  console.log(`   📈 Total records: ${allHistory?.length || 0}`);

  if (actualDuplicates === 0) {
    console.log('\n✅ NO DATABASE DUPLICATES FOUND!');
    console.log('🎯 The issue is likely VISUAL DUPLICATES in the frontend.');
    console.log('\n💡 POSSIBLE CAUSES:');
    console.log('   1. React state not updating correctly');
    console.log('   2. History list rendering same items multiple times');
    console.log('   3. Frontend duplicate prevention not working');
    console.log('   4. Rapid clicking causing multiple renders');
  } else {
    console.log('\n❌ DATABASE DUPLICATES FOUND!');
    console.log('🎯 Need to investigate why duplicate prevention failed.');
  }

  // Check the specific search term from logs
  const recentSearch = "What are the Aged Care Quality Standards, and how do they apply to providers?";
  console.log(`\n🔍 CHECKING RECENT SEARCH: "${recentSearch}"`);
  
  const recentRecords = allHistory?.filter(record => record.search_term === recentSearch) || [];
  console.log(`📋 Found ${recentRecords.length} records for this search:`);
  
  recentRecords.forEach((record, index) => {
    console.log(`   ${index + 1}. ID: ${record.id}, ConvoID: ${record.conversation_id}, Created: ${record.created_at}, Updated: ${record.updated_at}`);
  });

  if (recentRecords.length > 1) {
    console.log('❌ THIS SEARCH HAS DUPLICATES');
  } else {
    console.log('✅ THIS SEARCH IS UNIQUE (NO DUPLICATES)');
  }
}

// Run the debug
debugVisualDuplicates().catch(console.error); 