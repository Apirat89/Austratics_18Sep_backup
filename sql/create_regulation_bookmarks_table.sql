-- Create regulation_bookmarks table for storing user's saved regulation searches
CREATE TABLE IF NOT EXISTS regulation_bookmarks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bookmark_name TEXT NOT NULL, -- Custom name given by user
  search_term TEXT NOT NULL,
  description TEXT, -- Optional description for the bookmark
  response_preview TEXT, -- First 150 characters of AI response for quick preview
  citations_count INTEGER DEFAULT 0, -- Number of citations in the response
  document_types TEXT[], -- Array of document types found (e.g., 'aged_care_act', 'chsp_support_at_home')
  usage_count INTEGER DEFAULT 0, -- How many times this bookmark has been used
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure unique bookmark names per user
  UNIQUE(user_id, bookmark_name)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_regulation_bookmarks_user_id ON regulation_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_regulation_bookmarks_created_at ON regulation_bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_bookmarks_user_created ON regulation_bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_bookmarks_bookmark_name ON regulation_bookmarks(bookmark_name);
CREATE INDEX IF NOT EXISTS idx_regulation_bookmarks_usage_count ON regulation_bookmarks(usage_count DESC);

-- Enable Row Level Security
ALTER TABLE regulation_bookmarks ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only access their own bookmarks
CREATE POLICY "Users can view their own regulation bookmarks" 
  ON regulation_bookmarks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own regulation bookmarks" 
  ON regulation_bookmarks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own regulation bookmarks" 
  ON regulation_bookmarks FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own regulation bookmarks" 
  ON regulation_bookmarks FOR DELETE 
  USING (auth.uid() = user_id);

-- Create function to handle updated_at automatically
CREATE OR REPLACE FUNCTION update_regulation_bookmarks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at handling
CREATE TRIGGER update_regulation_bookmarks_updated_at 
  BEFORE UPDATE ON regulation_bookmarks 
  FOR EACH ROW EXECUTE FUNCTION update_regulation_bookmarks_updated_at();

-- Create function to enforce 20 bookmarks limit per user
CREATE OR REPLACE FUNCTION enforce_regulation_bookmarks_limit()
RETURNS TRIGGER AS $$
DECLARE
  bookmark_count INTEGER;
BEGIN
  -- Count current bookmarks for this user
  SELECT COUNT(*) INTO bookmark_count 
  FROM regulation_bookmarks 
  WHERE user_id = NEW.user_id;
  
  -- If user already has 20 bookmarks, prevent insert
  IF bookmark_count >= 20 THEN
    RAISE EXCEPTION 'Maximum of 20 regulation bookmarks allowed per user. Please delete some bookmarks first.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the limit on insert
CREATE TRIGGER enforce_regulation_bookmarks_limit_trigger
  BEFORE INSERT ON regulation_bookmarks
  FOR EACH ROW EXECUTE FUNCTION enforce_regulation_bookmarks_limit();

-- Create function to update bookmark usage statistics
CREATE OR REPLACE FUNCTION update_regulation_bookmark_usage(
  bookmark_id BIGINT,
  user_id_param UUID
)
RETURNS void AS $$
BEGIN
  UPDATE regulation_bookmarks 
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW(),
    updated_at = NOW()
  WHERE id = bookmark_id AND user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to get popular bookmarks for a user
CREATE OR REPLACE FUNCTION get_popular_regulation_bookmarks(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 5
)
RETURNS TABLE (
  id BIGINT,
  bookmark_name TEXT,
  search_term TEXT,
  description TEXT,
  usage_count INTEGER,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rb.id,
    rb.bookmark_name,
    rb.search_term,
    rb.description,
    rb.usage_count,
    rb.last_used_at,
    rb.created_at
  FROM regulation_bookmarks rb
  WHERE rb.user_id = user_id_param
  ORDER BY rb.usage_count DESC, rb.last_used_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Create a function that can be called via RPC to create the table if needed
CREATE OR REPLACE FUNCTION create_regulation_bookmarks_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- This function doesn't do anything since the table is created above
  -- It's just here to prevent errors in the application code
  RETURN;
END;
$$ LANGUAGE plpgsql; 