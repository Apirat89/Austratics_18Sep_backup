-- Quick fix for get_user_info function data type mismatch
-- This addresses the VARCHAR(255) vs TEXT issue with auth.users.email

-- Drop and recreate the get_user_info function with proper type casting
DROP FUNCTION IF EXISTS get_user_info(UUID);

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
    u.email::TEXT,  -- Cast VARCHAR to TEXT
    p.company_id,
    c.name::TEXT,   -- Cast VARCHAR to TEXT if needed
    p.status::TEXT, -- Cast to TEXT if needed
    p.role::TEXT,   -- Cast to TEXT if needed
    p.last_login_at,
    p.last_seen_ip,
    u.created_at
  FROM auth.users u
  LEFT JOIN profiles p ON p.id = u.id
  LEFT JOIN companies c ON c.id = p.company_id
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT * FROM get_user_info((SELECT id FROM auth.users LIMIT 1)); 