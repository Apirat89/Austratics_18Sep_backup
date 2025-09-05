-- =============================================================================
-- FAQ DATABASE SCHEMA CREATION
-- =============================================================================
-- This script creates all FAQ-specific tables parallel to the regulation system
-- for complete data isolation between FAQ and regulation chatbots

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- STEP 1: FAQ DOCUMENT CHUNKS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS faq_document_chunks (
  id BIGSERIAL PRIMARY KEY,
  
  -- Document metadata
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'user_guide',
  section_title TEXT,
  
  -- Content and structure
  content TEXT NOT NULL,
  page_number INT,
  chunk_index INT NOT NULL,
  actual_pdf_pages INT, -- Total pages in source document
  
  -- Vector embedding for semantic search
  embedding vector(768) NOT NULL,
  
  -- FAQ-specific metadata
  guide_category TEXT, -- homecare, residential, maps, news, sa2
  section_category TEXT, -- getting_started, features, troubleshooting, etc.
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(document_name, chunk_index)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_faq_document_chunks_document_name ON faq_document_chunks(document_name);
CREATE INDEX IF NOT EXISTS idx_faq_document_chunks_document_type ON faq_document_chunks(document_type);
CREATE INDEX IF NOT EXISTS idx_faq_document_chunks_guide_category ON faq_document_chunks(guide_category);
CREATE INDEX IF NOT EXISTS idx_faq_document_chunks_section_category ON faq_document_chunks(section_category);
CREATE INDEX IF NOT EXISTS idx_faq_document_chunks_chunk_index ON faq_document_chunks(document_name, chunk_index);

-- HNSW index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_faq_document_chunks_embedding_hnsw 
ON faq_document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- =============================================================================
-- STEP 2: FAQ CONVERSATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS faq_conversations (
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
  guide_types TEXT[], -- Guide types referenced in conversation
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

-- Create indexes for FAQ conversations
CREATE INDEX IF NOT EXISTS idx_faq_conversations_user_id ON faq_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_faq_conversations_created_at ON faq_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_conversations_updated_at ON faq_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_conversations_user_created ON faq_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_conversations_user_updated ON faq_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_conversations_status ON faq_conversations(status);
CREATE INDEX IF NOT EXISTS idx_faq_conversations_bookmarked ON faq_conversations(is_bookmarked) WHERE is_bookmarked = TRUE;

-- =============================================================================
-- STEP 3: FAQ MESSAGES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS faq_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES faq_conversations(id) ON DELETE CASCADE,
  
  -- Message ordering and identification
  message_index INTEGER NOT NULL, -- Order within conversation (0, 1, 2, etc.)
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')), -- Message sender
  content TEXT NOT NULL, -- Message content
  
  -- AI Response metadata (for assistant messages)
  citations JSONB, -- FAQ document citations for assistant responses
  context_used INTEGER DEFAULT 0, -- Number of context chunks used
  processing_time FLOAT, -- AI processing time for this message in seconds
  
  -- User message metadata
  search_intent TEXT, -- Categorized intent: question, follow-up, clarification, etc.
  
  -- Message status and flags
  is_edited BOOLEAN DEFAULT FALSE, -- Whether message was edited
  is_regenerated BOOLEAN DEFAULT FALSE, -- Whether assistant response was regenerated
  is_bookmarked BOOLEAN DEFAULT FALSE, -- Individual message bookmark
  feedback_type TEXT CHECK (feedback_type IN ('positive', 'negative')), -- User feedback
  feedback_comment TEXT, -- User feedback comment
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(conversation_id, message_index)
);

-- Create indexes for FAQ messages
CREATE INDEX IF NOT EXISTS idx_faq_messages_conversation_id ON faq_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_faq_messages_conversation_index ON faq_messages(conversation_id, message_index);
CREATE INDEX IF NOT EXISTS idx_faq_messages_role ON faq_messages(role);
CREATE INDEX IF NOT EXISTS idx_faq_messages_created_at ON faq_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_messages_search_intent ON faq_messages(search_intent) WHERE search_intent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_faq_messages_bookmarked ON faq_messages(is_bookmarked) WHERE is_bookmarked = TRUE;

-- =============================================================================
-- STEP 4: FAQ SEARCH HISTORY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS faq_search_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Search metadata
  search_term TEXT NOT NULL,
  search_type TEXT DEFAULT 'general' CHECK (search_type IN ('general', 'guide_specific', 'feature_lookup')),
  guide_category TEXT, -- homecare, residential, maps, news, sa2
  
  -- Results metadata
  results_count INTEGER DEFAULT 0,
  response_generated BOOLEAN DEFAULT FALSE,
  
  -- Conversation linkage
  conversation_id BIGINT REFERENCES faq_conversations(id) ON DELETE SET NULL,
  message_id BIGINT REFERENCES faq_messages(id) ON DELETE SET NULL,
  
  -- Performance metrics
  search_duration_ms INTEGER,
  ai_processing_time_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for FAQ search history
CREATE INDEX IF NOT EXISTS idx_faq_search_history_user_id ON faq_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_faq_search_history_created_at ON faq_search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_search_history_user_created ON faq_search_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_search_history_search_term ON faq_search_history USING gin(search_term gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_faq_search_history_guide_category ON faq_search_history(guide_category);
CREATE INDEX IF NOT EXISTS idx_faq_search_history_conversation ON faq_search_history(conversation_id) WHERE conversation_id IS NOT NULL;

-- =============================================================================
-- STEP 5: FAQ BOOKMARKS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS faq_bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Bookmark target (message or conversation)
  message_id BIGINT REFERENCES faq_messages(id) ON DELETE CASCADE,
  conversation_id BIGINT REFERENCES faq_conversations(id) ON DELETE CASCADE,
  
  -- Bookmark metadata
  bookmark_type TEXT NOT NULL CHECK (bookmark_type IN ('message', 'conversation')),
  title TEXT, -- User-provided or auto-generated title
  notes TEXT, -- User notes about the bookmark
  tags TEXT[], -- User-defined tags for organization
  
  -- Quick access data (denormalized for performance)
  preview_text TEXT, -- First 200 chars of content
  guide_categories TEXT[], -- Categories referenced in bookmarked content
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (
    (bookmark_type = 'message' AND message_id IS NOT NULL AND conversation_id IS NULL) OR
    (bookmark_type = 'conversation' AND conversation_id IS NOT NULL AND message_id IS NULL)
  )
);

-- Create indexes for FAQ bookmarks
CREATE INDEX IF NOT EXISTS idx_faq_bookmarks_user_id ON faq_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_faq_bookmarks_created_at ON faq_bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_bookmarks_user_created ON faq_bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_bookmarks_message_id ON faq_bookmarks(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_faq_bookmarks_conversation_id ON faq_bookmarks(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_faq_bookmarks_type ON faq_bookmarks(bookmark_type);
CREATE INDEX IF NOT EXISTS idx_faq_bookmarks_tags ON faq_bookmarks USING gin(tags);

-- =============================================================================
-- STEP 6: FAQ FEEDBACK TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS faq_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Feedback target
  message_id BIGINT REFERENCES faq_messages(id) ON DELETE CASCADE,
  conversation_id BIGINT REFERENCES faq_conversations(id) ON DELETE CASCADE,
  
  -- Feedback content
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative', 'report', 'suggestion')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  -- Categorization
  category TEXT CHECK (category IN ('accuracy', 'helpfulness', 'clarity', 'completeness', 'other')),
  subcategory TEXT,
  
  -- Context
  user_query TEXT, -- The query that led to this feedback
  guide_context TEXT, -- Which guide was being referenced
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for FAQ feedback
CREATE INDEX IF NOT EXISTS idx_faq_feedback_user_id ON faq_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_faq_feedback_created_at ON faq_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_feedback_message_id ON faq_feedback(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_faq_feedback_conversation_id ON faq_feedback(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_faq_feedback_type ON faq_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_faq_feedback_category ON faq_feedback(category);
CREATE INDEX IF NOT EXISTS idx_faq_feedback_status ON faq_feedback(status);

-- =============================================================================
-- STEP 7: ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all FAQ tables
ALTER TABLE faq_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_feedback ENABLE ROW LEVEL SECURITY;

-- FAQ document chunks - readable by all authenticated users
CREATE POLICY "FAQ documents are readable by authenticated users"
  ON faq_document_chunks FOR SELECT
  USING (auth.role() = 'authenticated');

-- FAQ conversations - users can only access their own
CREATE POLICY "Users can view their own FAQ conversations"
  ON faq_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own FAQ conversations"
  ON faq_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FAQ conversations"
  ON faq_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FAQ conversations"
  ON faq_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- FAQ messages - users can only access messages from their conversations
CREATE POLICY "Users can view messages from their own FAQ conversations"
  ON faq_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM faq_conversations 
      WHERE faq_conversations.id = faq_messages.conversation_id 
      AND faq_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their own FAQ conversations"
  ON faq_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM faq_conversations 
      WHERE faq_conversations.id = faq_messages.conversation_id 
      AND faq_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their own FAQ conversations"
  ON faq_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM faq_conversations 
      WHERE faq_conversations.id = faq_messages.conversation_id 
      AND faq_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages from their own FAQ conversations"
  ON faq_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM faq_conversations 
      WHERE faq_conversations.id = faq_messages.conversation_id 
      AND faq_conversations.user_id = auth.uid()
    )
  );

-- FAQ search history - users can only access their own
CREATE POLICY "Users can view their own FAQ search history"
  ON faq_search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own FAQ search history"
  ON faq_search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FAQ search history"
  ON faq_search_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FAQ search history"
  ON faq_search_history FOR DELETE
  USING (auth.uid() = user_id);

-- FAQ bookmarks - users can only access their own
CREATE POLICY "Users can view their own FAQ bookmarks"
  ON faq_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own FAQ bookmarks"
  ON faq_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FAQ bookmarks"
  ON faq_bookmarks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FAQ bookmarks"
  ON faq_bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- FAQ feedback - users can only access their own
CREATE POLICY "Users can view their own FAQ feedback"
  ON faq_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own FAQ feedback"
  ON faq_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FAQ feedback"
  ON faq_feedback FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================================================
-- STEP 8: FAQ VECTOR SEARCH FUNCTIONS
-- =============================================================================

-- Function to search FAQ documents by vector similarity
CREATE OR REPLACE FUNCTION match_faq_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  document_name text,
  document_type text,
  section_title text,
  content text,
  page_number int,
  chunk_index int,
  guide_category text,
  section_category text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    faq_document_chunks.id,
    faq_document_chunks.document_name,
    faq_document_chunks.document_type,
    faq_document_chunks.section_title,
    faq_document_chunks.content,
    faq_document_chunks.page_number,
    faq_document_chunks.chunk_index,
    faq_document_chunks.guide_category,
    faq_document_chunks.section_category,
    1 - (faq_document_chunks.embedding <=> query_embedding) as similarity
  FROM faq_document_chunks
  WHERE 1 - (faq_document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY faq_document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to search FAQ documents by guide category
CREATE OR REPLACE FUNCTION match_faq_documents_by_category (
  query_embedding vector(768),
  filter_guide_category text,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  document_name text,
  document_type text,
  section_title text,
  content text,
  page_number int,
  chunk_index int,
  guide_category text,
  section_category text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    faq_document_chunks.id,
    faq_document_chunks.document_name,
    faq_document_chunks.document_type,
    faq_document_chunks.section_title,
    faq_document_chunks.content,
    faq_document_chunks.page_number,
    faq_document_chunks.chunk_index,
    faq_document_chunks.guide_category,
    faq_document_chunks.section_category,
    1 - (faq_document_chunks.embedding <=> query_embedding) as similarity
  FROM faq_document_chunks
  WHERE 1 - (faq_document_chunks.embedding <=> query_embedding) > match_threshold
    AND faq_document_chunks.guide_category = filter_guide_category
  ORDER BY faq_document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =============================================================================
-- STEP 9: FAQ RPC FUNCTIONS FOR CONVERSATION MANAGEMENT
-- =============================================================================

-- Function to add message to FAQ conversation
CREATE OR REPLACE FUNCTION add_message_to_faq_conversation(
  conversation_id bigint,
  role text,
  content text,
  citations jsonb DEFAULT NULL,
  context_used int DEFAULT 0,
  processing_time float DEFAULT NULL,
  search_intent text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  message_id bigint;
  next_index int;
BEGIN
  -- Get the next message index for this conversation
  SELECT COALESCE(MAX(message_index), -1) + 1
  INTO next_index
  FROM faq_messages
  WHERE faq_messages.conversation_id = add_message_to_faq_conversation.conversation_id;
  
  -- Insert the new message
  INSERT INTO faq_messages (
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
    add_message_to_faq_conversation.conversation_id,
    next_index,
    add_message_to_faq_conversation.role,
    add_message_to_faq_conversation.content,
    add_message_to_faq_conversation.citations,
    add_message_to_faq_conversation.context_used,
    add_message_to_faq_conversation.processing_time,
    add_message_to_faq_conversation.search_intent
  )
  RETURNING id INTO message_id;
  
  -- Update conversation metadata
  UPDATE faq_conversations 
  SET 
    message_count = message_count + 1,
    updated_at = NOW(),
    last_message_preview = LEFT(add_message_to_faq_conversation.content, 150),
    total_citations = total_citations + COALESCE(jsonb_array_length(add_message_to_faq_conversation.citations), 0),
    total_processing_time = total_processing_time + COALESCE(add_message_to_faq_conversation.processing_time, 0)
  WHERE id = add_message_to_faq_conversation.conversation_id;
  
  -- Set first_message_preview if this is the first message
  IF next_index = 0 THEN
    UPDATE faq_conversations
    SET first_message_preview = LEFT(add_message_to_faq_conversation.content, 150)
    WHERE id = add_message_to_faq_conversation.conversation_id;
  END IF;
  
  RETURN message_id;
END;
$$;

-- Function to get FAQ conversation messages
CREATE OR REPLACE FUNCTION get_faq_conversation_messages(conversation_id bigint)
RETURNS TABLE (
  id bigint,
  message_index int,
  role text,
  content text,
  citations jsonb,
  context_used int,
  processing_time float,
  search_intent text,
  is_bookmarked boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    m.is_bookmarked,
    m.created_at,
    m.updated_at
  FROM faq_messages m
  JOIN faq_conversations c ON c.id = m.conversation_id
  WHERE m.conversation_id = get_faq_conversation_messages.conversation_id
    AND c.user_id = auth.uid()
  ORDER BY m.message_index;
END;
$$;

-- Function to get user's recent FAQ conversations
CREATE OR REPLACE FUNCTION get_user_recent_faq_conversations(
  user_uuid uuid,
  limit_count int DEFAULT 20
)
RETURNS TABLE (
  id bigint,
  title text,
  summary text,
  message_count int,
  first_message_preview text,
  last_message_preview text,
  guide_types text[],
  total_citations int,
  user_rating int,
  is_bookmarked boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.summary,
    c.message_count,
    c.first_message_preview,
    c.last_message_preview,
    c.guide_types,
    c.total_citations,
    c.user_rating,
    c.is_bookmarked,
    c.created_at,
    c.updated_at
  FROM faq_conversations c
  WHERE c.user_id = user_uuid
    AND c.status = 'active'
  ORDER BY c.updated_at DESC
  LIMIT limit_count;
END;
$$;

-- =============================================================================
-- STEP 10: COMMENTS AND DOCUMENTATION
-- =============================================================================

-- Table comments
COMMENT ON TABLE faq_document_chunks IS 'Stores vectorized chunks of FAQ user guide documents for semantic search';
COMMENT ON TABLE faq_conversations IS 'Stores FAQ chat conversations with metadata and analytics';
COMMENT ON TABLE faq_messages IS 'Stores individual messages within FAQ conversations';
COMMENT ON TABLE faq_search_history IS 'Tracks user search history for FAQ queries';
COMMENT ON TABLE faq_bookmarks IS 'User bookmarks for FAQ messages and conversations';
COMMENT ON TABLE faq_feedback IS 'User feedback on FAQ responses and conversations';

-- Column comments for faq_document_chunks
COMMENT ON COLUMN faq_document_chunks.guide_category IS 'User guide category: homecare, residential, maps, news, sa2';
COMMENT ON COLUMN faq_document_chunks.section_category IS 'Section type: getting_started, features, troubleshooting, etc.';
COMMENT ON COLUMN faq_document_chunks.embedding IS 'Vector embedding for semantic similarity search';
COMMENT ON COLUMN faq_document_chunks.actual_pdf_pages IS 'Total pages in source document for citation validation';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ FAQ Database Schema Created Successfully!';
  RAISE NOTICE 'Created tables: faq_document_chunks, faq_conversations, faq_messages, faq_search_history, faq_bookmarks, faq_feedback';
  RAISE NOTICE 'Created indexes: Performance-optimized indexes including HNSW vector search';
  RAISE NOTICE 'Created RLS policies: Complete user data isolation and security';
  RAISE NOTICE 'Created functions: Vector search and conversation management functions';
END $$; 