-- Create regulation_messages table for conversational chat system
-- This table stores individual messages within conversations

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

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_regulation_messages_conversation_id ON regulation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_regulation_messages_conversation_index ON regulation_messages(conversation_id, message_index);
CREATE INDEX IF NOT EXISTS idx_regulation_messages_role ON regulation_messages(role);
CREATE INDEX IF NOT EXISTS idx_regulation_messages_created_at ON regulation_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_messages_search_intent ON regulation_messages(search_intent) WHERE search_intent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_regulation_messages_feedback ON regulation_messages(feedback_type) WHERE feedback_type IS NOT NULL;

-- Create partial index for assistant messages with citations
CREATE INDEX IF NOT EXISTS idx_regulation_messages_citations ON regulation_messages(conversation_id) 
WHERE role = 'assistant' AND citations IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE regulation_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation
CREATE POLICY "Users can view messages in their own conversations" 
  ON regulation_messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE id = regulation_messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their own conversations" 
  ON regulation_messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE id = regulation_messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their own conversations" 
  ON regulation_messages FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE id = regulation_messages.conversation_id 
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE id = regulation_messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their own conversations" 
  ON regulation_messages FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE id = regulation_messages.conversation_id 
      AND user_id = auth.uid()
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_regulation_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at handling
CREATE TRIGGER update_regulation_messages_updated_at
    BEFORE UPDATE ON regulation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_regulation_messages_updated_at();

-- Create function to update conversation metadata when messages change
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

-- Create function to get conversation messages
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

-- Create function to get conversation context for AI
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

-- Create function to add message to conversation
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

-- Create function to update message feedback
CREATE OR REPLACE FUNCTION update_message_feedback(
    message_id_param BIGINT,
    feedback_type_param TEXT,
    feedback_comment_param TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE regulation_messages
    SET 
        feedback_type = feedback_type_param,
        feedback_comment = feedback_comment_param,
        updated_at = NOW()
    WHERE id = message_id_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Regulation messages table created successfully! 🎉' as status;

-- Comments for documentation
COMMENT ON TABLE regulation_messages IS 'Stores individual messages within regulation conversations';
COMMENT ON COLUMN regulation_messages.message_index IS 'Order within conversation (0, 1, 2, etc.)';
COMMENT ON COLUMN regulation_messages.role IS 'Message sender: user or assistant';
COMMENT ON COLUMN regulation_messages.content IS 'Message content';
COMMENT ON COLUMN regulation_messages.citations IS 'Document citations for assistant responses (JSONB)';
COMMENT ON COLUMN regulation_messages.context_used IS 'Number of context chunks used for assistant response';
COMMENT ON COLUMN regulation_messages.processing_time IS 'AI processing time for this message in seconds';
COMMENT ON COLUMN regulation_messages.search_intent IS 'Categorized intent: question, follow-up, clarification, etc.';
COMMENT ON COLUMN regulation_messages.feedback_type IS 'User feedback: positive or negative';
COMMENT ON COLUMN regulation_messages.feedback_comment IS 'User feedback comment'; 