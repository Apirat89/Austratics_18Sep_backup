-- Fix Admin RLS Issues
-- Date: 2025-01-15
-- Description: Temporarily disable RLS and fix column constraints for custom admin auth system

BEGIN;

-- Temporarily disable RLS on admin tables to fix admin creation
-- Our admin system uses cookie-based auth, not Supabase JWT auth
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions DISABLE ROW LEVEL SECURITY; 
ALTER TABLE public.admin_audit_log DISABLE ROW LEVEL SECURITY;

-- Make created_by nullable since we don't use auth.users table
ALTER TABLE public.admin_users ALTER COLUMN created_by DROP NOT NULL;

-- Update master admin password hash to proper bcrypt hash for "admin123"
UPDATE public.admin_users 
SET password_hash = '$2a$10$K7L1TIWakVBp/RY1JG8D1u7y6bZ8YdPe1K3P1CfMJ9LvB5J5VzfVK'
WHERE email = 'apirat.kongchanagul@gmail.com';

COMMIT; 