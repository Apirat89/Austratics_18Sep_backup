const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug406Error() {
  console.log('🔍 DEBUGGING 406 ERROR IN DUPLICATE CHECK');  
  console.log('='.repeat(60));

  const userId = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5'; // From user logs
  const searchTerm = 'What are the rights of older people receiving aged care services?';
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  console.log('\n📋 TEST PARAMETERS:');
  console.log(`   userId: ${userId}`);
  console.log(`   searchTerm: "${searchTerm}"`);
  console.log(`   fiveMinutesAgo: ${fiveMinutesAgo}`);

  // Test 1: The query from the logs (OLD VERSION - causing 406)
  console.log('\n🔍 TEST 1: Old Query from Logs (should cause 406)');
  try {
    const { data: oldResult, error: oldError } = await supabase
      .from('regulation_search_history')
      .select('id, updated_at')  // Old query format
      .eq('user_id', userId)
      .eq('search_term', searchTerm)
      .single();  // This should cause 406 if no exact match

    console.log('   ✅ Old query result:', oldResult);
    console.log('   ❌ Old query should have failed but succeeded');
  } catch (error) {
    console.log('   ❌ Old query error (expected):', error?.message || error);
  }

  // Test 2: The query from the logs but with maybeSingle
  console.log('\n🔍 TEST 2: Old Query with maybeSingle (should work)');
  try {
    const { data: oldMaybeResult, error: oldMaybeError } = await supabase
      .from('regulation_search_history')
      .select('id, updated_at')  // Old query format
      .eq('user_id', userId)
      .eq('search_term', searchTerm)
      .maybeSingle();  // This should work

    if (oldMaybeError) {
      console.log('   ❌ Old maybeSingle error:', oldMaybeError?.message || oldMaybeError);
    } else {
      console.log('   ✅ Old maybeSingle result:', oldMaybeResult);
    }
  } catch (error) {
    console.log('   ❌ Old maybeSingle error:', error?.message || error);
  }

  // Test 3: Current implementation query (NEW VERSION)
  console.log('\n🔍 TEST 3: Current Implementation Query (should work)');
  try {
    const { data: newResult, error: newError } = await supabase
      .from('regulation_search_history')
      .select('id, updated_at, created_at')  // New query format
      .eq('user_id', userId)
      .eq('search_term', searchTerm)
      .gte('created_at', fiveMinutesAgo)  // Time-based filter
      .order('created_at', { ascending: false })  // Ordering
      .maybeSingle();

    if (newError) {
      console.log('   ❌ New query error:', newError?.message || newError);
    } else {
      console.log('   ✅ New query result:', newResult);
    }
  } catch (error) {
    console.log('   ❌ New query error:', error?.message || error);
  }

  // Test 4: Check if there are ANY records for this user/search
  console.log('\n🔍 TEST 4: Count Total Records');
  try {
    const { count, error: countError } = await supabase
      .from('regulation_search_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('search_term', searchTerm);

    if (countError) {
      console.log('   ❌ Count error:', countError?.message || countError);
    } else {
      console.log(`   📊 Total matching records: ${count}`);
      if (count === 0) {
        console.log('   🔍 No existing records - duplicate check should pass');
      } else if (count === 1) {
        console.log('   🔍 One record exists - should be updateable');
      } else {
        console.log(`   🔍 Multiple records (${count}) - potential issue`);
      }
    }
  } catch (error) {
    console.log('   ❌ Count error:', error?.message || error);
  }

  // Test 5: Actually fetch the records to see their structure
  console.log('\n🔍 TEST 5: Fetch All Matching Records');
  try {
    const { data: allRecords, error: allError } = await supabase
      .from('regulation_search_history')
      .select('*')
      .eq('user_id', userId)
      .eq('search_term', searchTerm)
      .order('created_at', { ascending: false });

    if (allError) {
      console.log('   ❌ Fetch all error:', allError?.message || allError);
    } else {
      console.log(`   📋 Found ${allRecords?.length || 0} matching records:`);
      allRecords?.forEach((record, index) => {
        console.log(`   ${index + 1}. ID: ${record.id}, Created: ${record.created_at}, Updated: ${record.updated_at}`);
      });
    }
  } catch (error) {
    console.log('   ❌ Fetch all error:', error?.message || error);
  }

  console.log('\n🎯 ANALYSIS:');
  console.log('If TEST 1 fails with 406 but TEST 2 succeeds, then the issue is:');
  console.log('- The frontend is still using .single() instead of .maybeSingle()');
  console.log('- There might be multiple instances of the duplicate check');
  console.log('- The code changes are not being deployed/cached');
}

// Run the debug function
debug406Error().catch(console.error); 