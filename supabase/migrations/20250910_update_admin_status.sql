-- Fix Admin User Status
-- Date: 2025-09-10
-- Description: Update admin user status from 'pending' to 'active' and add missing reset token columns

BEGIN;

-- Update admin user status
UPDATE public.admin_users 
SET status = 'active' 
WHERE email = 'patcompose.8964@gmail.com';

-- Add missing reset token columns
ALTER TABLE public.admin_users 
ADD COLUMN IF NOT EXISTS reset_token TEXT,
ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMPTZ;

COMMIT; 