-- Create saved_searches table for storing user's saved location searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_term TEXT NOT NULL,
  search_display_name TEXT, -- Friendly display name for the search
  search_type TEXT DEFAULT 'location' CHECK (search_type IN ('location', 'facility', 'general')),
  -- Store the search result data for quick access
  location_data JSONB, -- Store center coordinates, bounds, type, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure unique search terms per user
  UNIQUE(user_id, search_term)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON saved_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_created ON saved_searches(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Create policy for users to only access their own saved searches
CREATE POLICY "Users can view their own saved searches" 
  ON saved_searches FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved searches" 
  ON saved_searches FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches" 
  ON saved_searches FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches" 
  ON saved_searches FOR DELETE 
  USING (auth.uid() = user_id);

-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at handling
CREATE TRIGGER update_saved_searches_updated_at 
  BEFORE UPDATE ON saved_searches 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to enforce 100 saved searches limit per user
CREATE OR REPLACE FUNCTION enforce_saved_searches_limit()
RETURNS TRIGGER AS $$
DECLARE
  search_count INTEGER;
BEGIN
  -- Count current saved searches for this user
  SELECT COUNT(*) INTO search_count 
  FROM saved_searches 
  WHERE user_id = NEW.user_id;
  
  -- If user already has 100 searches, prevent insert
  IF search_count >= 100 THEN
    RAISE EXCEPTION 'Maximum of 100 saved searches allowed per user. Please delete some searches first.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce the limit on insert
CREATE TRIGGER enforce_saved_searches_limit_trigger
  BEFORE INSERT ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION enforce_saved_searches_limit();

-- Create a function that can be called via RPC to create the table if needed
CREATE OR REPLACE FUNCTION create_saved_searches_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- This function doesn't do anything since the table is created above
  -- It's just here to prevent errors in the application code
  RETURN;
END;
$$ LANGUAGE plpgsql; 