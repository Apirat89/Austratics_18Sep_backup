-- SQL Script to surgically remove apirat.kongchanagul from auth.users without affecting admin_users
-- This maintains separation between the authentication systems while fixing the current issue

-- Step 1: Create backup table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS backup_deleted_users (
  id uuid,
  email text,
  deleted_at timestamptz DEFAULT now(),
  metadata jsonb,
  deletion_reason text
);

-- Step 2: Verify the user exists in auth.users
-- This is apirat.kongchanagul with ID e6aca4f3-4edc-49ff-926d-924e5d8a29d5
DO $$
DECLARE
  user_found boolean;
  user_id uuid := 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5';
  user_email text := 'apirat.kongchanagul@gmail.com';
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users 
    WHERE id = user_id AND email = user_email
  ) INTO user_found;
  
  IF user_found THEN
    RAISE NOTICE 'Found user % (%) in auth.users', user_email, user_id;
  ELSE
    RAISE EXCEPTION 'User % (%) not found in auth.users - aborting operation', user_email, user_id;
  END IF;
  
  -- Verify user exists in admin_users
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE user_id = user_id OR email = user_email
  ) INTO user_found;
  
  IF user_found THEN
    RAISE NOTICE 'Confirmed user % exists in admin_users - safe to proceed', user_email;
  ELSE
    RAISE WARNING 'User % not found in admin_users - check if this is expected', user_email;
  END IF;
END $$;

-- Step 3: Back up user data before deletion
INSERT INTO backup_deleted_users (id, email, metadata, deletion_reason)
SELECT 
  id, 
  email, 
  row_to_json(u)::jsonb,
  'Maintaining separation between admin_users and auth.users systems - master admin should only exist in admin_users'
FROM auth.users u 
WHERE id = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5'
AND email = 'apirat.kongchanagul@gmail.com';

-- Step 4: Delete the user from auth.users only
DO $$
DECLARE
  rows_deleted int;
BEGIN
  DELETE FROM auth.users 
  WHERE id = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5' 
  AND email = 'apirat.kongchanagul@gmail.com';
  
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % row(s) from auth.users', rows_deleted;
  
  IF rows_deleted = 0 THEN
    RAISE WARNING 'No rows deleted - user may not exist in auth.users';
  ELSIF rows_deleted > 1 THEN
    RAISE WARNING 'Multiple rows deleted - this is unexpected and should be investigated';
  ELSE
    RAISE NOTICE 'Successfully removed user from auth.users while preserving admin_users record';
  END IF;
END $$;

-- Step 5: Verification
DO $$
DECLARE
  auth_exists boolean;
  admin_exists boolean;
BEGIN
  -- Verify removal from auth.users
  SELECT EXISTS(
    SELECT 1 FROM auth.users 
    WHERE id = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5'
    OR email = 'apirat.kongchanagul@gmail.com'
  ) INTO auth_exists;
  
  -- Verify existence in admin_users
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE email = 'apirat.kongchanagul@gmail.com'
  ) INTO admin_exists;
  
  IF auth_exists THEN
    RAISE WARNING 'User still exists in auth.users - operation may have failed';
  ELSE
    RAISE NOTICE 'Confirmed: User no longer exists in auth.users';
  END IF;
  
  IF admin_exists THEN
    RAISE NOTICE 'Confirmed: User still exists in admin_users - master admin functionality preserved';
  ELSE
    RAISE WARNING 'User not found in admin_users - this is unexpected and should be investigated';
  END IF;
END $$; 