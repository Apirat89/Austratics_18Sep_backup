-- Create faq_search_bookmarks table for storing user's saved FAQ searches (matching regulation pattern)
CREATE TABLE IF NOT EXISTS faq_search_bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bookmark_name TEXT NOT NULL, -- Custom name given by user
  search_term TEXT NOT NULL,
  description TEXT, -- Optional description for the bookmark
  response_preview TEXT, -- First 150 characters of AI response for quick preview
  citation_count INTEGER DEFAULT 0, -- Number of citations in the response  
  document_types TEXT[], -- Array of document types/categories found
  use_count INTEGER DEFAULT 0, -- How many times this bookmark has been used
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  conversation_id BIGINT REFERENCES faq_conversations(id) ON DELETE CASCADE,
  -- Ensure unique bookmark names per user
  UNIQUE(user_id, bookmark_name)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_faq_search_bookmarks_user_id ON faq_search_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_faq_search_bookmarks_created_at ON faq_search_bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_search_bookmarks_user_created ON faq_search_bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_search_bookmarks_bookmark_name ON faq_search_bookmarks(bookmark_name);
CREATE INDEX IF NOT EXISTS idx_faq_search_bookmarks_use_count ON faq_search_bookmarks(use_count DESC);

-- Enable Row Level Security
ALTER TABLE faq_search_bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only access their own bookmarks
CREATE POLICY "Users can view their own FAQ search bookmarks" 
ON faq_search_bookmarks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own FAQ search bookmarks"
ON faq_search_bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FAQ search bookmarks"
ON faq_search_bookmarks FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FAQ search bookmarks"
ON faq_search_bookmarks FOR DELETE
USING (auth.uid() = user_id);

-- Add triggers for updating the updated_at column
CREATE OR REPLACE FUNCTION update_faq_search_bookmarks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_faq_search_bookmarks_updated_at
  BEFORE UPDATE ON faq_search_bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_faq_search_bookmarks_updated_at();

-- Optional: Create function to increment use_count (similar to regulation)
CREATE OR REPLACE FUNCTION update_faq_search_bookmark_usage(bookmark_id BIGINT, user_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE faq_search_bookmarks 
  SET 
    use_count = use_count + 1,
    last_used = NOW(),
    updated_at = NOW()
  WHERE 
    id = bookmark_id 
    AND user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 