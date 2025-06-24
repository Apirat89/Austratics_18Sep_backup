-- Create residential search history table
CREATE TABLE IF NOT EXISTS public.residential_search_history (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    search_term TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create residential comparison history table
CREATE TABLE IF NOT EXISTS public.residential_comparison_history (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    comparison_name TEXT NOT NULL,
    facility_names TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_residential_search_history_user_id ON public.residential_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_residential_search_history_updated_at ON public.residential_search_history(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_residential_comparison_history_user_id ON public.residential_comparison_history(user_id);
CREATE INDEX IF NOT EXISTS idx_residential_comparison_history_updated_at ON public.residential_comparison_history(updated_at DESC);

-- Add unique constraints to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_residential_search_history_unique 
ON public.residential_search_history(user_id, search_term);

CREATE UNIQUE INDEX IF NOT EXISTS idx_residential_comparison_history_unique 
ON public.residential_comparison_history(user_id, comparison_name);

-- Enable Row Level Security (RLS)
ALTER TABLE public.residential_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residential_comparison_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for residential search history
CREATE POLICY "Users can view their own residential search history" ON public.residential_search_history
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own residential search history" ON public.residential_search_history
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own residential search history" ON public.residential_search_history
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own residential search history" ON public.residential_search_history
    FOR DELETE USING (auth.uid()::text = user_id);

-- Create RLS policies for residential comparison history
CREATE POLICY "Users can view their own residential comparison history" ON public.residential_comparison_history
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own residential comparison history" ON public.residential_comparison_history
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own residential comparison history" ON public.residential_comparison_history
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own residential comparison history" ON public.residential_comparison_history
    FOR DELETE USING (auth.uid()::text = user_id);

-- Grant necessary permissions
GRANT ALL ON public.residential_search_history TO authenticated;
GRANT ALL ON public.residential_comparison_history TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.residential_search_history_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.residential_comparison_history_id_seq TO authenticated; 