-- Add message-level bookmarking support to regulation_messages table
-- This enables users to bookmark individual messages within conversations

-- Add is_bookmarked column to regulation_messages table
ALTER TABLE regulation_messages 
ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN DEFAULT FALSE;

-- Create index for bookmarked messages
CREATE INDEX IF NOT EXISTS idx_regulation_messages_bookmarked 
ON regulation_messages(conversation_id, is_bookmarked) 
WHERE is_bookmarked = true;

-- Create function to update conversation message count
CREATE OR REPLACE FUNCTION update_conversation_message_count(conversation_id_param BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE regulation_conversations 
  SET 
    message_count = (
      SELECT COUNT(*) 
      FROM regulation_messages 
      WHERE conversation_id = conversation_id_param
    ),
    updated_at = NOW()
  WHERE id = conversation_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to get bookmarked messages for a user
CREATE OR REPLACE FUNCTION get_user_bookmarked_messages(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 20
)
RETURNS TABLE (
  message_id BIGINT,
  conversation_id BIGINT,
  conversation_title TEXT,
  role TEXT,
  content TEXT,
  citations JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as message_id,
    m.conversation_id,
    c.title as conversation_title,
    m.role,
    m.content,
    m.citations,
    m.created_at,
    m.updated_at
  FROM regulation_messages m
  JOIN regulation_conversations c ON m.conversation_id = c.id
  WHERE c.user_id = user_id_param 
    AND m.is_bookmarked = true
    AND c.status = 'active'
  ORDER BY m.updated_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to get bookmarked conversations for a user
CREATE OR REPLACE FUNCTION get_user_bookmarked_conversations(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 20
)
RETURNS TABLE (
  conversation_id BIGINT,
  title TEXT,
  summary TEXT,
  message_count INTEGER,
  first_message_preview TEXT,
  last_message_preview TEXT,
  total_citations INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as conversation_id,
    c.title,
    c.summary,
    c.message_count,
    c.first_message_preview,
    c.last_message_preview,
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

-- Create function to get unified bookmarks (both messages and conversations)
CREATE OR REPLACE FUNCTION get_unified_bookmarks(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 20
)
RETURNS TABLE (
  item_type TEXT,
  item_id BIGINT,
  conversation_id BIGINT,
  conversation_title TEXT,
  content TEXT,
  bookmark_date TIMESTAMP WITH TIME ZONE,
  context_info JSONB
) AS $$
BEGIN
  RETURN QUERY
  -- Get bookmarked messages
  SELECT 
    'message'::TEXT as item_type,
    m.id as item_id,
    m.conversation_id,
    c.title as conversation_title,
    m.content,
    m.updated_at as bookmark_date,
    jsonb_build_object(
      'role', m.role,
      'message_index', m.message_index,
      'citations_count', COALESCE(jsonb_array_length(m.citations), 0)
    ) as context_info
  FROM regulation_messages m
  JOIN regulation_conversations c ON m.conversation_id = c.id
  WHERE c.user_id = user_id_param 
    AND m.is_bookmarked = true
    AND c.status = 'active'
  
  UNION ALL
  
  -- Get bookmarked conversations
  SELECT 
    'conversation'::TEXT as item_type,
    c.id as item_id,
    c.id as conversation_id,
    c.title as conversation_title,
    c.summary as content,
    c.updated_at as bookmark_date,
    jsonb_build_object(
      'message_count', c.message_count,
      'total_citations', c.total_citations,
      'first_message_preview', c.first_message_preview
    ) as context_info
  FROM regulation_conversations c
  WHERE c.user_id = user_id_param 
    AND c.is_bookmarked = true
    AND c.status = 'active'
  
  ORDER BY bookmark_date DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Message bookmarking support added successfully! 🎉' as status;

-- Usage examples
SELECT '
USAGE EXAMPLES:

1. Add bookmark column to existing messages:
   ALTER TABLE regulation_messages ADD COLUMN IF NOT EXISTS is_bookmarked BOOLEAN DEFAULT FALSE;

2. Get bookmarked messages for a user:
   SELECT * FROM get_user_bookmarked_messages(''user-uuid-here'');

3. Get bookmarked conversations for a user:
   SELECT * FROM get_user_bookmarked_conversations(''user-uuid-here'');

4. Get unified bookmarks (both messages and conversations):
   SELECT * FROM get_unified_bookmarks(''user-uuid-here'');

5. Update conversation message count after deletion:
   SELECT update_conversation_message_count(conversation_id);

' as usage_examples;

-- Comments for documentation
COMMENT ON COLUMN regulation_messages.is_bookmarked IS 'Whether this message is bookmarked by the user';
COMMENT ON FUNCTION update_conversation_message_count(BIGINT) IS 'Updates the message count for a conversation after message deletion';
COMMENT ON FUNCTION get_user_bookmarked_messages(UUID, INTEGER) IS 'Gets bookmarked messages for a user with conversation context';
COMMENT ON FUNCTION get_user_bookmarked_conversations(UUID, INTEGER) IS 'Gets bookmarked conversations for a user';
COMMENT ON FUNCTION get_unified_bookmarks(UUID, INTEGER) IS 'Gets unified bookmarks including both messages and conversations'; 