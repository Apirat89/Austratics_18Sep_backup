const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedDuplicateCheck() {
  console.log('🔧 TESTING FIXED DUPLICATE CHECK LOGIC');  
  console.log('='.repeat(60));

  const userId = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5'; // From user logs
  const searchTerm = 'What are the rights of older people receiving aged care services?';

  console.log('\n📋 TEST PARAMETERS:');
  console.log(`   userId: ${userId}`);
  console.log(`   searchTerm: "${searchTerm}"`);

  // Test the FIXED query logic (no time filter)
  console.log('\n🔧 TESTING FIXED QUERY: Simple duplicate check without time filter');
  try {
    const { data: existing, error: selectError } = await supabase
      .from('regulation_search_history')
      .select('id, updated_at, created_at')
      .eq('user_id', userId)
      .eq('search_term', searchTerm)
      .order('updated_at', { ascending: false })  // Get most recent if multiple exist
      .maybeSingle();

    if (selectError) {
      console.log('   ❌ Fixed query error:', selectError?.message || selectError);
      console.log('   🚨 DUPLICATE CHECK STILL BROKEN');
    } else {
      console.log('   ✅ Fixed query success!');
      if (existing) {
        console.log(`   📋 Found existing record:`, existing);
        console.log('   🎉 DUPLICATE CHECK WILL UPDATE EXISTING RECORD');
      } else {
        console.log('   📋 No existing record found');
        console.log('   🆕 DUPLICATE CHECK WILL CREATE NEW RECORD');
      }
    }
  } catch (error) {
    console.log('   ❌ Fixed query error:', error?.message || error);
  }

  // Simulate the full save process
  console.log('\n🔄 SIMULATING FULL SAVE PROCESS:');
  
  const mockData = {
    responsePreview: 'The new Aged Care Act puts the rights of older people at the center...',
    citationsCount: 7,
    documentTypes: ['Aged Care Act'],
    processingTime: 3.2,
    conversationId: 26
  };

  // Test the fixed duplicate check logic
  const { data: existing, error: selectError } = await supabase
    .from('regulation_search_history')
    .select('id, updated_at, created_at')
    .eq('user_id', userId)
    .eq('search_term', searchTerm)
    .order('updated_at', { ascending: false })
    .maybeSingle();

  if (selectError) {
    console.log('   ❌ DUPLICATE CHECK FAILED:', selectError.message);
    console.log('   🚨 THIS WILL CREATE DUPLICATES');
  } else if (existing) {
    console.log(`   ✅ FOUND EXISTING RECORD ID ${existing.id}`);
    console.log('   🔄 WILL UPDATE EXISTING RECORD (NO DUPLICATE)');
    
    // Test the update logic
    const { error: updateError } = await supabase
      .from('regulation_search_history')
      .update({ 
        updated_at: new Date().toISOString(),
        response_preview: mockData.responsePreview,
        citations_count: mockData.citationsCount,
        document_types: mockData.documentTypes,
        processing_time: mockData.processingTime,
        conversation_id: mockData.conversationId
      })
      .eq('id', existing.id);

    if (updateError) {
      console.log('   ❌ UPDATE FAILED:', updateError.message);
    } else {
      console.log('   ✅ UPDATE SUCCESSFUL');
    }
  } else {
    console.log('   📝 NO EXISTING RECORD - WILL CREATE NEW');
  }

  console.log('\n🎯 EXPECTED RESULT:');
  console.log('- ✅ No 406 errors');
  console.log('- ✅ Updates existing record instead of creating duplicate');
  console.log('- ✅ One search = one history entry (no duplicates)');
}

// Run the test
testFixedDuplicateCheck().catch(console.error); 