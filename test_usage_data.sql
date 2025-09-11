-- Test data for api_usage_events
-- This script inserts sample usage data to demonstrate the usage tracking functionality

-- First, get your user ID
-- You can replace this with your actual user ID if you know it
DO $$
DECLARE
  my_user_id UUID;
BEGIN
  -- Get the user ID from a user's email - replace with your email
  SELECT id INTO my_user_id FROM auth.users WHERE email = 'apirat.kongchanagul@gmail.com' LIMIT 1;
  
  IF my_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found! Replace the email in the script with your own.';
  END IF;

  -- Insert test data for map usage
  INSERT INTO public.api_usage_events 
    (user_id, service, action, page, created_at)
  VALUES
    (my_user_id, 'maptiler', 'map_load', '/maps', NOW() - INTERVAL '1 day'),
    (my_user_id, 'maptiler', 'map_load', '/maps', NOW() - INTERVAL '2 days'),
    (my_user_id, 'maptiler', 'map_load', '/maps', NOW() - INTERVAL '3 days'),
    (my_user_id, 'maptiler', 'heatmap_render', '/maps', NOW() - INTERVAL '1 day'),
    (my_user_id, 'maptiler', 'heatmap_render', '/maps', NOW() - INTERVAL '2 days');

  -- Insert test data for API calls
  INSERT INTO public.api_usage_events 
    (user_id, service, action, endpoint, method, status, duration_ms, created_at)
  VALUES
    (my_user_id, 'supabase', 'select', '/api/homecare', 'GET', 200, 150, NOW() - INTERVAL '1 day'),
    (my_user_id, 'supabase', 'insert', '/api/homecare', 'POST', 201, 120, NOW() - INTERVAL '2 days'),
    (my_user_id, 'supabase', 'select', '/api/residential', 'GET', 200, 180, NOW() - INTERVAL '3 days'),
    (my_user_id, 'supabase', 'select', '/api/residential', 'GET', 200, 165, NOW() - INTERVAL '4 days'),
    (my_user_id, 'supabase', 'select', '/api/news', 'GET', 200, 140, NOW() - INTERVAL '5 days');

  -- Insert test data for AI usage
  INSERT INTO public.api_usage_events 
    (user_id, service, action, page, tokens_in, tokens_out, duration_ms, created_at)
  VALUES
    (my_user_id, 'gemini', 'chat', '/faq', 120, 450, 980, NOW() - INTERVAL '1 day'),
    (my_user_id, 'gemini', 'chat', '/faq', 85, 320, 750, NOW() - INTERVAL '2 days'),
    (my_user_id, 'gemini', 'chat', '/regulation', 230, 890, 1200, NOW() - INTERVAL '3 days'),
    (my_user_id, 'gemini', 'chat', '/regulation', 150, 650, 1050, NOW() - INTERVAL '6 days');

  -- Insert test data for SA2 data
  INSERT INTO public.api_usage_events 
    (user_id, service, action, endpoint, created_at)
  VALUES
    (my_user_id, 'sa2', 'load_sa2_data', '/api/sa2', NOW() - INTERVAL '1 day'),
    (my_user_id, 'sa2', 'load_sa2_metrics', '/api/sa2?metrics=true', NOW() - INTERVAL '1 day'),
    (my_user_id, 'sa2', 'load_sa2_data', '/api/sa2', NOW() - INTERVAL '4 days');

  -- Insert test data for internal API usage
  INSERT INTO public.api_usage_events 
    (user_id, service, action, page, endpoint, created_at)
  VALUES
    (my_user_id, 'internal', 'list_news', '/news', '/api/news', NOW() - INTERVAL '1 day'),
    (my_user_id, 'internal', 'list_news', '/news', '/api/news', NOW() - INTERVAL '2 days'),
    (my_user_id, 'internal', 'list_news', '/news', '/api/news', NOW() - INTERVAL '3 days'),
    (my_user_id, 'internal', 'page_view', '/main', null, NOW() - INTERVAL '1 day'),
    (my_user_id, 'internal', 'page_view', '/residential', null, NOW() - INTERVAL '2 days'),
    (my_user_id, 'internal', 'page_view', '/homecare', null, NOW() - INTERVAL '2 days'),
    (my_user_id, 'internal', 'page_view', '/insights', null, NOW() - INTERVAL '4 days');

  RAISE NOTICE 'Successfully inserted test data for user ID: %', my_user_id;
END $$; 