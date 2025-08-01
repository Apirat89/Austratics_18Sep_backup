-- Fixed version of get_conversation_messages function
-- This version avoids the ambiguous column reference issue

-- Drop the existing function
DROP FUNCTION IF EXISTS get_conversation_messages(BIGINT, UUID);

-- Create the new function with explicit column references
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
    -- Verify user has access to this conversation if user_id_param is provided
    IF user_id_param IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM regulation_conversations rc
            WHERE rc.id = conversation_id_param AND rc.user_id = user_id_param
        ) THEN
            RAISE EXCEPTION 'Access denied to conversation %', conversation_id_param;
        END IF;
    END IF;
    
    -- Return the messages with explicit table aliases to avoid ambiguity
    RETURN QUERY
    SELECT 
        rm.id,
        rm.message_index,
        rm.role,
        rm.content,
        rm.citations,
        rm.context_used,
        rm.processing_time,
        rm.search_intent,
        rm.feedback_type,
        rm.feedback_comment,
        rm.created_at,
        rm.updated_at
    FROM regulation_messages rm
    WHERE rm.conversation_id = conversation_id_param
    ORDER BY rm.message_index ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_conversation_messages(BIGINT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_messages(BIGINT, UUID) TO anon; 