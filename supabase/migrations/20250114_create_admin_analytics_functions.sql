-- Analytics Functions for Admin Dashboard
-- Run this after the main admin telemetry migration

-- =====================================================
-- FUNCTION: Get Top/Bottom Features Per User
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_top_bottom_features(window_days TEXT DEFAULT '30 days')
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  feature TEXT,
  feature_label TEXT,
  events_count BIGINT,
  rank_type TEXT -- 'most_used' or 'least_used'
) 
LANGUAGE plpgsql
AS $$
DECLARE
  window_interval INTERVAL;
BEGIN
  -- Convert window_days to interval
  window_interval := window_days::INTERVAL;

  RETURN QUERY
  WITH params AS (
    SELECT window_interval AS win
  ),
  counts AS (
    SELECT 
      ue.user_id, 
      ue.feature, 
      COUNT(*) AS events_n
    FROM public.user_events ue, params
    WHERE ue.ts >= NOW() - params.win
    GROUP BY ue.user_id, ue.feature
  ),
  all_feat AS (
    SELECT 
      u.user_id, 
      f.feature,
      f.label AS feature_label
    FROM (SELECT DISTINCT user_id FROM public.user_events) u
    CROSS JOIN public.feature_dim f
    WHERE f.is_active = TRUE
  ),
  full_counts AS (
    SELECT 
      a.user_id, 
      a.feature,
      a.feature_label,
      COALESCE(c.events_n, 0) AS events_n
    FROM all_feat a 
    LEFT JOIN counts c USING (user_id, feature)
  ),
  ranked AS (
    SELECT *, 
           RANK() OVER (PARTITION BY user_id ORDER BY events_n DESC) AS r_desc,
           RANK() OVER (PARTITION BY user_id ORDER BY events_n ASC) AS r_asc
    FROM full_counts
  )
  SELECT 
    r.user_id,
    p.email,
    r.feature,
    r.feature_label,
    r.events_n,
    CASE 
      WHEN r.r_desc = 1 THEN 'most_used'
      WHEN r.r_asc = 1 THEN 'least_used'
      ELSE 'other'
    END AS rank_type
  FROM ranked r
  JOIN public.profiles p ON p.id = r.user_id
  WHERE r.r_desc = 1 OR r.r_asc = 1
  ORDER BY r.user_id, r.r_desc;
END;
$$;

-- =====================================================
-- FUNCTION: Get Feature Rankings Per User
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_feature_rankings(window_days TEXT DEFAULT '30 days')
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  feature TEXT,
  feature_label TEXT,
  events_count BIGINT,
  user_rank INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
  window_interval INTERVAL;
BEGIN
  window_interval := window_days::INTERVAL;

  RETURN QUERY
  WITH params AS (
    SELECT window_interval AS win
  )
  SELECT 
    ue.user_id,
    p.email,
    ue.feature,
    f.label AS feature_label,
    COUNT(*) AS events_count,
    RANK() OVER (PARTITION BY ue.user_id ORDER BY COUNT(*) DESC) AS user_rank
  FROM public.user_events ue, params
  JOIN public.profiles p ON p.id = ue.user_id
  JOIN public.feature_dim f ON f.feature = ue.feature
  WHERE ue.ts >= NOW() - params.win
  GROUP BY ue.user_id, p.email, ue.feature, f.label
  ORDER BY ue.user_id, user_rank;
END;
$$;

-- =====================================================
-- FUNCTION: Get Users Who Never Used Feature
-- =====================================================

CREATE OR REPLACE FUNCTION get_users_never_used_feature(
  target_feature TEXT, 
  window_days TEXT DEFAULT '90 days'
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
DECLARE
  window_interval INTERVAL;
BEGIN
  window_interval := window_days::INTERVAL;

  RETURN QUERY
  WITH params AS (
    SELECT window_interval AS win
  ),
  all_users AS (
    SELECT DISTINCT ue.user_id
    FROM public.user_events ue, params
    WHERE ue.ts >= NOW() - params.win
  ),
  feature_users AS (
    SELECT DISTINCT ue.user_id
    FROM public.user_events ue, params
    WHERE ue.feature = target_feature 
    AND ue.ts >= NOW() - params.win
  ),
  never_used AS (
    SELECT au.user_id
    FROM all_users au
    LEFT JOIN feature_users fu ON au.user_id = fu.user_id
    WHERE fu.user_id IS NULL
  )
  SELECT 
    nu.user_id,
    p.email,
    p.full_name,
    p.created_at,
    (
      SELECT MAX(ue2.ts)
      FROM public.user_events ue2
      WHERE ue2.user_id = nu.user_id
    ) AS last_activity
  FROM never_used nu
  JOIN public.profiles p ON p.id = nu.user_id
  ORDER BY p.created_at DESC;
END;
$$;

-- =====================================================
-- FUNCTION: Get Overall Feature Usage Stats
-- =====================================================

CREATE OR REPLACE FUNCTION get_feature_usage_stats(window_days TEXT DEFAULT '30 days')
RETURNS TABLE (
  feature TEXT,
  feature_label TEXT,
  category TEXT,
  total_events BIGINT,
  unique_users BIGINT,
  avg_events_per_user NUMERIC,
  events_rank INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
  window_interval INTERVAL;
BEGIN
  window_interval := window_days::INTERVAL;

  RETURN QUERY
  WITH params AS (
    SELECT window_interval AS win
  ),
  feature_stats AS (
    SELECT 
      ue.feature,
      COUNT(*) AS total_events,
      COUNT(DISTINCT ue.user_id) AS unique_users,
      AVG(events_per_user.event_count) AS avg_events_per_user
    FROM public.user_events ue, params
    JOIN (
      SELECT user_id, feature, COUNT(*) AS event_count
      FROM public.user_events ue2, params
      WHERE ue2.ts >= NOW() - params.win
      GROUP BY user_id, feature
    ) events_per_user ON ue.user_id = events_per_user.user_id AND ue.feature = events_per_user.feature
    WHERE ue.ts >= NOW() - params.win
    GROUP BY ue.feature
  )
  SELECT 
    fs.feature,
    f.label AS feature_label,
    f.category,
    fs.total_events,
    fs.unique_users,
    ROUND(fs.avg_events_per_user, 2) AS avg_events_per_user,
    RANK() OVER (ORDER BY fs.total_events DESC) AS events_rank
  FROM feature_stats fs
  JOIN public.feature_dim f ON f.feature = fs.feature
  WHERE f.is_active = TRUE
  ORDER BY fs.total_events DESC;
END;
$$;

-- =====================================================
-- FUNCTION: Get User Activity Summary
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_activity_summary(window_days TEXT DEFAULT '30 days')
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  total_events BIGINT,
  features_used INTEGER,
  first_activity TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  activity_days INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
  window_interval INTERVAL;
BEGIN
  window_interval := window_days::INTERVAL;

  RETURN QUERY
  WITH params AS (
    SELECT window_interval AS win
  ),
  user_stats AS (
    SELECT 
      ue.user_id,
      COUNT(*) AS total_events,
      COUNT(DISTINCT ue.feature) AS features_used,
      MIN(ue.ts) AS first_activity,
      MAX(ue.ts) AS last_activity,
      COUNT(DISTINCT DATE(ue.ts)) AS activity_days
    FROM public.user_events ue, params
    WHERE ue.ts >= NOW() - params.win
    GROUP BY ue.user_id
  )
  SELECT 
    us.user_id,
    p.email,
    p.full_name,
    us.total_events,
    us.features_used,
    us.first_activity,
    us.last_activity,
    us.activity_days
  FROM user_stats us
  JOIN public.profiles p ON p.id = us.user_id
  ORDER BY us.total_events DESC;
END;
$$;

-- Grant execute permissions to authenticated users (RLS will handle access control)
GRANT EXECUTE ON FUNCTION get_user_top_bottom_features(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_feature_rankings(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_never_used_feature(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_feature_usage_stats(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary(TEXT) TO authenticated; 