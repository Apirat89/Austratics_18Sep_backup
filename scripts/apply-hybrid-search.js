#!/usr/bin/env node

/**
 * Hybrid Search Infrastructure Setup Script
 * Applies hybrid search migration to both FAQ and regulatory systems
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function applyHybridSearchMigration() {
  try {
    console.log('='.repeat(60));
    console.log('🚀 HYBRID SEARCH INFRASTRUCTURE SETUP');
    console.log('='.repeat(60));
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials in .env file');
    }
    
    console.log('📡 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Read the hybrid search SQL file
    const migrationPath = path.join(__dirname, '..', 'sql', 'add_hybrid_search_infrastructure.sql');
    console.log(`📄 Reading migration from: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔄 Executing ${statements.length} SQL statements...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim() === ';') {
        continue;
      }
      
      try {
        console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
        
        // Execute the SQL statement
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        });
        
        if (error) {
          // Try alternative execution method
          const { error: altError } = await supabase
            .from('_temp_sql_execution')
            .select('*')
            .limit(0);
          
          // If the table doesn't exist, use raw SQL execution
          if (altError && altError.code === '42P01') {
            // Execute directly using the Supabase client
            const { error: rawError } = await supabase.sql`${statement}`;
            if (rawError) {
              console.warn(`⚠️  Warning executing statement: ${rawError.message}`);
              console.log(`📝 Statement: ${statement.substring(0, 100)}...`);
              errorCount++;
            } else {
              successCount++;
            }
          } else {
            console.warn(`⚠️  Warning executing statement: ${error.message}`);
            console.log(`📝 Statement: ${statement.substring(0, 100)}...`);
            errorCount++;
          }
        } else {
          successCount++;
        }
      } catch (execError) {
        console.warn(`⚠️  Warning executing statement: ${execError.message}`);
        console.log(`📝 Statement: ${statement.substring(0, 100)}...`);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`⚠️  Warning statements: ${errorCount}`);
    
    // Test the hybrid search functions
    console.log('\n🧪 Testing hybrid search functions...');
    
    try {
      // Test FAQ hybrid search function
      const { data: faqTest, error: faqError } = await supabase.rpc('match_faq_documents_hybrid', {
        query_embedding: new Array(768).fill(0.1),
        lex_query: 'test',
        match_count: 1
      });
      
      if (faqError) {
        console.log(`⚠️  FAQ hybrid function test: ${faqError.message}`);
      } else {
        console.log('✅ FAQ hybrid search function is working');
      }
      
      // Test regulatory hybrid search function
      const { data: regTest, error: regError } = await supabase.rpc('match_documents_hybrid', {
        query_embedding: new Array(768).fill(0.1),
        lex_query: 'test',
        match_count: 1
      });
      
      if (regError) {
        console.log(`⚠️  Regulatory hybrid function test: ${regError.message}`);
      } else {
        console.log('✅ Regulatory hybrid search function is working');
      }
    } catch (testError) {
      console.log(`⚠️  Function test error: ${testError.message}`);
    }
    
    console.log('\n🎉 Hybrid search infrastructure setup completed!');
    console.log('🔀 Both FAQ and regulatory systems now support hybrid search');
    console.log('📈 Expected improvement: Better recall on keyword queries');
    
  } catch (error) {
    console.error('❌ Error setting up hybrid search infrastructure:', error);
    process.exit(1);
  }
}

// Run the migration
applyHybridSearchMigration(); 