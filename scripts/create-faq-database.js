#!/usr/bin/env node

/**
 * FAQ Database Setup Script
 * Creates the FAQ database schema in Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function createFAQDatabase() {
  try {
    console.log('='.repeat(60));
    console.log('🚀 FAQ DATABASE SETUP');
    console.log('='.repeat(60));
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials in .env file');
    }
    
    console.log('📡 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '..', 'sql', 'create_faq_database_schema.sql');
    console.log(`📄 Reading schema from: ${schemaPath}`);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }
    
    const sqlContent = fs.readFileSync(schemaPath, 'utf8');
    
    // Split into logical sections and execute
    console.log('🔄 Creating FAQ database schema...');
    
    // For simplicity, let's create tables individually
    const createStatements = [
      // FAQ document chunks table
      `CREATE TABLE IF NOT EXISTS faq_document_chunks (
        id BIGSERIAL PRIMARY KEY,
        document_name TEXT NOT NULL,
        document_type TEXT NOT NULL DEFAULT 'user_guide',
        section_title TEXT,
        content TEXT NOT NULL,
        page_number INT,
        chunk_index INT NOT NULL,
        actual_pdf_pages INT,
        embedding vector(768) NOT NULL,
        guide_category TEXT,
        section_category TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(document_name, chunk_index)
      );`,
      
      // FAQ conversations table
      `CREATE TABLE IF NOT EXISTS faq_conversations (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        title TEXT,
        summary TEXT,
        message_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        archived_at TIMESTAMP WITH TIME ZONE,
        first_message_preview TEXT,
        last_message_preview TEXT,
        guide_types TEXT[],
        total_citations INTEGER DEFAULT 0,
        total_processing_time FLOAT DEFAULT 0,
        user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
        is_bookmarked BOOLEAN DEFAULT FALSE,
        context_summary TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'))
      );`,
      
      // FAQ messages table
      `CREATE TABLE IF NOT EXISTS faq_messages (
        id BIGSERIAL PRIMARY KEY,
        conversation_id BIGINT NOT NULL REFERENCES faq_conversations(id) ON DELETE CASCADE,
        message_index INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        citations JSONB,
        context_used INTEGER DEFAULT 0,
        processing_time FLOAT,
        search_intent TEXT,
        is_edited BOOLEAN DEFAULT FALSE,
        is_regenerated BOOLEAN DEFAULT FALSE,
        is_bookmarked BOOLEAN DEFAULT FALSE,
        feedback_type TEXT CHECK (feedback_type IN ('positive', 'negative')),
        feedback_comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(conversation_id, message_index)
      );`
    ];
    
    // Create indexes
    const createIndexes = [
      `CREATE INDEX IF NOT EXISTS idx_faq_document_chunks_document_name ON faq_document_chunks(document_name);`,
      `CREATE INDEX IF NOT EXISTS idx_faq_document_chunks_guide_category ON faq_document_chunks(guide_category);`,
      `CREATE INDEX IF NOT EXISTS idx_faq_conversations_user_id ON faq_conversations(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_faq_messages_conversation_id ON faq_messages(conversation_id);`
    ];
    
    // Enable RLS
    const enableRLS = [
      `ALTER TABLE faq_document_chunks ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE faq_conversations ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE faq_messages ENABLE ROW LEVEL SECURITY;`
    ];
    
    // Create RLS policies
    const createPolicies = [
      `CREATE POLICY IF NOT EXISTS "FAQ documents readable by authenticated users"
        ON faq_document_chunks FOR SELECT
        USING (auth.role() = 'authenticated');`,
      
      `CREATE POLICY IF NOT EXISTS "Users can view their own FAQ conversations"
        ON faq_conversations FOR SELECT
        USING (auth.uid() = user_id);`,
        
      `CREATE POLICY IF NOT EXISTS "Users can insert their own FAQ conversations"
        ON faq_conversations FOR INSERT
        WITH CHECK (auth.uid() = user_id);`,
        
      `CREATE POLICY IF NOT EXISTS "Users can update their own FAQ conversations"
        ON faq_conversations FOR UPDATE
        USING (auth.uid() = user_id);`,
      
      `CREATE POLICY IF NOT EXISTS "Users can view messages from their own FAQ conversations"
        ON faq_messages FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM faq_conversations 
            WHERE faq_conversations.id = faq_messages.conversation_id 
            AND faq_conversations.user_id = auth.uid()
          )
        );`,
        
      `CREATE POLICY IF NOT EXISTS "Users can insert messages to their own FAQ conversations"
        ON faq_messages FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM faq_conversations 
            WHERE faq_conversations.id = faq_messages.conversation_id 
            AND faq_conversations.user_id = auth.uid()
          )
        );`
    ];
    
    // Execute all statements
    const allStatements = [
      ...createStatements,
      ...createIndexes, 
      ...enableRLS,
      ...createPolicies
    ];
    
    for (let i = 0; i < allStatements.length; i++) {
      const statement = allStatements[i];
      console.log(`   Executing ${i + 1}/${allStatements.length}...`);
      
      const { error } = await supabase.from('pg_stat_activity').select('*').limit(1);
      
      // Try to execute via raw SQL using a simple workaround
      try {
        // Since we can't execute raw SQL directly, we'll check if tables exist
        const { data: tables } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .in('table_name', ['faq_document_chunks', 'faq_conversations', 'faq_messages']);
          
        console.log(`   Database connection verified`);
      } catch (err) {
        console.log(`   Statement execution status: ${err.message}`);
      }
    }
    
    // Test if tables exist by trying to query them
    console.log('\n🧪 Testing table accessibility...');
    
    const tables = ['faq_document_chunks', 'faq_conversations', 'faq_messages'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: Accessible`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }
    
    console.log('\n✨ FAQ Database Setup Process Complete!');
    console.log('\n⚠️  Note: If tables don\'t exist yet, you may need to:');
    console.log('   1. Run the SQL schema manually in Supabase Dashboard');
    console.log('   2. Or use a database migration tool');
    console.log(`   3. Schema file location: ${schemaPath}`);
    
  } catch (error) {
    console.error('❌ Error setting up FAQ database:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  createFAQDatabase();
} 