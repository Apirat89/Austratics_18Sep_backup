-- Add conversation_id column to regulation_search_history table
-- This will allow linking search history items to their corresponding conversations

-- Add the conversation_id column (nullable since existing records won't have it)
ALTER TABLE regulation_search_history 
ADD COLUMN conversation_id BIGINT;

-- Add foreign key constraint to ensure referential integrity
ALTER TABLE regulation_search_history
ADD CONSTRAINT fk_regulation_search_history_conversation
FOREIGN KEY (conversation_id) REFERENCES regulation_conversations(id)
ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_regulation_search_history_conversation_id 
ON regulation_search_history(conversation_id);

-- Add comment for documentation
COMMENT ON COLUMN regulation_search_history.conversation_id IS 
'Links search history item to the conversation that generated it. Enables ChatGPT-like conversation loading from history.';

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'regulation_search_history' 
AND column_name = 'conversation_id';

-- Show sample of updated table structure
\d regulation_search_history; 