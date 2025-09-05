-- Add conversation_id column to regulation_bookmarks table for instant bookmark loading
-- This enables bookmarks to load saved conversations instead of regenerating responses

-- Add conversation_id column to regulation_bookmarks table
ALTER TABLE regulation_bookmarks 
ADD COLUMN IF NOT EXISTS conversation_id BIGINT;

-- Create index for efficient conversation lookup
CREATE INDEX IF NOT EXISTS idx_regulation_bookmarks_conversation_id 
ON regulation_bookmarks(conversation_id);

-- Add foreign key constraint to reference regulation_conversations table
-- Note: We don't enforce this as a strict foreign key to allow for legacy bookmarks
-- ALTER TABLE regulation_bookmarks 
-- ADD CONSTRAINT fk_regulation_bookmarks_conversation_id 
-- FOREIGN KEY (conversation_id) REFERENCES regulation_conversations(id) ON DELETE SET NULL;

-- Clean up existing bookmarks without conversation_id (as per user request to delete legacy data)
-- This removes bookmarks that were created before conversation tracking
DELETE FROM regulation_bookmarks WHERE conversation_id IS NULL;

-- Drop existing function to avoid return type conflict
DROP FUNCTION IF EXISTS get_popular_regulation_bookmarks(UUID, INTEGER);

-- Update the get_popular_regulation_bookmarks function to include conversation_id
CREATE OR REPLACE FUNCTION get_popular_regulation_bookmarks(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id BIGINT,
    user_id UUID,
    bookmark_name TEXT,
    search_term TEXT,
    description TEXT,
    response_preview TEXT,
    citations_count INTEGER,
    document_types TEXT[],
    usage_count INTEGER,
    conversation_id BIGINT,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rb.id,
        rb.user_id,
        rb.bookmark_name,
        rb.search_term,
        rb.description,
        rb.response_preview,
        rb.citations_count,
        rb.document_types,
        rb.usage_count,
        rb.conversation_id,
        rb.last_used_at,
        rb.created_at,
        rb.updated_at
    FROM regulation_bookmarks rb
    WHERE rb.user_id = p_user_id
    ORDER BY rb.usage_count DESC, rb.created_at DESC
    LIMIT p_limit;
END;
$$;

SELECT 'Conversation ID column added to regulation_bookmarks table and legacy bookmarks cleaned up! 🎉' as status; 