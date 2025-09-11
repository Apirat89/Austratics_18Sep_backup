-- Test data for api_usage_events with email identification
-- This script creates a table to store user email lookups and adds sample usage data

-- First, create a temporary lookup table for email-to-user mapping
CREATE TEMP TABLE user_email_mapping AS
SELECT id, email FROM auth.users;

-- Function to look up user by email and insert usage data
CREATE OR REPLACE FUNCTION insert_test_data_for_email(user_email text)
RETURNS void AS $$
DECLARE
  user_id_var UUID;
BEGIN
  -- Find the user ID from the email
  SELECT id INTO user_id_var FROM user_email_mapping WHERE email = user_email LIMIT 1;
  
  IF user_id_var IS NULL THEN
    RAISE NOTICE 'User with email % not found, skipping', user_email;
    RETURN;
  END IF;

  RAISE NOTICE 'Adding test data for user % (email: %)', user_id_var, user_email;

  -- Insert test data for map usage
  INSERT INTO public.api_usage_events 
    (user_id, service, action, page, created_at)
  VALUES
    (user_id_var, 'maptiler', 'map_load', '/maps', NOW() - INTERVAL '1 day'),
    (user_id_var, 'maptiler', 'map_load', '/maps', NOW() - INTERVAL '2 days'),
    (user_id_var, 'maptiler', 'heatmap_render', '/maps', NOW() - INTERVAL '1 day');

  -- Insert test data for API calls
  INSERT INTO public.api_usage_events 
    (user_id, service, action, endpoint, method, status, duration_ms, created_at)
  VALUES
    (user_id_var, 'supabase', 'select', '/api/homecare', 'GET', 200, 150, NOW() - INTERVAL '1 day'),
    (user_id_var, 'supabase', 'select', '/api/residential', 'GET', 200, 180, NOW() - INTERVAL '3 days');

  -- Insert test data for AI usage
  INSERT INTO public.api_usage_events 
    (user_id, service, action, page, tokens_in, tokens_out, duration_ms, created_at)
  VALUES
    (user_id_var, 'gemini', 'chat', '/faq', 120, 450, 980, NOW() - INTERVAL '1 day'),
    (user_id_var, 'gemini', 'chat', '/regulation', 230, 890, 1200, NOW() - INTERVAL '3 days');

  -- Insert test data for other services
  INSERT INTO public.api_usage_events 
    (user_id, service, action, endpoint, created_at, meta)
  VALUES
    (user_id_var, 'sa2', 'load_sa2_data', '/api/sa2', NOW() - INTERVAL '1 day', jsonb_build_object('email', user_email)),
    (user_id_var, 'internal', 'list_news', '/api/news', NOW() - INTERVAL '1 day', jsonb_build_object('email', user_email)),
    (user_id_var, 'internal', 'page_view', '/main', NOW() - INTERVAL '1 day', jsonb_build_object('email', user_email));

  -- Insert metadata record with email
  INSERT INTO public.api_usage_events 
    (user_id, service, action, page, created_at, meta)
  VALUES
    (user_id_var, 'user_info', 'login', '/auth/signin', NOW() - INTERVAL '12 hours', 
     jsonb_build_object(
       'email', user_email,
       'user_type', 'regular',
       'login_method', 'password'
     )
    );
END;
$$ LANGUAGE plpgsql;

-- Add test data for specific users - replace these with actual emails in your system
SELECT insert_test_data_for_email('apirat.kongchanagul@gmail.com');

-- For testing with multiple users, uncomment and modify these lines:
-- SELECT insert_test_data_for_email('other.user@example.com');
-- SELECT insert_test_data_for_email('another.user@example.com');

-- Clean up
DROP FUNCTION IF EXISTS insert_test_data_for_email(text);
DROP TABLE IF EXISTS user_email_mapping;

-- Notice to confirm completion
DO $$
BEGIN
  RAISE NOTICE 'Test data insertion completed';
END $$; 