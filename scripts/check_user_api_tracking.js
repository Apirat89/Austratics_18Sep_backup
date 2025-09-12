// Script to check if a specific user's API events are being tracked
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configure Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in .env file');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// User to check - can be passed via command line or hardcoded
const userEmail = process.argv[2] || 'apirat.kongchanagul@gmail.com';

async function main() {
  try {
    console.log(`🔍 Checking API usage tracking for user: ${userEmail}`);
    
    // Step 1: Get user ID from email
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError);
      process.exit(1);
    }
    
    const user = users.users.find(u => u.email === userEmail);
    
    if (!user) {
      console.error(`❌ User with email ${userEmail} not found`);
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
    
    // Step 2: Check if this user has any API usage events
    const { data: events, error: eventsError } = await supabase
      .from('api_usage_events')
      .select('id, created_at, service, action, endpoint')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (eventsError) {
      console.error('❌ Error fetching API usage events:', eventsError);
      process.exit(1);
    }
    
    // Step 3: Display results
    if (events && events.length > 0) {
      console.log(`✅ Found ${events.length} API usage events for user ${userEmail}`);
      console.table(events.map(e => ({
        created_at: new Date(e.created_at).toLocaleString(),
        service: e.service,
        action: e.action,
        endpoint: e.endpoint
      })));
    } else {
      console.log(`⚠️ No API usage events found for user ${userEmail}`);
      
      // Step 4: Check if any events exist at all
      const { count, error: countError } = await supabase
        .from('api_usage_events')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('❌ Error checking total event count:', countError);
      } else if (count === 0) {
        console.log('⚠️ The api_usage_events table appears to be empty. No events are being tracked for any user.');
      } else {
        console.log(`ℹ️ There are ${count} total events in the api_usage_events table for other users.`);
        
        // Step 5: List other users with events
        const { data: otherUsers, error: otherUsersError } = await supabase
          .from('api_usage_events')
          .select('user_id')
          .limit(5);
        
        if (!otherUsersError && otherUsers?.length > 0) {
          console.log('ℹ️ Sample user IDs with tracked events:');
          otherUsers.forEach(u => console.log(`- ${u.user_id}`));
        }
      }
      
      // Step 6: Check RLS policy
      console.log('\n🔒 Checking RLS Policy for api_usage_events table...');
      console.log('Note: This requires direct database access and may not work through the API');
      console.log('Consider running: SELECT pg_get_expr(polqual, polrelid) FROM pg_policy WHERE polname = \'Admin users can view all usage events\' AND polrelid = \'public.api_usage_events\'::regclass;');
    }
    
    // Step 7: Check if the user is an admin
    const { data: adminCheck, error: adminError } = await supabase
      .from('admin_users')
      .select('id, status, is_master')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (adminError) {
      console.error('❌ Error checking admin status:', adminError);
    } else if (adminCheck) {
      console.log(`✅ User ${userEmail} is an admin (status: ${adminCheck.status}, master: ${adminCheck.is_master})`);
    } else {
      console.log(`ℹ️ User ${userEmail} is not an admin user`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

main(); 