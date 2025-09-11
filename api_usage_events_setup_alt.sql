-- Create the api_usage_events table to track API usage across services
CREATE TABLE IF NOT EXISTS public.api_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  page text,
  service text NOT NULL,
  action text,
  endpoint text,
  method text,
  status int,
  duration_ms int,
  tokens_in int,
  tokens_out int,
  meta jsonb DEFAULT '{}'::jsonb,
  user_agent text,
  client_ip inet
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_usage_events_user_created ON public.api_usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_events_service_created ON public.api_usage_events(service, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_events_created ON public.api_usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_events_meta ON public.api_usage_events((meta));

-- RLS policy to restrict access to api_usage_events
ALTER TABLE public.api_usage_events ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own events and admins to view all events
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Admin users can view all usage events" ON public.api_usage_events;
  
  CREATE POLICY "Admin users can view all usage events"
    ON public.api_usage_events
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE admin_users.email = auth.jwt()->>'email'
        AND admin_users.status = 'active'
      ) OR user_id = auth.uid()
    );
  
  DROP POLICY IF EXISTS "System can insert usage events" ON public.api_usage_events;
  
  CREATE POLICY "System can insert usage events"
    ON public.api_usage_events
    FOR INSERT
    TO authenticated
    WITH CHECK (true);
END $$; 