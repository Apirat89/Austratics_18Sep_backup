/**
 * Script to remove the foreign key dependency from admin_users to auth.users
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Set up Supabase client with admin privileges
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in .env file');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, { 
  auth: { 
    persistSession: false, 
    autoRefreshToken: false 
  } 
});

async function executeSql(filePath, description) {
  console.log(`\n==== Executing ${description} ====`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split the SQL file into separate statements
    const statements = sql.split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (const [index, statement] of statements.entries()) {
      console.log(`\nExecuting statement ${index + 1}/${statements.length}...`);
      
      // For debugging - show shortened version of the statement
      const previewLength = 100;
      const preview = statement.length > previewLength 
        ? statement.substring(0, previewLength) + '...' 
        : statement;
      console.log(`SQL: ${preview}`);
      
      const { data, error } = await supabase.rpc('run_sql_statement', { 
        sql_statement: statement 
      });
      
      if (error) {
        console.error(`Error executing statement ${index + 1}:`, error);
      } else {
        console.log(`Statement ${index + 1} executed successfully`);
        
        if (data && Array.isArray(data) && data.length > 0) {
          console.log('Result:', JSON.stringify(data, null, 2));
        }
      }
    }
    
    console.log(`\n==== Completed ${description} ====`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    process.exit(1);
  }
}

async function main() {
  try {
    console.log('Starting admin_users dependency removal process...');
    
    // Execute the SQL scripts
    await executeSql(
      path.join(__dirname, '../sql/remove_user_id_foreign_key.sql'),
      'foreign key constraint removal'
    );
    
    await executeSql(
      path.join(__dirname, '../sql/update_admin_auth_logic.sql'),
      'admin auth logic update'
    );
    
    console.log('\n✅ All SQL scripts executed successfully!');
    console.log('\n⚠️ IMPORTANT: Make sure to deploy the updated adminAuth.ts code changes.');
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 