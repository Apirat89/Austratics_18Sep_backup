-- Fix RLS policy for api_usage_events table to ensure proper access for admin users

-- First, let's check which policy version is currently applied
DO $$
DECLARE
    policy_using text;
BEGIN
    SELECT pg_get_expr(polqual, polrelid) INTO policy_using
    FROM pg_policy
    WHERE polname = 'Admin users can view all usage events'
    AND polrelid = 'public.api_usage_events'::regclass;
    
    RAISE NOTICE 'Current policy USING expression: %', policy_using;
END $$;

-- Drop existing policy
DROP POLICY IF EXISTS "Admin users can view all usage events" ON public.api_usage_events;

-- Create correct policy that checks admin_users.user_id against auth.uid()
-- and ensures the admin is active
CREATE POLICY "Admin users can view all usage events"
  ON public.api_usage_events
  FOR SELECT
  TO authenticated
  USING (
    -- A user can view their own events OR admin users can view all events
    (EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.status = 'active'
    ) OR user_id = auth.uid())
  );

-- Add policy for insert - any authenticated user can insert their own events
DROP POLICY IF EXISTS "Users can insert their own events" ON public.api_usage_events;

CREATE POLICY "Users can insert their own events"
  ON public.api_usage_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR 
              EXISTS (SELECT 1 FROM public.admin_users 
                     WHERE admin_users.user_id = auth.uid() 
                     AND admin_users.status = 'active'));

-- Add a policy for system service to be able to create events
DROP POLICY IF EXISTS "System service can insert events" ON public.api_usage_events;

CREATE POLICY "System service can insert events"
  ON public.api_usage_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Verify the updated policies
DO $$
DECLARE
    policy_record record;
BEGIN
    RAISE NOTICE 'All policies on api_usage_events:';
    FOR policy_record IN
        SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as polqual
        FROM pg_policy
        WHERE polrelid = 'public.api_usage_events'::regclass
    LOOP
        RAISE NOTICE 'Policy: % (%) - %', 
            policy_record.polname, 
            policy_record.polcmd, 
            policy_record.polqual;
    END LOOP;
END $$;

-- Verify that there are no gaps in RLS protection
DO $$
DECLARE
    missing_policies boolean := false;
BEGIN
    -- Check if all standard operations have policies
    FOR cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_policy 
            WHERE polrelid = 'public.api_usage_events'::regclass
            AND polcmd = cmd
        ) THEN
            RAISE NOTICE 'Missing policy for % operation', cmd;
            missing_policies := true;
        END IF;
    END LOOP;
    
    IF NOT missing_policies THEN
        RAISE NOTICE 'All standard operations have policies defined.';
    END IF;
END $$; 