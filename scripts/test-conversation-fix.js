const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const testConversationFix = async () => {
  console.log('🧪 Testing conversation loading as frontend does...');
  
  try {
    // First, let's simulate user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('⚠️  No authenticated user, using mock user ID');
      // Use the user ID from the sample conversation we saw earlier
      const mockUserId = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5';
      
      // Test get_conversation_messages with the real user ID
      console.log('Testing get_conversation_messages with real user ID...');
      const { data, error } = await supabase
        .rpc('get_conversation_messages', {
          conversation_id_param: 2,
          user_id_param: mockUserId
        });
      
      if (error) {
        console.error('❌ Still getting error:', error);
        console.log('\n💡 Let me try a different approach...');
        
        // Test if we can query messages directly
        const { data: directData, error: directError } = await supabase
          .from('regulation_messages')
          .select('*')
          .eq('conversation_id', 2);
        
        if (directError) {
          console.error('❌ Direct query also fails:', directError);
        } else {
          console.log('✅ Direct query works, found messages:', directData.length);
        }
        
      } else {
        console.log('✅ SUCCESS! get_conversation_messages works');
        console.log('Found messages:', data.length);
        if (data.length > 0) {
          console.log('Sample message:', data[0]);
        }
      }
    } else {
      console.log('✅ User authenticated:', user.id);
    }
    
  } catch (error) {
    console.error('Error testing conversation fix:', error);
  }
};

testConversationFix(); 