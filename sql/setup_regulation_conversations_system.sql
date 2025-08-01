-- Master SQL script for setting up the regulation conversations system
-- This script creates the full conversational chat system for the regulation page

-- =============================================================================
-- REGULATION CONVERSATIONS SYSTEM SETUP
-- =============================================================================

-- Drop existing tables if they exist (for clean setup)
-- WARNING: This will delete existing conversation data if re-running
-- DROP TABLE IF EXISTS regulation_messages CASCADE;
-- DROP TABLE IF EXISTS regulation_conversations CASCADE;

-- =============================================================================
-- STEP 1: CREATE CONVERSATIONS TABLE
-- =============================================================================

-- Create regulation_conversations table for conversational chat system
CREATE TABLE IF NOT EXISTS regulation_conversations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Core conversation metadata
  title TEXT, -- Auto-generated or user-provided conversation title
  summary TEXT, -- Brief summary of conversation topic
  message_count INTEGER DEFAULT 0, -- Number of messages in conversation
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE, -- For soft deletion
  
  -- Message previews for quick display
  first_message_preview TEXT, -- Preview of first user message (150 chars)
  last_message_preview TEXT, -- Preview of last message (150 chars)
  
  -- Analytics and metadata
  document_types TEXT[], -- Document types referenced in conversation
  total_citations INTEGER DEFAULT 0, -- Total citations across all messages
  total_processing_time FLOAT DEFAULT 0, -- Total AI processing time in seconds
  
  -- User interaction
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5), -- Optional 1-5 rating
  is_bookmarked BOOLEAN DEFAULT FALSE, -- Quick bookmark flag
  
  -- Performance optimization
  context_summary TEXT, -- AI-generated summary for context compression
  
  -- Conversation status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'))
);

-- =============================================================================
-- STEP 2: CREATE MESSAGES TABLE
-- =============================================================================

-- Create regulation_messages table for individual messages
CREATE TABLE IF NOT EXISTS regulation_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES regulation_conversations(id) ON DELETE CASCADE,
  
  -- Message ordering and identification
  message_index INTEGER NOT NULL, -- Order within conversation (0, 1, 2, etc.)
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')), -- Message sender
  content TEXT NOT NULL, -- Message content
  
  -- AI Response metadata (for assistant messages)
  citations JSONB, -- Document citations for assistant responses
  context_used INTEGER DEFAULT 0, -- Number of context chunks used
  processing_time FLOAT, -- AI processing time for this message in seconds
  
  -- User message metadata
  search_intent TEXT, -- Categorized intent: question, follow-up, clarification, etc.
  
  -- Message status and flags
  is_edited BOOLEAN DEFAULT FALSE, -- Whether message was edited
  is_regenerated BOOLEAN DEFAULT FALSE, -- Whether assistant response was regenerated
  feedback_type TEXT CHECK (feedback_type IN ('positive', 'negative')), -- User feedback
  feedback_comment TEXT, -- User feedback comment
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(conversation_id, message_index)
);

-- =============================================================================
-- STEP 3: CREATE INDEXES
-- =============================================================================

-- Indexes for regulation_conversations
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_user_id ON regulation_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_created_at ON regulation_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_updated_at ON regulation_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_user_created ON regulation_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_user_updated ON regulation_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_status ON regulation_conversations(status);
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_bookmarked ON regulation_conversations(is_bookmarked) WHERE is_bookmarked = true;
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_title ON regulation_conversations(title) WHERE title IS NOT NULL;

-- Indexes for regulation_messages
CREATE INDEX IF NOT EXISTS idx_regulation_messages_conversation_id ON regulation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_regulation_messages_conversation_index ON regulation_messages(conversation_id, message_index);
CREATE INDEX IF NOT EXISTS idx_regulation_messages_role ON regulation_messages(role);
CREATE INDEX IF NOT EXISTS idx_regulation_messages_created_at ON regulation_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_messages_search_intent ON regulation_messages(search_intent) WHERE search_intent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_regulation_messages_feedback ON regulation_messages(feedback_type) WHERE feedback_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_regulation_messages_citations ON regulation_messages(conversation_id) WHERE role = 'assistant' AND citations IS NOT NULL;

-- =============================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS for conversations
ALTER TABLE regulation_conversations ENABLE ROW LEVEL SECURITY;

-- Enable RLS for messages
ALTER TABLE regulation_messages ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 5: CREATE RLS POLICIES
-- =============================================================================

-- RLS policies for conversations
CREATE POLICY "Users can view their own conversations" 
  ON regulation_conversations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" 
  ON regulation_conversations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" 
  ON regulation_conversations FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" 
  ON regulation_conversations FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for messages
CREATE POLICY "Users can view messages in their own conversations" 
  ON regulation_messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE regulation_conversations.id = regulation_messages.conversation_id 
      AND regulation_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their own conversations" 
  ON regulation_messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE regulation_conversations.id = regulation_messages.conversation_id 
      AND regulation_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their own conversations" 
  ON regulation_messages FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE regulation_conversations.id = regulation_messages.conversation_id 
      AND regulation_conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE regulation_conversations.id = regulation_messages.conversation_id 
      AND regulation_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their own conversations" 
  ON regulation_messages FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE regulation_conversations.id = regulation_messages.conversation_id 
      AND regulation_conversations.user_id = auth.uid()
    )
  );

-- =============================================================================
-- STEP 6: CREATE TRIGGERS AND FUNCTIONS
-- =============================================================================

-- Function to update updated_at timestamp for conversations
CREATE OR REPLACE FUNCTION update_regulation_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp for messages
CREATE OR REPLACE FUNCTION update_regulation_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for conversations
CREATE TRIGGER update_regulation_conversations_updated_at
    BEFORE UPDATE ON regulation_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_regulation_conversations_updated_at();

-- Trigger for messages
CREATE TRIGGER update_regulation_messages_updated_at
    BEFORE UPDATE ON regulation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_regulation_messages_updated_at();

-- Function to auto-generate conversation titles
CREATE OR REPLACE FUNCTION generate_conversation_title(first_message TEXT)
RETURNS TEXT AS $$
BEGIN
    IF first_message IS NULL OR LENGTH(TRIM(first_message)) = 0 THEN
        RETURN 'New Conversation';
    END IF;
    
    RETURN TRIM(SUBSTRING(REGEXP_REPLACE(first_message, '\s+', ' ', 'g') FROM 1 FOR 50)) || 
           CASE WHEN LENGTH(first_message) > 50 THEN '...' ELSE '' END;
END;
$$ LANGUAGE plpgsql;

-- Function to update conversation metadata when messages change
CREATE OR REPLACE FUNCTION update_conversation_metadata()
RETURNS TRIGGER AS $$
DECLARE
    first_user_message TEXT;
    last_message TEXT;
    msg_count INTEGER;
    total_proc_time FLOAT;
    total_cites INTEGER;
    doc_types TEXT[];
BEGIN
    -- Get conversation statistics
    SELECT COUNT(*) INTO msg_count
    FROM regulation_messages
    WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id);
    
    -- Get first user message preview
    SELECT content INTO first_user_message
    FROM regulation_messages
    WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
      AND role = 'user'
    ORDER BY message_index ASC
    LIMIT 1;
    
    -- Get last message preview
    SELECT content INTO last_message
    FROM regulation_messages
    WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
    ORDER BY message_index DESC
    LIMIT 1;
    
    -- Calculate total processing time
    SELECT COALESCE(SUM(processing_time), 0) INTO total_proc_time
    FROM regulation_messages
    WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
      AND processing_time IS NOT NULL;
    
    -- Count total citations
    SELECT COUNT(*) INTO total_cites
    FROM regulation_messages
    WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
      AND citations IS NOT NULL
      AND jsonb_array_length(citations) > 0;
    
    -- Extract document types from citations
    SELECT ARRAY_AGG(DISTINCT doc_type) INTO doc_types
    FROM (
        SELECT jsonb_array_elements(citations)->>'document_type' as doc_type
        FROM regulation_messages
        WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
          AND citations IS NOT NULL
          AND jsonb_array_length(citations) > 0
    ) dt
    WHERE doc_type IS NOT NULL;
    
    -- Update conversation metadata
    UPDATE regulation_conversations
    SET 
        message_count = msg_count,
        first_message_preview = LEFT(first_user_message, 150),
        last_message_preview = LEFT(last_message, 150),
        total_processing_time = total_proc_time,
        total_citations = total_cites,
        document_types = doc_types,
        updated_at = NOW(),
        title = CASE 
            WHEN title IS NULL AND first_user_message IS NOT NULL 
            THEN generate_conversation_title(first_user_message)
            ELSE title
        END
    WHERE id = COALESCE(NEW.conversation_id, OLD.conversation_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update conversation metadata
CREATE TRIGGER update_conversation_metadata_on_insert
    AFTER INSERT ON regulation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_metadata();

CREATE TRIGGER update_conversation_metadata_on_update
    AFTER UPDATE ON regulation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_metadata();

CREATE TRIGGER update_conversation_metadata_on_delete
    AFTER DELETE ON regulation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_metadata();

-- =============================================================================
-- STEP 7: CREATE HELPER FUNCTIONS
-- =============================================================================

-- Function to get user's recent conversations
CREATE OR REPLACE FUNCTION get_user_recent_conversations(
    user_id_param UUID,
    limit_param INTEGER DEFAULT 20
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    summary TEXT,
    message_count INTEGER,
    first_message_preview TEXT,
    last_message_preview TEXT,
    total_citations INTEGER,
    is_bookmarked BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.title,
        c.summary,
        c.message_count,
        c.first_message_preview,
        c.last_message_preview,
        c.total_citations,
        c.is_bookmarked,
        c.created_at,
        c.updated_at
    FROM regulation_conversations c
    WHERE c.user_id = user_id_param 
      AND c.status = 'active'
    ORDER BY c.updated_at DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get conversation messages
CREATE OR REPLACE FUNCTION get_conversation_messages(
    conversation_id_param BIGINT,
    user_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
    id BIGINT,
    message_index INTEGER,
    role TEXT,
    content TEXT,
    citations JSONB,
    context_used INTEGER,
    processing_time FLOAT,
    search_intent TEXT,
    feedback_type TEXT,
    feedback_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    -- Verify user has access to this conversation
    IF user_id_param IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM regulation_conversations 
            WHERE id = conversation_id_param AND user_id = user_id_param
        ) THEN
            RAISE EXCEPTION 'Access denied to conversation %', conversation_id_param;
        END IF;
    END IF;
    
    RETURN QUERY
    SELECT 
        m.id,
        m.message_index,
        m.role,
        m.content,
        m.citations,
        m.context_used,
        m.processing_time,
        m.search_intent,
        m.feedback_type,
        m.feedback_comment,
        m.created_at,
        m.updated_at
    FROM regulation_messages m
    WHERE m.conversation_id = conversation_id_param
    ORDER BY m.message_index ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to add message to conversation
CREATE OR REPLACE FUNCTION add_message_to_conversation(
    conversation_id_param BIGINT,
    role_param TEXT,
    content_param TEXT,
    citations_param JSONB DEFAULT NULL,
    context_used_param INTEGER DEFAULT 0,
    processing_time_param FLOAT DEFAULT NULL,
    search_intent_param TEXT DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    next_index INTEGER;
    new_message_id BIGINT;
BEGIN
    -- Get next message index
    SELECT COALESCE(MAX(message_index) + 1, 0) INTO next_index
    FROM regulation_messages
    WHERE conversation_id = conversation_id_param;
    
    -- Insert new message
    INSERT INTO regulation_messages (
        conversation_id,
        message_index,
        role,
        content,
        citations,
        context_used,
        processing_time,
        search_intent
    )
    VALUES (
        conversation_id_param,
        next_index,
        role_param,
        content_param,
        citations_param,
        context_used_param,
        processing_time_param,
        search_intent_param
    )
    RETURNING id INTO new_message_id;
    
    RETURN new_message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get conversation context for AI
CREATE OR REPLACE FUNCTION get_conversation_context(
    conversation_id_param BIGINT,
    max_messages INTEGER DEFAULT 10
)
RETURNS TABLE (
    role TEXT,
    content TEXT,
    message_index INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.role,
        m.content,
        m.message_index
    FROM regulation_messages m
    WHERE m.conversation_id = conversation_id_param
    ORDER BY m.message_index DESC
    LIMIT max_messages;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 8: CREATE MIGRATION FUNCTIONS
-- =============================================================================

-- Create backup of existing data
CREATE TABLE IF NOT EXISTS regulation_search_history_backup AS 
SELECT * FROM regulation_search_history;

-- Main migration function
CREATE OR REPLACE FUNCTION migrate_regulation_history_to_conversations()
RETURNS TABLE (
    migrated_users INTEGER,
    migrated_conversations INTEGER,
    migrated_messages INTEGER,
    skipped_records INTEGER,
    migration_errors TEXT[]
) AS $$
DECLARE
    user_record RECORD;
    history_record RECORD;
    new_conversation_id BIGINT;
    migrated_users_count INTEGER := 0;
    migrated_conversations_count INTEGER := 0;
    migrated_messages_count INTEGER := 0;
    skipped_records_count INTEGER := 0;
    errors TEXT[] := ARRAY[]::TEXT[];
    error_message TEXT;
    
BEGIN
    RAISE NOTICE 'Starting migration of regulation_search_history to conversations...';
    
    FOR user_record IN (
        SELECT DISTINCT user_id 
        FROM regulation_search_history 
        WHERE user_id IS NOT NULL
        ORDER BY user_id
    ) LOOP
        
        BEGIN
            FOR history_record IN (
                SELECT * 
                FROM regulation_search_history 
                WHERE user_id = user_record.user_id
                ORDER BY updated_at ASC
            ) LOOP
            
                BEGIN
                    -- Skip records with no search term
                    IF history_record.search_term IS NULL OR LENGTH(TRIM(history_record.search_term)) = 0 THEN
                        skipped_records_count := skipped_records_count + 1;
                        CONTINUE;
                    END IF;
                    
                    -- Create new conversation
                    INSERT INTO regulation_conversations (
                        user_id,
                        title,
                        summary,
                        message_count,
                        first_message_preview,
                        last_message_preview,
                        document_types,
                        total_citations,
                        total_processing_time,
                        status,
                        created_at,
                        updated_at
                    ) VALUES (
                        history_record.user_id,
                        generate_conversation_title(history_record.search_term),
                        'Historical search: ' || LEFT(COALESCE(history_record.response_preview, ''), 100),
                        2,
                        LEFT(history_record.search_term, 150),
                        LEFT(COALESCE(history_record.response_preview, 'Response data not available'), 150),
                        COALESCE(history_record.document_types, ARRAY[]::TEXT[]),
                        COALESCE(history_record.citations_count, 0),
                        COALESCE(history_record.processing_time, 0),
                        'active',
                        COALESCE(history_record.created_at, NOW()),
                        COALESCE(history_record.updated_at, NOW())
                    ) RETURNING id INTO new_conversation_id;
                    
                    -- Create user message
                    INSERT INTO regulation_messages (
                        conversation_id, message_index, role, content, search_intent, created_at, updated_at
                    ) VALUES (
                        new_conversation_id, 0, 'user', history_record.search_term, 'question',
                        COALESCE(history_record.created_at, NOW()),
                        COALESCE(history_record.created_at, NOW())
                    );
                    
                    -- Create assistant message
                    INSERT INTO regulation_messages (
                        conversation_id, message_index, role, content, citations, processing_time, created_at, updated_at
                    ) VALUES (
                        new_conversation_id, 1, 'assistant', 
                        COALESCE(history_record.response_preview, 'Response data not available'),
                        '[]'::JSONB, COALESCE(history_record.processing_time, 0),
                        COALESCE(history_record.updated_at, NOW()),
                        COALESCE(history_record.updated_at, NOW())
                    );
                    
                    migrated_conversations_count := migrated_conversations_count + 1;
                    migrated_messages_count := migrated_messages_count + 2;
                    
                EXCEPTION
                    WHEN OTHERS THEN
                        errors := array_append(errors, SQLERRM);
                        skipped_records_count := skipped_records_count + 1;
                END;
            END LOOP;
            
            migrated_users_count := migrated_users_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                errors := array_append(errors, SQLERRM);
        END;
    END LOOP;
    
    RAISE NOTICE 'Migration completed: Users: %, Conversations: %, Messages: %, Skipped: %', 
        migrated_users_count, migrated_conversations_count, migrated_messages_count, skipped_records_count;
    
    RETURN QUERY SELECT migrated_users_count, migrated_conversations_count, migrated_messages_count, skipped_records_count, errors;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 9: CREATE VERIFICATION FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION verify_migration_integrity()
RETURNS TABLE (
    check_name TEXT,
    expected_value BIGINT,
    actual_value BIGINT,
    status TEXT
) AS $$
DECLARE
    original_users BIGINT;
    original_records BIGINT;
    migrated_users BIGINT;
    migrated_conversations BIGINT;
    migrated_messages BIGINT;
BEGIN
    SELECT COUNT(DISTINCT user_id) INTO original_users FROM regulation_search_history WHERE user_id IS NOT NULL;
    SELECT COUNT(*) INTO original_records FROM regulation_search_history WHERE user_id IS NOT NULL AND search_term IS NOT NULL;
    SELECT COUNT(DISTINCT user_id) INTO migrated_users FROM regulation_conversations;
    SELECT COUNT(*) INTO migrated_conversations FROM regulation_conversations;
    SELECT COUNT(*) INTO migrated_messages FROM regulation_messages;
    
    RETURN QUERY VALUES
        ('Original Users', original_users, migrated_users, 
         CASE WHEN original_users = migrated_users THEN 'PASS' ELSE 'FAIL' END),
        ('Original Records', original_records, migrated_conversations,
         CASE WHEN original_records = migrated_conversations THEN 'PASS' ELSE 'FAIL' END),
        ('Expected Messages', original_records * 2, migrated_messages,
         CASE WHEN original_records * 2 = migrated_messages THEN 'PASS' ELSE 'FAIL' END);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- STEP 10: SUCCESS MESSAGE AND INSTRUCTIONS
-- =============================================================================

SELECT '🎉 REGULATION CONVERSATIONS SYSTEM SETUP COMPLETE! 🎉' as status;

SELECT '
=======================================================
NEXT STEPS:
=======================================================

1. RUN MIGRATION:
   SELECT * FROM migrate_regulation_history_to_conversations();

2. VERIFY MIGRATION:
   SELECT * FROM verify_migration_integrity();

3. TEST THE SYSTEM:
   -- Create a test conversation
   INSERT INTO regulation_conversations (user_id, title) 
   VALUES (auth.uid(), ''Test Conversation'');
   
   -- Add a test message
   SELECT add_message_to_conversation(
     (SELECT id FROM regulation_conversations WHERE title = ''Test Conversation'' LIMIT 1),
     ''user'',
     ''Test message''
   );

4. VIEW YOUR CONVERSATIONS:
   SELECT * FROM get_user_recent_conversations(auth.uid());

=======================================================
TABLES CREATED:
- regulation_conversations (conversation metadata)
- regulation_messages (individual messages)

FUNCTIONS CREATED:
- get_user_recent_conversations()
- get_conversation_messages()
- add_message_to_conversation()
- get_conversation_context()
- migrate_regulation_history_to_conversations()
- verify_migration_integrity()

Ready for Phase 2: Backend API Enhancement! 🚀
=======================================================' as instructions;

-- Comments for documentation
COMMENT ON TABLE regulation_conversations IS 'Stores conversation metadata for regulation chat system';
COMMENT ON TABLE regulation_messages IS 'Stores individual messages within regulation conversations'; 