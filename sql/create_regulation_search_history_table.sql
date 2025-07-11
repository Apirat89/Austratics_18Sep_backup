-- Create regulation_search_history table for storing user regulation search queries
CREATE TABLE IF NOT EXISTS regulation_search_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_term TEXT NOT NULL,
  response_preview TEXT, -- First 150 characters of AI response for quick preview
  citations_count INTEGER DEFAULT 0, -- Number of citations in the response
  document_types TEXT[], -- Array of document types found (e.g., 'aged_care_act', 'chsp_support_at_home')
  processing_time FLOAT, -- Response time in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_regulation_search_history_user_id ON regulation_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_regulation_search_history_updated_at ON regulation_search_history(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_search_history_user_updated ON regulation_search_history(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_regulation_search_history_search_term ON regulation_search_history(search_term);

-- Enable Row Level Security
ALTER TABLE regulation_search_history ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only access their own search history
CREATE POLICY "Users can view their own regulation search history" 
  ON regulation_search_history FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own regulation search history" 
  ON regulation_search_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own regulation search history" 
  ON regulation_search_history FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own regulation search history" 
  ON regulation_search_history FOR DELETE 
  USING (auth.uid() = user_id);

-- Create function to handle updated_at automatically
CREATE OR REPLACE FUNCTION update_regulation_search_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at handling
CREATE TRIGGER update_regulation_search_history_updated_at 
  BEFORE UPDATE ON regulation_search_history 
  FOR EACH ROW EXECUTE FUNCTION update_regulation_search_history_updated_at();

-- Create function to auto-cleanup old records (keep only past 2 weeks)
CREATE OR REPLACE FUNCTION cleanup_old_regulation_search_history()
RETURNS void AS $$
BEGIN
  DELETE FROM regulation_search_history 
  WHERE created_at < NOW() - INTERVAL '2 weeks';
END;
$$ LANGUAGE plpgsql;

-- Create function to enforce 100 search history limit per user (fallback)
CREATE OR REPLACE FUNCTION enforce_regulation_search_history_limit()
RETURNS TRIGGER AS $$
DECLARE
  search_count INTEGER;
BEGIN
  -- Count current searches for this user
  SELECT COUNT(*) INTO search_count 
  FROM regulation_search_history 
  WHERE user_id = NEW.user_id;
  
  -- If user already has 100 searches, delete oldest ones
  IF search_count >= 100 THEN
    DELETE FROM regulation_search_history 
    WHERE user_id = NEW.user_id 
    AND id IN (
      SELECT id FROM regulation_search_history 
      WHERE user_id = NEW.user_id 
      ORDER BY updated_at ASC 
      LIMIT (search_count - 99)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the limit on insert
CREATE TRIGGER enforce_regulation_search_history_limit_trigger
  BEFORE INSERT ON regulation_search_history
  FOR EACH ROW EXECUTE FUNCTION enforce_regulation_search_history_limit();

-- Create a function that can be called via RPC to create the table if needed
CREATE OR REPLACE FUNCTION create_regulation_search_history_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- This function doesn't do anything since the table is created above
  -- It's just here to prevent errors in the application code
  RETURN;
END;
$$ LANGUAGE plpgsql; 