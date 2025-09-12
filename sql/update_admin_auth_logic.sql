-- SQL Script to update any functions or logic that might rely on the user_id field
-- This ensures the admin authentication system works properly without the foreign key dependency

-- Step 1: Check if any database functions reference admin_users.user_id
DO $$
DECLARE
  affected_functions text[];
  func_name text;
  func_count int := 0;
BEGIN
  -- Find functions that reference admin_users and user_id
  SELECT array_agg(routine_name) INTO affected_functions
  FROM information_schema.routines r
  WHERE routine_type = 'FUNCTION'
    AND routine_definition LIKE '%admin_users%user_id%'
    AND routine_schema = 'public';
    
  IF affected_functions IS NOT NULL THEN
    FOREACH func_name IN ARRAY affected_functions LOOP
      RAISE NOTICE 'Function that may need review: %', func_name;
      func_count := func_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Found % functions that may reference admin_users.user_id', func_count;
  ELSE
    RAISE NOTICE 'No database functions found that reference admin_users.user_id';
  END IF;
END $$;

-- Step 2: Update admin_sessions table to not rely on user_id if needed
DO $$
DECLARE
  fk_constraint_name text;
BEGIN
  SELECT tc.constraint_name INTO fk_constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'admin_sessions'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'admin_id'
    AND tc.table_schema = 'public';
    
  IF fk_constraint_name IS NOT NULL THEN
    RAISE NOTICE 'admin_sessions table has a foreign key constraint on admin_id: %', fk_constraint_name;
    -- This is normal and should remain - admin_sessions should link to admin_users
  ELSE
    RAISE WARNING 'admin_sessions table has no foreign key constraint on admin_id';
  END IF;
END $$;

-- Step 3: Update the getCurrentAdmin function if it exists as a database function
-- Note: This is just a check since most likely getCurrentAdmin is implemented in the application code
DO $$
DECLARE
  func_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'get_current_admin'
      AND routine_type = 'FUNCTION'
  ) INTO func_exists;
  
  IF func_exists THEN
    RAISE NOTICE 'get_current_admin database function exists and may need updating';
  ELSE
    RAISE NOTICE 'No get_current_admin database function found - it may be implemented in application code';
  END IF;
END $$;

-- Step 4: Check if admin_users table has any triggers that might reference user_id
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'admin_users'
  AND trigger_schema = 'public';

-- Step 5: Verify that apirat.kongchanagul has proper admin privileges
SELECT id, email, status, is_master
FROM admin_users
WHERE email = 'apirat.kongchanagul@gmail.com';

-- Step 6: Add an informational comment that the API code may need updating
DO $$
BEGIN
  RAISE NOTICE '--------------------------------------------------------------------';
  RAISE NOTICE 'IMPORTANT: Application code changes may be needed in the following files:';
  RAISE NOTICE '1. src/lib/adminAuth.ts - Update getCurrentAdmin() function to not rely on user_id';
  RAISE NOTICE '2. src/lib/adminAuth.ts - Update any other functions that might reference user_id';
  RAISE NOTICE '3. src/app/api/admin-auth/users/route.ts - Check any references to user_id';
  RAISE NOTICE '--------------------------------------------------------------------';
END $$; 