-- Create the api_usage_events table to track API usage across services
create table public.api_usage_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null,
  page text,                -- e.g. '/', '/maps', '/news', ...
  service text not null,    -- 'maptiler' | 'supabase' | 'gemini' | 'news' | 'sa2' | 'internal' | ...
  action text,              -- 'map_load', 'tiles', 'chat', 'select', 'insert', ...
  endpoint text,            -- external endpoint or internal API route
  method text,              -- 'GET' | 'POST' | ...
  status int,               -- HTTP status (if any)
  duration_ms int,          -- request duration in milliseconds
  tokens_in int,            -- tokens used in the request (for AI services)
  tokens_out int,           -- tokens returned in the response (for AI services)
  meta jsonb default '{}'::jsonb,  -- any structured extras
  user_agent text,          -- user agent from the request headers
  client_ip inet            -- client IP address
);

-- Create indexes for efficient querying
create index on public.api_usage_events(user_id, created_at desc);
create index on public.api_usage_events(service, created_at desc);
create index on public.api_usage_events(created_at desc);
create index on public.api_usage_events((meta));

-- RLS policy to restrict access to api_usage_events
alter table public.api_usage_events enable row level security;

-- Only admin users can view all usage events, regular users can view their own
create policy "Admin users can view all usage events"
  on public.api_usage_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_users
      where admin_users.user_id = auth.uid()
    ) OR user_id = auth.uid()
  );

-- Only the system can insert usage events
create policy "System can insert usage events"
  on public.api_usage_events
  for insert
  to authenticated
  with check (true);

-- Add comments for documentation
comment on table public.api_usage_events is 'Tracks API usage across different services and pages';
comment on column public.api_usage_events.user_id is 'User who made the API call';
comment on column public.api_usage_events.page is 'Page from which the API call was made';
comment on column public.api_usage_events.service is 'Service being used (maptiler, supabase, gemini, etc.)';
comment on column public.api_usage_events.action is 'Specific action being performed';
comment on column public.api_usage_events.endpoint is 'API endpoint or route called';
comment on column public.api_usage_events.tokens_in is 'Number of tokens in the request (for AI services)';
comment on column public.api_usage_events.tokens_out is 'Number of tokens in the response (for AI services)'; 