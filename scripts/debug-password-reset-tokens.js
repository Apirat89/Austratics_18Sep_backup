const { createResetToken, validateResetToken, markTokenAsUsed } = require('./load-modules').loadAuthTokens();

async function debugPasswordResetTokens() {
  console.log('🔍 DEBUGGING: Password Reset Token System');
  console.log('='.repeat(60));

  const testEmail = 'apirat.kongchanagul@gmail.com';
  
  try {
    // Test 1: Token Creation
    console.log('\n1. TESTING TOKEN CREATION:');
    console.log(`Testing with email: ${testEmail}`);
    
    const createResult = await createResetToken(testEmail);
    console.log('Create result:', createResult);
    
    if (!createResult.success || !createResult.token) {
      console.log('❌ CRITICAL: Token creation failed!');
      return;
    }
    
    const testToken = createResult.token;
    console.log(`✅ Token created: ${testToken.substring(0, 16)}...`);
    
    // Test 2: Immediate Token Validation
    console.log('\n2. TESTING IMMEDIATE TOKEN VALIDATION:');
    const validateResult = await validateResetToken(testToken);
    console.log('Validation result:', validateResult);
    
    if (!validateResult.valid) {
      console.log('❌ CRITICAL: Token validation failed immediately after creation!');
      console.log(`❌ Error: ${validateResult.error}`);
      return;
    }
    
    console.log('✅ Token validation successful');
    console.log(`✅ User ID: ${validateResult.userId}`);
    console.log(`✅ Email: ${validateResult.email}`);
    
    // Test 3: Test the exact token from your email
    console.log('\n3. TESTING ACTUAL EMAIL TOKEN:');
    const actualToken = '9466828c942c51cd66d9abe5293e00f51931aa0610379e0206a55b85811656a7';
    console.log(`Testing token from email: ${actualToken.substring(0, 16)}...`);
    
    const actualValidateResult = await validateResetToken(actualToken);
    console.log('Actual token validation result:', actualValidateResult);
    
    if (!actualValidateResult.valid) {
      console.log('❌ EMAIL TOKEN INVALID!');
      console.log(`❌ Reason: ${actualValidateResult.error}`);
    } else {
      console.log('✅ Email token is valid');
    }
    
    // Test 4: Check user existence in Supabase
    console.log('\n4. CHECKING USER EXISTENCE:');
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.log('❌ Error fetching users:', userError);
      return;
    }
    
    const user = users.users.find(u => u.email === testEmail);
    if (user) {
      console.log(`✅ User exists in Supabase: ${user.id}`);
    } else {
      console.log('❌ CRITICAL: User does NOT exist in Supabase users table!');
      console.log('❌ This would cause token creation to fail silently');
    }
    
    console.log('\n5. MEMORY STORAGE CHECK:');
    console.log('Environment check:');
    console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`- UPSTASH_REDIS_REST_URL present: ${!!process.env.UPSTASH_REDIS_REST_URL}`);
    console.log(`- UPSTASH_REDIS_REST_TOKEN present: ${!!process.env.UPSTASH_REDIS_REST_TOKEN}`);
    console.log(`- Using production Redis: ${process.env.NODE_ENV === 'production' && process.env.UPSTASH_REDIS_REST_URL}`);
    
  } catch (error) {
    console.error('❌ Unexpected error during token debugging:', error);
  }
}

// Run the debug
debugPasswordResetTokens().catch(console.error); 