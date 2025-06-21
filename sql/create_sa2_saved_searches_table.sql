-- Create dedicated table for insights page saved SA2 searches
-- This ensures complete separation from maps page saved searches and residential saved facilities

-- Create the sa2_saved_searches table
CREATE TABLE IF NOT EXISTS public.sa2_saved_searches (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sa2_id TEXT NOT NULL,
    sa2_name TEXT NOT NULL,
    sa2_data JSONB NOT NULL,
    search_metadata JSONB DEFAULT '{}', -- Original search query, location context, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate saves per user
ALTER TABLE public.sa2_saved_searches 
ADD CONSTRAINT sa2_saved_searches_user_sa2_unique 
UNIQUE (user_id, sa2_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sa2_saved_searches_user_id 
ON public.sa2_saved_searches(user_id);

CREATE INDEX IF NOT EXISTS idx_sa2_saved_searches_created_at 
ON public.sa2_saved_searches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sa2_saved_searches_user_created 
ON public.sa2_saved_searches(user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.sa2_saved_searches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation
CREATE POLICY "Users can view their own SA2 saved searches" 
ON public.sa2_saved_searches FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own SA2 saved searches" 
ON public.sa2_saved_searches FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SA2 saved searches" 
ON public.sa2_saved_searches FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SA2 saved searches" 
ON public.sa2_saved_searches FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_sa2_saved_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sa2_saved_searches_updated_at
    BEFORE UPDATE ON public.sa2_saved_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_sa2_saved_searches_updated_at();

-- Create function to enforce 100 SA2 search limit per user
CREATE OR REPLACE FUNCTION check_sa2_search_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.sa2_saved_searches WHERE user_id = NEW.user_id) >= 100 THEN
        RAISE EXCEPTION 'Cannot save more than 100 SA2 searches per user';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_sa2_search_limit
    BEFORE INSERT ON public.sa2_saved_searches
    FOR EACH ROW
    EXECUTE FUNCTION check_sa2_search_limit();

-- Verify the table was created successfully
SELECT 
    schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename = 'sa2_saved_searches';

-- Verify RLS policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'sa2_saved_searches'; 