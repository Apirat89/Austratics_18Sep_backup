-- Test data for api_usage_events with multiple users
-- This script creates several users with varied usage patterns for testing the table view

-- Create a temp table to store user details
CREATE TEMP TABLE temp_users (
  user_id UUID,
  email TEXT
);

-- Insert test users - replace these emails with actual users in your system
-- or keep them as is if you just want sample data for testing
INSERT INTO temp_users VALUES
  -- Use your actual admin user ID here for one of the entries
  ((SELECT id FROM auth.users WHERE email = 'apirat.kongchanagul@gmail.com'), 'apirat.kongchanagul@gmail.com'),
  (gen_random_uuid(), 'test.user1@example.com'),
  (gen_random_uuid(), 'test.user2@example.com'),
  (gen_random_uuid(), 'test.user3@example.com'),
  (gen_random_uuid(), 'test.user4@example.com');

-- Function to generate test data for all users
DO $$
DECLARE
  user_record RECORD;
  current_date TIMESTAMPTZ := NOW();
  days_ago INTERVAL;
BEGIN
  -- For each user, create some usage data
  FOR user_record IN SELECT * FROM temp_users LOOP
    RAISE NOTICE 'Adding data for user: % (%)', user_record.email, user_record.user_id;

    -- Generate data for the past 90 days (with more recent data)
    FOR i IN 1..90 LOOP
      days_ago := (i || ' days')::INTERVAL;

      -- Supabase usage
      FOR j IN 1..CEIL(RANDOM() * 5)::INT LOOP
        INSERT INTO public.api_usage_events 
          (user_id, service, action, method, status, created_at)
        VALUES
          (user_record.user_id, 'supabase', 'query', 'GET', 200, current_date - days_ago + (RANDOM() * '1 day'::INTERVAL));
      END LOOP;

      -- MapTiler usage (more for recent days, less in the past)
      IF i <= 30 AND RANDOM() < 0.7 THEN
        INSERT INTO public.api_usage_events 
          (user_id, service, action, page, created_at)
        VALUES
          (user_record.user_id, 'maptiler', 'map_load', '/maps', current_date - days_ago + (RANDOM() * '1 day'::INTERVAL));
        
        -- Add heatmap renders for some map loads
        IF RANDOM() < 0.5 THEN
          INSERT INTO public.api_usage_events 
            (user_id, service, action, page, created_at)
          VALUES
            (user_record.user_id, 'maptiler', 'heatmap_render', '/maps', current_date - days_ago + (RANDOM() * '1 day'::INTERVAL));
        END IF;
      END IF;

      -- Gemini usage
      IF RANDOM() < 0.4 THEN
        INSERT INTO public.api_usage_events 
          (user_id, service, action, page, tokens_in, tokens_out, duration_ms, created_at)
        VALUES
          (user_record.user_id, 'gemini', 'chat', 
           CASE WHEN RANDOM() < 0.5 THEN '/faq' ELSE '/regulation' END,
           FLOOR(RANDOM() * 200 + 50)::INT, 
           FLOOR(RANDOM() * 600 + 200)::INT,
           FLOOR(RANDOM() * 1000 + 500)::INT,
           current_date - days_ago + (RANDOM() * '1 day'::INTERVAL));
      END IF;

      -- News API usage
      IF RANDOM() < 0.3 THEN
        INSERT INTO public.api_usage_events 
          (user_id, service, action, page, created_at)
        VALUES
          (user_record.user_id, 'news', 'list_news', '/news', current_date - days_ago + (RANDOM() * '1 day'::INTERVAL));
      END IF;
      
      -- Other API usage
      IF RANDOM() < 0.2 THEN
        INSERT INTO public.api_usage_events 
          (user_id, service, action, page, created_at)
        VALUES
          (user_record.user_id, 
           (ARRAY['sa2', 'internal', 'user_info'])[FLOOR(RANDOM() * 3 + 1)],
           'api_call', 
           (ARRAY['/main', '/insights', '/dashboard'])[FLOOR(RANDOM() * 3 + 1)],
           current_date - days_ago + (RANDOM() * '1 day'::INTERVAL));
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Test data creation complete';
END $$;

-- Clean up
DROP TABLE temp_users;

-- Output summary of data created
SELECT 
  e.user_id,
  COUNT(*) AS total_events,
  COALESCE(u.email, 'Unknown') AS user_email,
  COUNT(*) FILTER (WHERE e.service = 'supabase') AS supabase_count,
  COUNT(*) FILTER (WHERE e.service = 'maptiler') AS maptiler_count,
  COUNT(*) FILTER (WHERE e.service = 'gemini') AS gemini_count,
  COUNT(*) FILTER (WHERE e.service = 'news') AS news_count,
  COUNT(*) FILTER (WHERE e.service NOT IN ('supabase', 'maptiler', 'gemini', 'news')) AS other_count
FROM 
  public.api_usage_events e
LEFT JOIN
  auth.users u ON e.user_id = u.id
WHERE
  e.created_at >= NOW() - INTERVAL '30 days'
GROUP BY
  e.user_id, u.email
ORDER BY
  total_events DESC; 