-- Master Admin System Migration  
-- Date: 2025-01-15
-- Description: Creates dedicated master admin management system with hierarchical permissions

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

BEGIN;

-- ==========================================
-- 1. ADMIN USERS TABLE
-- ==========================================

-- Dedicated admin users table (separate from regular users)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'pending',
    is_master BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id), -- Who created this admin
    activation_token TEXT, -- For account activation
    activation_expires_at TIMESTAMPTZ
);

-- Insert master admin record
INSERT INTO public.admin_users (email, password_hash, status, is_master, created_at, updated_at)
VALUES (
    'apirat.kongchanagul@gmail.com',
    '$2a$10$dummy.hash.for.initial.setup', -- Will need proper hash
    'active',
    TRUE,
    NOW(),
    NOW()
) ON CONFLICT (email) DO UPDATE SET 
    is_master = TRUE,
    status = 'active',
    updated_at = NOW();

-- ==========================================
-- 2. ADMIN SESSIONS TABLE (Real-time Status)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ==========================================
-- 3. ADMIN AUDIT LOG TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id BIGSERIAL PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'create_admin', 'delete_admin', 'manage_user', etc.
    target_type TEXT NOT NULL, -- 'admin_user', 'user', 'company', etc.
    target_id TEXT, -- ID of the affected entity
    action_details JSONB NOT NULL DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 4. INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON public.admin_users(status);
CREATE INDEX IF NOT EXISTS idx_admin_users_last_active ON public.admin_users(last_active);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_user_id ON public.admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_last_seen ON public.admin_sessions(last_seen);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_is_active ON public.admin_sessions(is_active);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user_id ON public.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action_type ON public.admin_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at);

-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Enable RLS on all admin tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY; 
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin users can only see themselves unless they're master admin
CREATE POLICY "admin_users_select_policy" ON public.admin_users 
FOR SELECT USING (
    -- Master admin can see all
    EXISTS (SELECT 1 FROM public.admin_users au WHERE au.email = auth.jwt()->>'email' AND au.is_master = TRUE)
    OR 
    -- Regular admin can only see themselves
    email = auth.jwt()->>'email'
);

-- Only master admin can insert admin users
CREATE POLICY "admin_users_insert_policy" ON public.admin_users 
FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users au WHERE au.email = auth.jwt()->>'email' AND au.is_master = TRUE)
);

-- Admin users can update their own record, master admin can update any
CREATE POLICY "admin_users_update_policy" ON public.admin_users 
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.admin_users au WHERE au.email = auth.jwt()->>'email' AND au.is_master = TRUE)
    OR 
    email = auth.jwt()->>'email'
);

-- Only master admin can delete admin users (including themselves)
CREATE POLICY "admin_users_delete_policy" ON public.admin_users 
FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.admin_users au WHERE au.email = auth.jwt()->>'email' AND au.is_master = TRUE)
);

-- Admin sessions: users can see their own sessions
CREATE POLICY "admin_sessions_policy" ON public.admin_sessions 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.admin_users au 
        WHERE au.id = admin_user_id 
        AND au.email = auth.jwt()->>'email'
    )
);

-- Audit log: users can see their own actions, master admin can see all
CREATE POLICY "admin_audit_log_select_policy" ON public.admin_audit_log 
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.admin_users au WHERE au.email = auth.jwt()->>'email' AND au.is_master = TRUE)
    OR 
    EXISTS (
        SELECT 1 FROM public.admin_users au 
        WHERE au.id = admin_user_id 
        AND au.email = auth.jwt()->>'email'
    )
);

-- Only admin users can insert audit log entries
CREATE POLICY "admin_audit_log_insert_policy" ON public.admin_audit_log 
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.admin_users au 
        WHERE au.id = admin_user_id 
        AND au.email = auth.jwt()->>'email'
    )
);

-- ==========================================
-- 6. HELPER FUNCTIONS
-- ==========================================

-- Function to check if current user is master admin
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE email = auth.jwt()->>'email' 
        AND is_master = TRUE 
        AND status = 'active'
    );
$$;

-- Function to check if current user is any admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER  
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE email = auth.jwt()->>'email' 
        AND status = 'active'
    );
$$;

-- Function to get current admin user ID
CREATE OR REPLACE FUNCTION public.get_current_admin_user_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT id FROM public.admin_users 
    WHERE email = auth.jwt()->>'email' 
    AND status = 'active'
    LIMIT 1;
$$;

-- Function to check admin online status
CREATE OR REPLACE FUNCTION public.get_admin_online_status(admin_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_sessions 
        WHERE admin_sessions.admin_user_id = $1 
        AND is_active = TRUE 
        AND last_seen > NOW() - INTERVAL '5 minutes'
        AND expires_at > NOW()
    );
$$;

-- Function to update admin session heartbeat
CREATE OR REPLACE FUNCTION public.update_admin_session_heartbeat(session_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.admin_sessions 
    SET last_seen = NOW(),
        expires_at = NOW() + INTERVAL '24 hours'
    WHERE admin_sessions.session_token = $1
    AND is_active = TRUE
    AND expires_at > NOW();
    
    RETURN FOUND;
END;
$$;

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
    action_type TEXT,
    target_type TEXT,
    target_id TEXT DEFAULT NULL,
    action_details JSONB DEFAULT '{}'
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id BIGINT;
    current_admin_id UUID;
BEGIN
    -- Get current admin user ID
    SELECT public.get_current_admin_user_id() INTO current_admin_id;
    
    IF current_admin_id IS NULL THEN
        RAISE EXCEPTION 'No active admin user found';
    END IF;
    
    -- Insert audit log entry
    INSERT INTO public.admin_audit_log (
        admin_user_id,
        action_type, 
        target_type,
        target_id,
        action_details,
        ip_address,
        user_agent
    ) VALUES (
        current_admin_id,
        $1,
        $2, 
        $3,
        $4,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent'
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- ==========================================
-- 7. TRIGGERS FOR AUTOMATIC LOGGING
-- ==========================================

-- Function to automatically log admin user changes
CREATE OR REPLACE FUNCTION public.trigger_admin_users_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Log admin user creation
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_admin_action(
            'create_admin_user',
            'admin_user', 
            NEW.id::TEXT,
            jsonb_build_object(
                'email', NEW.email,
                'status', NEW.status,
                'is_master', NEW.is_master
            )
        );
        RETURN NEW;
    END IF;
    
    -- Log admin user updates
    IF TG_OP = 'UPDATE' THEN
        PERFORM public.log_admin_action(
            'update_admin_user',
            'admin_user',
            NEW.id::TEXT, 
            jsonb_build_object(
                'email', NEW.email,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'changes', jsonb_build_object(
                    'status_changed', OLD.status != NEW.status,
                    'last_active_updated', OLD.last_active != NEW.last_active
                )
            )
        );
        RETURN NEW;
    END IF;
    
    -- Log admin user deletion
    IF TG_OP = 'DELETE' THEN
        PERFORM public.log_admin_action(
            'delete_admin_user',
            'admin_user',
            OLD.id::TEXT,
            jsonb_build_object(
                'email', OLD.email,
                'was_master', OLD.is_master
            )
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

-- Create trigger for admin users audit
DROP TRIGGER IF EXISTS trigger_admin_users_audit ON public.admin_users;
CREATE TRIGGER trigger_admin_users_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION public.trigger_admin_users_audit();

-- Update timestamps trigger for admin_users
CREATE OR REPLACE FUNCTION public.update_admin_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER trigger_update_admin_users_updated_at
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW EXECUTE FUNCTION public.update_admin_users_updated_at();

COMMIT;

-- ==========================================
-- 8. GRANT PERMISSIONS
-- ==========================================

-- Grant appropriate permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_sessions TO authenticated; 
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE public.admin_audit_log_id_seq TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.is_master_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_admin_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_online_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_admin_session_heartbeat(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action(TEXT, TEXT, TEXT, JSONB) TO authenticated; 