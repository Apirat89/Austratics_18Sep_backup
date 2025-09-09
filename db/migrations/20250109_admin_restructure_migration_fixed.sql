-- Admin Page Restructure Migration (CORRECTED FOR SUPABASE AUTH)
-- Date: 2025-01-09
-- Description: Complete database schema changes for new admin system
-- Note: Uses Supabase auth.users and updates existing profiles table

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;

BEGIN;

-- ==========================================
-- 1. CREATE NEW TABLES
-- ==========================================

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  primary_domains TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Company emails (verified lists)
CREATE TABLE IF NOT EXISTS company_emails (
  id BIGSERIAL PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified','pending','blocked')) DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','bulk','auto-domain')),
  note TEXT,
  added_by UUID REFERENCES auth.users(id), -- References Supabase auth.users
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, email)
);

-- API calls tracking (for usage analytics)
CREATE TABLE IF NOT EXISTS api_calls (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- References Supabase auth.users
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  error_code TEXT,
  error_message TEXT,
  ip INET,
  user_agent TEXT,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER
);

-- ==========================================
-- 2. UPDATE EXISTING PROFILES TABLE
-- ==========================================

-- Add new columns to profiles table (if they don't exist)
DO $$ 
BEGIN
  -- Add company_id column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='profiles' AND column_name='company_id') THEN
    ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
  
  -- Add status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='profiles' AND column_name='status') THEN
    ALTER TABLE profiles ADD COLUMN status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active','suspended','deleted'));
  END IF;
  
  -- Add role column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='profiles' AND column_name='role') THEN
    ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user','staff','owner'));
  END IF;
  
  -- Add last_login_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='profiles' AND column_name='last_login_at') THEN
    ALTER TABLE profiles ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;
  
  -- Add last_seen_ip column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='profiles' AND column_name='last_seen_ip') THEN
    ALTER TABLE profiles ADD COLUMN last_seen_ip INET;
  END IF;
END $$;

-- ==========================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ==========================================

-- Companies indexes
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- Company emails indexes
CREATE INDEX IF NOT EXISTS idx_company_emails_company_id_status ON company_emails(company_id, status);
CREATE INDEX IF NOT EXISTS idx_company_emails_email_domain ON company_emails((lower(split_part(email,'@',2))));
CREATE INDEX IF NOT EXISTS idx_company_emails_status ON company_emails(status);
CREATE INDEX IF NOT EXISTS idx_company_emails_created_at ON company_emails(created_at);

-- Profiles indexes (for new columns)
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login_at ON profiles(last_login_at);

-- API calls indexes
CREATE INDEX IF NOT EXISTS idx_api_calls_company_id_ts ON api_calls(company_id, ts);
CREATE INDEX IF NOT EXISTS idx_api_calls_user_id_ts ON api_calls(user_id, ts);
CREATE INDEX IF NOT EXISTS idx_api_calls_endpoint_ts ON api_calls(endpoint, ts);
CREATE INDEX IF NOT EXISTS idx_api_calls_status_code_ts ON api_calls(status_code, ts);
CREATE INDEX IF NOT EXISTS idx_api_calls_ts ON api_calls(ts);
CREATE INDEX IF NOT EXISTS idx_api_calls_request_id ON api_calls(request_id);

-- ==========================================
-- 4. CREATE ANALYTICS FUNCTIONS
-- ==========================================

-- Company usage summary
CREATE OR REPLACE FUNCTION get_company_usage_summary(
  p_company_id UUID,
  p_from_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
  total_calls BIGINT,
  unique_users BIGINT,
  avg_latency_ms NUMERIC,
  error_rate NUMERIC,
  total_errors BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_calls,
    COUNT(DISTINCT user_id)::BIGINT as unique_users,
    ROUND(AVG(latency_ms), 2) as avg_latency_ms,
    ROUND(
      (COUNT(*) FILTER (WHERE status_code >= 400))::NUMERIC / 
      GREATEST(COUNT(*), 1) * 100, 2
    ) as error_rate,
    COUNT(*) FILTER (WHERE status_code >= 400)::BIGINT as total_errors
  FROM api_calls
  WHERE company_id = p_company_id 
    AND ts BETWEEN p_from_date AND p_to_date;
END;
$$ LANGUAGE plpgsql;

-- Company usage by endpoint
CREATE OR REPLACE FUNCTION get_company_usage_by_endpoint(
  p_company_id UUID,
  p_from_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
  endpoint TEXT,
  method TEXT,
  total_calls BIGINT,
  total_errors BIGINT,
  avg_latency_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.endpoint,
    a.method,
    COUNT(*)::BIGINT as total_calls,
    COUNT(*) FILTER (WHERE status_code >= 400)::BIGINT as total_errors,
    ROUND(AVG(latency_ms), 2) as avg_latency_ms
  FROM api_calls a
  WHERE a.company_id = p_company_id 
    AND a.ts BETWEEN p_from_date AND p_to_date
  GROUP BY a.endpoint, a.method
  ORDER BY total_calls DESC;
END;
$$ LANGUAGE plpgsql;

-- Company usage by user
CREATE OR REPLACE FUNCTION get_company_usage_by_user(
  p_company_id UUID,
  p_from_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
  user_id UUID,
  user_email TEXT,
  total_calls BIGINT,
  total_errors BIGINT,
  last_call_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.user_id,
    u.email as user_email,
    COUNT(*)::BIGINT as total_calls,
    COUNT(*) FILTER (WHERE status_code >= 400)::BIGINT as total_errors,
    MAX(a.ts) as last_call_at
  FROM api_calls a
  LEFT JOIN auth.users u ON u.id = a.user_id
  WHERE a.company_id = p_company_id 
    AND a.ts BETWEEN p_from_date AND p_to_date
  GROUP BY a.user_id, u.email
  ORDER BY total_calls DESC;
END;
$$ LANGUAGE plpgsql;

-- User usage summary
CREATE OR REPLACE FUNCTION get_user_usage_summary(
  p_user_id UUID,
  p_from_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to_date TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE (
  total_calls BIGINT,
  total_errors BIGINT,
  avg_latency_ms NUMERIC,
  last_call_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_calls,
    COUNT(*) FILTER (WHERE status_code >= 400)::BIGINT as total_errors,
    ROUND(AVG(latency_ms), 2) as avg_latency_ms,
    MAX(ts) as last_call_at
  FROM api_calls
  WHERE user_id = p_user_id 
    AND ts BETWEEN p_from_date AND p_to_date;
END;
$$ LANGUAGE plpgsql;

-- Helper function to get user info (joins auth.users with profiles)
CREATE OR REPLACE FUNCTION get_user_info(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  company_id UUID,
  company_name TEXT,
  status TEXT,
  role TEXT,
  last_login_at TIMESTAMPTZ,
  last_seen_ip INET,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    p.company_id,
    c.name as company_name,
    p.status,
    p.role,
    p.last_login_at,
    p.last_seen_ip,
    u.created_at
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  LEFT JOIN companies c ON c.id = p.company_id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 5. CREATE DEFAULT COMPANY AND UPDATE EXISTING PROFILES
-- ==========================================

-- Create a default company for existing users
INSERT INTO companies (id, name, primary_domains, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  ARRAY['localhost', 'example.com'],
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Assign all existing profiles to the default company
UPDATE profiles 
SET company_id = '00000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;

-- Set first user as owner if no owner exists
UPDATE profiles 
SET role = 'owner'
WHERE id = (
  SELECT p.id FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.role = 'user' 
  ORDER BY u.created_at ASC 
  LIMIT 1
) AND NOT EXISTS (SELECT 1 FROM profiles WHERE role IN ('owner', 'staff'));

-- ==========================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS on sensitive tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_calls ENABLE ROW LEVEL SECURITY;

-- Company access policy (users can only see their own company)
DROP POLICY IF EXISTS company_isolation_policy ON companies;
CREATE POLICY company_isolation_policy ON companies
FOR ALL USING (
  id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ) OR 
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'staff')
  )
);

-- Company emails policy
DROP POLICY IF EXISTS company_emails_policy ON company_emails;
CREATE POLICY company_emails_policy ON company_emails
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ) OR 
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'staff')
  )
);

-- API calls policy
DROP POLICY IF EXISTS api_calls_policy ON api_calls;
CREATE POLICY api_calls_policy ON api_calls
FOR ALL USING (
  company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ) OR 
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'staff')
  )
);

-- ==========================================
-- 7. UPDATE TRIGGERS
-- ==========================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_emails_updated_at ON company_emails;
CREATE TRIGGER update_company_emails_updated_at 
  BEFORE UPDATE ON company_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ==========================================
-- 8. VERIFICATION QUERIES
-- ==========================================

-- Verify tables were created
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE tablename IN ('companies', 'company_emails', 'api_calls')
ORDER BY tablename;

-- Verify columns were added to profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('company_id', 'status', 'role', 'last_login_at', 'last_seen_ip')
ORDER BY column_name;

-- Verify indexes were created
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('companies', 'company_emails', 'api_calls', 'profiles')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Verify functions were created
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name LIKE 'get_%'
  AND routine_schema = 'public'
ORDER BY routine_name;

-- Test the user info function
SELECT * FROM get_user_info((SELECT id FROM auth.users LIMIT 1));

-- Verify profiles have been updated with default company
SELECT 
  COUNT(*) as total_profiles,
  COUNT(*) FILTER (WHERE company_id IS NOT NULL) as with_company,
  COUNT(*) FILTER (WHERE role = 'owner') as owners,
  COUNT(*) FILTER (WHERE status = 'active') as active_users
FROM profiles; 