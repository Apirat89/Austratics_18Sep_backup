const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const checkPolicies = async () => {
  console.log('🔍 Checking RLS policies...');
  
  try {
    // Check if policies exist
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'regulation_messages');
    
    if (error) {
      console.error('Error checking policies:', error);
    } else {
      console.log('Found policies:', policies.length);
      policies.forEach(policy => {
        console.log(`- ${policy.policyname}: ${policy.cmd}`);
      });
    }
    
    // Test direct query to see if it works
    console.log('\n🧪 Testing direct query...');
    const { data, error: queryError } = await supabase
      .from('regulation_messages')
      .select('*')
      .eq('conversation_id', 2)
      .limit(1);
    
    if (queryError) {
      console.error('❌ Direct query error:', queryError);
    } else {
      console.log('✅ Direct query works');
    }
    
    // Try to bypass RLS using service role
    console.log('\n⚡ Testing with service role bypass...');
    const { data: serviceData, error: serviceError } = await supabase
      .rpc('get_conversation_messages', {
        conversation_id_param: 2,
        user_id_param: null // This should bypass user check
      });
    
    if (serviceError) {
      console.error('❌ Service role error:', serviceError);
    } else {
      console.log('✅ Service role bypass works');
    }
    
  } catch (error) {
    console.error('Error checking policies:', error);
  }
};

checkPolicies(); 