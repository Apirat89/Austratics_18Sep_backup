-- Admin Telemetry System Migration
-- Creates comprehensive user analytics, conversation tracking, and admin oversight capabilities

-- =====================================================
-- 1. EXTEND PROFILES TABLE WITH ROLE SYSTEM
-- =====================================================

-- Add role column to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'staff', 'owner'));

-- Add permissions column for future extensibility
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Update existing admin user to owner role
UPDATE public.profiles 
SET role = 'owner', updated_at = NOW() 
WHERE email = 'apirat.kongchanagul@gmail.com';

-- Insert profile if not exists (for first-time setup)
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
SELECT 
    u.id, 
    u.email, 
    'owner', 
    NOW(), 
    NOW()
FROM auth.users u 
WHERE u.email = 'apirat.kongchanagul@gmail.com' 
AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO UPDATE SET 
    role = 'owner', 
    updated_at = NOW();

-- =====================================================
-- 2. USER EVENTS TELEMETRY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    feature TEXT NOT NULL,
    action TEXT NOT NULL,
    attrs JSONB NOT NULL DEFAULT '{}',
    session_id TEXT,
    user_agent TEXT,
    ip_address INET
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_events_user_ts ON public.user_events(user_id, ts);
CREATE INDEX IF NOT EXISTS idx_user_events_feat_ts ON public.user_events(feature, ts);
CREATE INDEX IF NOT EXISTS idx_user_events_action_ts ON public.user_events(action, ts);
CREATE INDEX IF NOT EXISTS idx_user_events_session ON public.user_events(session_id) WHERE session_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first, then recreate (safe approach)
DROP POLICY IF EXISTS "Users can view their own events" ON public.user_events;
DROP POLICY IF EXISTS "Users can insert their own events" ON public.user_events;
DROP POLICY IF EXISTS "Admin can view all events" ON public.user_events;

-- RLS Policies
CREATE POLICY "Users can view their own events" 
ON public.user_events FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own events" 
ON public.user_events FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can view all events" 
ON public.user_events FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'staff')
    )
);

-- =====================================================
-- 3. FEATURE DIMENSION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.feature_dim (
    feature TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    description TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial feature data
INSERT INTO public.feature_dim (feature, label, description, category) VALUES
    ('faq_chat', 'FAQ Chat', 'Interactive FAQ chatbot conversations', 'support'),
    ('sa2', 'SA2 Explorer', 'Statistical Area Level 2 data exploration', 'analytics'),
    ('map', 'Map & Layers', 'Interactive map with facility layers', 'visualization'),
    ('saved_items', 'Saved Items', 'User bookmarks and saved facilities', 'personalization'),
    ('homecare', 'Home Care Search', 'Home care provider search and comparison', 'search'),
    ('residential', 'Residential Care Search', 'Residential care facility search', 'search'),
    ('regulation', 'Regulation Chat', 'Aged care regulation information chatbot', 'support'),
    ('news', 'News & Updates', 'Latest aged care news and updates', 'information'),
    ('insights', 'Data Insights', 'Advanced analytics and reporting', 'analytics')
ON CONFLICT (feature) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

-- Enable RLS (read-only for all users)
ALTER TABLE public.feature_dim ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "All users can view features" ON public.feature_dim;
DROP POLICY IF EXISTS "Admin can manage features" ON public.feature_dim;

CREATE POLICY "All users can view features" 
ON public.feature_dim FOR SELECT 
USING (TRUE);

CREATE POLICY "Admin can manage features" 
ON public.feature_dim FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'staff')
    )
);

-- =====================================================
-- 4. CONVERSATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL REFERENCES public.feature_dim(feature),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    title TEXT,
    summary TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    message_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_feature ON public.conversations(feature);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON public.conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_feature ON public.conversations(user_id, feature);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can manage their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admin can view all conversations" ON public.conversations;

-- RLS Policies
CREATE POLICY "Users can view their own conversations" 
ON public.conversations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own conversations" 
ON public.conversations FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all conversations" 
ON public.conversations FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'staff')
    )
);

-- =====================================================
-- 5. CONVERSATION MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.conversation_messages (
    id BIGSERIAL PRIMARY KEY,
    convo_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    content JSONB NOT NULL,
    tokens_used INTEGER,
    processing_time_ms INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_convo_messages_convo_ts ON public.conversation_messages(convo_id, ts);
CREATE INDEX IF NOT EXISTS idx_convo_messages_role ON public.conversation_messages(role);

-- Enable RLS
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.conversation_messages;
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON public.conversation_messages;
DROP POLICY IF EXISTS "Admin can view all messages" ON public.conversation_messages;

-- RLS Policies  
CREATE POLICY "Users can view messages from their conversations" 
ON public.conversation_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = convo_id 
        AND c.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages to their conversations" 
ON public.conversation_messages FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = convo_id 
        AND c.user_id = auth.uid()
    )
);

CREATE POLICY "Admin can view all messages" 
ON public.conversation_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'staff')
    )
);

-- =====================================================
-- 6. SEARCH HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.search_history (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    query TEXT NOT NULL,
    surface TEXT NOT NULL, -- 'sa2', 'map', 'faq', 'homecare', 'residential', etc.
    results_count INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}',
    session_id TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_search_history_user_ts ON public.search_history(user_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_surface ON public.search_history(surface);
CREATE INDEX IF NOT EXISTS idx_search_history_ts ON public.search_history(ts DESC);

-- Enable RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own search history" ON public.search_history;
DROP POLICY IF EXISTS "Users can manage their own search history" ON public.search_history;
DROP POLICY IF EXISTS "Admin can view all search history" ON public.search_history;

-- RLS Policies
CREATE POLICY "Users can view their own search history" 
ON public.search_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own search history" 
ON public.search_history FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all search history" 
ON public.search_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'staff')
    )
);

-- =====================================================
-- 7. SAVED ITEMS ADMIN TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.saved_items (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL, -- 'sa2', 'facility', 'doc', 'search', etc.
    item_id TEXT NOT NULL,
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}',
    tags TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, item_type, item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_items_user_type ON public.saved_items(user_id, item_type);
CREATE INDEX IF NOT EXISTS idx_saved_items_created ON public.saved_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_items_type ON public.saved_items(item_type);

-- Enable RLS
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own saved items" ON public.saved_items;
DROP POLICY IF EXISTS "Users can manage their own saved items" ON public.saved_items;
DROP POLICY IF EXISTS "Admin can view all saved items" ON public.saved_items;

-- RLS Policies
CREATE POLICY "Users can view their own saved items" 
ON public.saved_items FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own saved items" 
ON public.saved_items FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all saved items" 
ON public.saved_items FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'staff')
    )
);

-- =====================================================
-- 8. APP CONFIGURATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Seed initial configuration
INSERT INTO public.app_config (key, value, description) VALUES
    ('saved_items_max_per_user', '200', 'Maximum saved items per user'),
    ('telemetry_retention_days', '180', 'Days to retain telemetry events (6 months)'),
    ('conversation_retention_days', '180', 'Days to retain conversation data (6 months)'),
    ('search_history_retention_days', '90', 'Days to retain search history (3 months)'),
    ('admin_notifications_enabled', 'true', 'Enable admin notifications for important events')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Admin can manage app config" ON public.app_config;

-- RLS Policies
CREATE POLICY "Admin can manage app config" 
ON public.app_config FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('owner', 'staff')
    )
);

-- =====================================================
-- 9. TRIGGER FUNCTIONS
-- =====================================================

-- Function to update conversation message count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations 
    SET message_count = (
        SELECT COUNT(*) 
        FROM public.conversation_messages 
        WHERE convo_id = COALESCE(NEW.convo_id, OLD.convo_id)
    )
    WHERE id = COALESCE(NEW.convo_id, OLD.convo_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_update_conversation_message_count ON public.conversation_messages;

-- Trigger to update message count on insert/delete
CREATE TRIGGER trigger_update_conversation_message_count
    AFTER INSERT OR DELETE ON public.conversation_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_message_count();

-- Function for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers first
DROP TRIGGER IF EXISTS trigger_update_saved_items_updated_at ON public.saved_items;
DROP TRIGGER IF EXISTS trigger_update_app_config_updated_at ON public.app_config;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER trigger_update_saved_items_updated_at
    BEFORE UPDATE ON public.saved_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_app_config_updated_at
    BEFORE UPDATE ON public.app_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. DATA RETENTION FUNCTIONS
-- =====================================================

-- Function to cleanup old telemetry data
CREATE OR REPLACE FUNCTION cleanup_old_telemetry_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    retention_days INTEGER;
BEGIN
    -- Get retention period from config
    SELECT (value::text)::integer INTO retention_days 
    FROM public.app_config 
    WHERE key = 'telemetry_retention_days';
    
    -- Default to 180 days if not configured
    retention_days := COALESCE(retention_days, 180);
    
    -- Delete old events
    DELETE FROM public.user_events 
    WHERE ts < NOW() - (retention_days || ' days')::interval;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup action
    INSERT INTO public.audit_logs (action, table_name, new_values)
    VALUES ('cleanup', 'user_events', jsonb_build_object('deleted_count', deleted_count, 'retention_days', retention_days));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old search history
CREATE OR REPLACE FUNCTION cleanup_old_search_history()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    retention_days INTEGER;
BEGIN
    -- Get retention period from config  
    SELECT (value::text)::integer INTO retention_days 
    FROM public.app_config 
    WHERE key = 'search_history_retention_days';
    
    -- Default to 90 days if not configured
    retention_days := COALESCE(retention_days, 90);
    
    -- Delete old search history
    DELETE FROM public.search_history 
    WHERE ts < NOW() - (retention_days || ' days')::interval;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup action
    INSERT INTO public.audit_logs (action, table_name, new_values)
    VALUES ('cleanup', 'search_history', jsonb_build_object('deleted_count', deleted_count, 'retention_days', retention_days));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old conversations
CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    retention_days INTEGER;
BEGIN
    -- Get retention period from config
    SELECT (value::text)::integer INTO retention_days 
    FROM public.app_config 
    WHERE key = 'conversation_retention_days';
    
    -- Default to 180 days if not configured
    retention_days := COALESCE(retention_days, 180);
    
    -- Delete old conversations (messages will cascade)
    DELETE FROM public.conversations 
    WHERE created_at < NOW() - (retention_days || ' days')::interval;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup action
    INSERT INTO public.audit_logs (action, table_name, new_values)
    VALUES ('cleanup', 'conversations', jsonb_build_object('deleted_count', deleted_count, 'retention_days', retention_days));
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql; 