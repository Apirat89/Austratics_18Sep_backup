-- Create search_history table for storing user search queries
CREATE TABLE IF NOT EXISTS search_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_term TEXT NOT NULL,
  search_type TEXT DEFAULT 'location' CHECK (search_type IN ('location', 'facility', 'general')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_updated_at ON search_history(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_user_updated ON search_history(user_id, updated_at DESC);

-- Enable Row Level Security
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only access their own search history
CREATE POLICY "Users can view their own search history" 
  ON search_history FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history" 
  ON search_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search history" 
  ON search_history FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search history" 
  ON search_history FOR DELETE 
  USING (auth.uid() = user_id);

-- Create function to handle updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updated_at handling
CREATE TRIGGER update_search_history_updated_at 
  BEFORE UPDATE ON search_history 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a function that can be called via RPC to create the table if needed
CREATE OR REPLACE FUNCTION create_search_history_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- This function doesn't do anything since the table is created above
  -- It's just here to prevent errors in the application code
  RETURN;
END;
$$ LANGUAGE plpgsql; 