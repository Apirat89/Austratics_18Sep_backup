-- Homecare Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- 1. Homecare Saved Facilities Table
CREATE TABLE IF NOT EXISTS public.homecare_saved_facilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider_id TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    service_area TEXT,
    organization_type TEXT,
    address_locality TEXT,
    address_state TEXT,
    address_postcode TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    notes TEXT,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Prevent duplicate saves
    UNIQUE(user_id, provider_id)
);

-- 2. Homecare Search History Table  
CREATE TABLE IF NOT EXISTS public.homecare_search_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    search_term TEXT NOT NULL,
    location_searched TEXT,
    radius_km INTEGER,
    filters_applied JSONB, -- Stores filter criteria as JSON
    results_count INTEGER DEFAULT 0,
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Homecare Comparison History Table
CREATE TABLE IF NOT EXISTS public.homecare_comparison_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,  
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    comparison_name TEXT NOT NULL,
    provider_ids TEXT[] NOT NULL, -- Array of provider IDs
    provider_names TEXT[] NOT NULL, -- Array of provider names for display
    comparison_notes TEXT,
    compared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. Homecare Comparison Selections Table (for temporary state)
CREATE TABLE IF NOT EXISTS public.homecare_comparison_selections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider_id TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    service_area TEXT,
    organization_type TEXT,
    selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Prevent duplicate selections
    UNIQUE(user_id, provider_id)
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_homecare_saved_facilities_user_id ON public.homecare_saved_facilities(user_id);
CREATE INDEX IF NOT EXISTS idx_homecare_saved_facilities_provider_id ON public.homecare_saved_facilities(provider_id);
CREATE INDEX IF NOT EXISTS idx_homecare_search_history_user_id ON public.homecare_search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_homecare_search_history_searched_at ON public.homecare_search_history(searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_homecare_comparison_history_user_id ON public.homecare_comparison_history(user_id);
CREATE INDEX IF NOT EXISTS idx_homecare_comparison_selections_user_id ON public.homecare_comparison_selections(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.homecare_saved_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homecare_search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homecare_comparison_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homecare_comparison_selections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Saved Facilities
CREATE POLICY "Users can view their own saved homecare facilities" 
    ON public.homecare_saved_facilities FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved homecare facilities" 
    ON public.homecare_saved_facilities FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved homecare facilities" 
    ON public.homecare_saved_facilities FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved homecare facilities" 
    ON public.homecare_saved_facilities FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policies for Search History
CREATE POLICY "Users can view their own homecare search history" 
    ON public.homecare_search_history FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own homecare search history" 
    ON public.homecare_search_history FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own homecare search history" 
    ON public.homecare_search_history FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policies for Comparison History
CREATE POLICY "Users can view their own homecare comparison history" 
    ON public.homecare_comparison_history FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own homecare comparison history" 
    ON public.homecare_comparison_history FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own homecare comparison history" 
    ON public.homecare_comparison_history FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own homecare comparison history" 
    ON public.homecare_comparison_history FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS Policies for Comparison Selections
CREATE POLICY "Users can view their own homecare comparison selections" 
    ON public.homecare_comparison_selections FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own homecare comparison selections" 
    ON public.homecare_comparison_selections FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own homecare comparison selections" 
    ON public.homecare_comparison_selections FOR DELETE 
    USING (auth.uid() = user_id);

-- Helper Functions

-- Function to get user's saved homecare providers
CREATE OR REPLACE FUNCTION get_user_saved_homecare_providers(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    provider_id TEXT,
    provider_name TEXT,
    service_area TEXT,
    organization_type TEXT,
    address_locality TEXT,
    address_state TEXT,
    address_postcode TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    notes TEXT,
    saved_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        hsf.id,
        hsf.provider_id,
        hsf.provider_name,
        hsf.service_area,
        hsf.organization_type,
        hsf.address_locality,
        hsf.address_state,
        hsf.address_postcode,
        hsf.contact_phone,
        hsf.contact_email,
        hsf.notes,
        hsf.saved_at
    FROM public.homecare_saved_facilities hsf
    WHERE hsf.user_id = user_uuid
    ORDER BY hsf.saved_at DESC;
$$;

-- Function to check if a homecare provider is saved by user
CREATE OR REPLACE FUNCTION is_homecare_provider_saved(user_uuid UUID, provider_id_param TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.homecare_saved_facilities 
        WHERE user_id = user_uuid AND provider_id = provider_id_param
    );
$$;

-- Function to get user's homecare search history
CREATE OR REPLACE FUNCTION get_user_homecare_search_history(user_uuid UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    search_term TEXT,
    location_searched TEXT,
    radius_km INTEGER,
    filters_applied JSONB,
    results_count INTEGER,
    searched_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        hsh.id,
        hsh.search_term,
        hsh.location_searched,
        hsh.radius_km,
        hsh.filters_applied,
        hsh.results_count,
        hsh.searched_at
    FROM public.homecare_search_history hsh
    WHERE hsh.user_id = user_uuid
    ORDER BY hsh.searched_at DESC
    LIMIT limit_count;
$$;

-- Function to get user's homecare comparison history
CREATE OR REPLACE FUNCTION get_user_homecare_comparison_history(user_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    comparison_name TEXT,
    provider_ids TEXT[],
    provider_names TEXT[],
    comparison_notes TEXT,
    compared_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        hch.id,
        hch.comparison_name,
        hch.provider_ids,
        hch.provider_names,
        hch.comparison_notes,
        hch.compared_at
    FROM public.homecare_comparison_history hch
    WHERE hch.user_id = user_uuid
    ORDER BY hch.compared_at DESC
    LIMIT limit_count;
$$;

-- Function to clear user's homecare search history
CREATE OR REPLACE FUNCTION clear_user_homecare_search_history(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH deleted AS (
        DELETE FROM public.homecare_search_history 
        WHERE user_id = user_uuid
        RETURNING id
    )
    SELECT COUNT(*)::INTEGER FROM deleted;
$$;

-- Function to clear user's saved homecare providers  
CREATE OR REPLACE FUNCTION clear_user_saved_homecare_providers(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
    WITH deleted AS (
        DELETE FROM public.homecare_saved_facilities 
        WHERE user_id = user_uuid
        RETURNING id
    )
    SELECT COUNT(*)::INTEGER FROM deleted;
$$;

COMMENT ON TABLE public.homecare_saved_facilities IS 'Stores users saved homecare providers';
COMMENT ON TABLE public.homecare_search_history IS 'Tracks users homecare search history';
COMMENT ON TABLE public.homecare_comparison_history IS 'Stores users homecare provider comparisons';
COMMENT ON TABLE public.homecare_comparison_selections IS 'Temporary storage for homecare comparison selections'; 