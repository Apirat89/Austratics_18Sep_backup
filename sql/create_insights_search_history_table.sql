-- Create insights search history table
-- This table stores user search history for the insights page (SA2 analytics)

CREATE TABLE insights_search_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    search_term TEXT NOT NULL,
    selected_location_name TEXT,
    selected_location_type TEXT, -- 'sa2', 'sa3', 'sa4', 'lga', 'postcode', 'locality'
    selected_location_code TEXT, -- SA2 code, postcode, etc.
    sa2_id TEXT, -- SA2 ID if an SA2 was ultimately selected
    sa2_name TEXT, -- SA2 name if an SA2 was ultimately selected  
    results_count INTEGER DEFAULT 0,
    search_metadata JSONB, -- Additional data: coordinates, population, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for optimal query performance
CREATE INDEX idx_insights_search_history_user_id ON insights_search_history(user_id);
CREATE INDEX idx_insights_search_history_created_at ON insights_search_history(created_at DESC);
CREATE INDEX idx_insights_search_history_user_created ON insights_search_history(user_id, created_at DESC);
CREATE INDEX idx_insights_search_history_search_term ON insights_search_history(search_term);

-- Enable Row Level Security
ALTER TABLE insights_search_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own search history
CREATE POLICY "Users can view own search history" ON insights_search_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history" ON insights_search_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own search history" ON insights_search_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own search history" ON insights_search_history
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_insights_search_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on updates
CREATE TRIGGER insights_search_history_updated_at
    BEFORE UPDATE ON insights_search_history
    FOR EACH ROW
    EXECUTE FUNCTION update_insights_search_history_updated_at();

-- Function to clean up old search history (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_insights_search_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM insights_search_history 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comment on table and columns for documentation
COMMENT ON TABLE insights_search_history IS 'Stores user search history for the insights page (SA2 analytics)';
COMMENT ON COLUMN insights_search_history.search_term IS 'The original search query entered by the user';
COMMENT ON COLUMN insights_search_history.selected_location_name IS 'Name of the location selected from search results';
COMMENT ON COLUMN insights_search_history.selected_location_type IS 'Type of location selected (sa2, sa3, sa4, lga, postcode, locality)';
COMMENT ON COLUMN insights_search_history.selected_location_code IS 'Code/ID of the selected location (SA2 code, postcode, etc.)';
COMMENT ON COLUMN insights_search_history.sa2_id IS 'SA2 ID if an SA2 region was ultimately selected for analytics';
COMMENT ON COLUMN insights_search_history.sa2_name IS 'SA2 name if an SA2 region was ultimately selected for analytics';
COMMENT ON COLUMN insights_search_history.results_count IS 'Number of search results returned';
COMMENT ON COLUMN insights_search_history.search_metadata IS 'Additional search data (coordinates, population, analytics data, etc.)';

-- Grant appropriate permissions (optional, depending on your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON insights_search_history TO authenticated;
-- GRANT USAGE, SELECT ON SEQUENCE insights_search_history_id_seq TO authenticated; 