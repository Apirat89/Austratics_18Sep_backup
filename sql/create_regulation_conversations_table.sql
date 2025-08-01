-- Create regulation_conversations table for conversational chat system
-- This table stores conversation metadata and summaries

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

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_user_id ON regulation_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_created_at ON regulation_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_updated_at ON regulation_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_user_created ON regulation_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_user_updated ON regulation_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_status ON regulation_conversations(status);
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_bookmarked ON regulation_conversations(is_bookmarked) WHERE is_bookmarked = true;
CREATE INDEX IF NOT EXISTS idx_regulation_conversations_title ON regulation_conversations(title) WHERE title IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE regulation_conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation
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

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_regulation_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at handling
CREATE TRIGGER update_regulation_conversations_updated_at
    BEFORE UPDATE ON regulation_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_regulation_conversations_updated_at();

-- Create function to enforce conversation limit per user (500 conversations max)
CREATE OR REPLACE FUNCTION enforce_regulation_conversations_limit()
RETURNS TRIGGER AS $$
DECLARE
    conversation_count INTEGER;
BEGIN
    -- Count current active conversations for this user
    SELECT COUNT(*) INTO conversation_count 
    FROM regulation_conversations 
    WHERE user_id = NEW.user_id AND status = 'active';
    
    -- If user already has 500 conversations, prevent insert
    IF conversation_count >= 500 THEN
        RAISE EXCEPTION 'Maximum of 500 active conversations allowed per user. Please archive some conversations first.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the conversation limit
CREATE TRIGGER enforce_regulation_conversations_limit_trigger
    BEFORE INSERT ON regulation_conversations
    FOR EACH ROW
    EXECUTE FUNCTION enforce_regulation_conversations_limit();

-- Create function to auto-generate conversation titles
CREATE OR REPLACE FUNCTION generate_conversation_title(first_message TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Generate a title from the first message (first 50 characters, clean)
    IF first_message IS NULL OR LENGTH(TRIM(first_message)) = 0 THEN
        RETURN 'New Conversation';
    END IF;
    
    -- Clean and truncate the message for title
    RETURN TRIM(SUBSTRING(REGEXP_REPLACE(first_message, '\s+', ' ', 'g') FROM 1 FOR 50)) || 
           CASE WHEN LENGTH(first_message) > 50 THEN '...' ELSE '' END;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's recent conversations
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

-- Create function to get bookmarked conversations
CREATE OR REPLACE FUNCTION get_user_bookmarked_conversations(
    user_id_param UUID,
    limit_param INTEGER DEFAULT 10
)
RETURNS TABLE (
    id BIGINT,
    title TEXT,
    summary TEXT,
    message_count INTEGER,
    first_message_preview TEXT,
    total_citations INTEGER,
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
        c.total_citations,
        c.created_at,
        c.updated_at
    FROM regulation_conversations c
    WHERE c.user_id = user_id_param 
      AND c.is_bookmarked = true
      AND c.status = 'active'
    ORDER BY c.updated_at DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to archive old conversations (older than 6 months)
CREATE OR REPLACE FUNCTION archive_old_conversations()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    UPDATE regulation_conversations
    SET status = 'archived', archived_at = NOW()
    WHERE status = 'active' 
      AND updated_at < NOW() - INTERVAL '6 months'
      AND is_bookmarked = false;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Regulation conversations table created successfully! 🎉' as status;

-- Comments for documentation
COMMENT ON TABLE regulation_conversations IS 'Stores conversation metadata for the regulation chat system';
COMMENT ON COLUMN regulation_conversations.title IS 'Auto-generated or user-provided conversation title';
COMMENT ON COLUMN regulation_conversations.summary IS 'Brief summary of conversation topic';
COMMENT ON COLUMN regulation_conversations.message_count IS 'Number of messages in this conversation';
COMMENT ON COLUMN regulation_conversations.first_message_preview IS 'Preview of first user message (150 chars)';
COMMENT ON COLUMN regulation_conversations.last_message_preview IS 'Preview of last message (150 chars)';
COMMENT ON COLUMN regulation_conversations.context_summary IS 'AI-generated summary for context compression';
COMMENT ON COLUMN regulation_conversations.total_processing_time IS 'Total AI processing time in seconds';
COMMENT ON COLUMN regulation_conversations.user_rating IS 'Optional 1-5 rating by user';
COMMENT ON COLUMN regulation_conversations.is_bookmarked IS 'Quick bookmark flag';
COMMENT ON COLUMN regulation_conversations.status IS 'Conversation status: active, archived, deleted'; 