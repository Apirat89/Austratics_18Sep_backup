-- Look at auth.users columns
SELECT 
  column_name, 
  data_type
FROM 
  information_schema.columns 
WHERE 
  table_name = 'users' AND table_schema = 'auth'
ORDER BY 
  ordinal_position;

-- Check apirat.kongchanagul in auth.users
SELECT 
  id,
  email,
  role,
  created_at,
  updated_at
FROM 
  auth.users 
WHERE 
  email = 'apirat.kongchanagul@gmail.com';

-- Check the issue with deleting apirat.kongchanagul
DO $$
BEGIN
  BEGIN
    DELETE FROM auth.users WHERE email = 'apirat.kongchanagul@gmail.com' RETURNING id;
    RAISE NOTICE 'User deleted successfully';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting user: %', SQLERRM;
    -- Check for any references to this user
    RAISE NOTICE 'Checking for foreign key references...';
  END;
END $$;

-- Check if there are any tables referencing auth.users
SELECT
  tc.constraint_name,
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM
  information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE
  tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_schema = 'auth'
  AND ccu.table_name = 'users';

-- Check user references in other tables
DO $$
DECLARE
  userid uuid;
BEGIN
  -- Get the user ID
  SELECT id INTO userid FROM auth.users WHERE email = 'apirat.kongchanagul@gmail.com';
  
  IF userid IS NOT NULL THEN
    RAISE NOTICE 'Found user ID: %', userid;
    
    -- Check if the user ID exists in profiles table
    PERFORM * FROM public.profiles WHERE id = userid;
    RAISE NOTICE 'User exists in profiles table: %', FOUND;
    
    -- Check other possible tables (adjust as needed based on your schema)
    RAISE NOTICE 'Checking other tables for references to this user ID...';
  ELSE
    RAISE NOTICE 'User not found in auth.users';
  END IF;
END $$; 