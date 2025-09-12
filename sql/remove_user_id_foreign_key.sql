-- SQL Script to remove foreign key dependency from admin_users to auth.users
-- This makes the admin authentication system completely independent from the regular user system

-- Step 1: Identify the foreign key constraint
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'admin_users'
    AND kcu.column_name = 'user_id'
    AND ccu.table_name = 'users';
    
  IF constraint_name IS NOT NULL THEN
    RAISE NOTICE 'Found foreign key constraint: %', constraint_name;
  ELSE
    RAISE NOTICE 'No foreign key constraint found between admin_users.user_id and users table';
  END IF;
END $$;

-- Step 2: Drop the foreign key constraint if it exists
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'admin_users'
    AND kcu.column_name = 'user_id'
    AND ccu.table_name = 'users';
    
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE admin_users DROP CONSTRAINT ' || constraint_name;
    RAISE NOTICE 'Dropped foreign key constraint: %', constraint_name;
  ELSE
    -- Check for any constraints on user_id column specifically
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'admin_users'
      AND kcu.column_name = 'user_id'
      AND tc.constraint_type = 'FOREIGN KEY';
      
    IF constraint_name IS NOT NULL THEN
      EXECUTE 'ALTER TABLE admin_users DROP CONSTRAINT ' || constraint_name;
      RAISE NOTICE 'Dropped foreign key constraint on user_id: %', constraint_name;
    ELSE
      RAISE NOTICE 'No foreign key constraint found for admin_users.user_id';
    END IF;
  END IF;
END $$;

-- Step 3: Update the status of the admin user to ensure it's active
UPDATE admin_users
SET status = 'active'
WHERE email = 'apirat.kongchanagul@gmail.com'
AND (status IS NULL OR status != 'active');

-- Step 4: Verify the changes
SELECT 
  column_name, 
  is_nullable, 
  data_type,
  column_default
FROM 
  information_schema.columns 
WHERE 
  table_name = 'admin_users'
  AND column_name = 'user_id';
  
-- Step 5: Check that no foreign key constraints remain
SELECT
  tc.constraint_name,
  tc.constraint_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM
  information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
WHERE
  tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'admin_users';

-- Step 6: Check admin user entry
SELECT 
  id, 
  email, 
  user_id, 
  status, 
  is_master
FROM 
  admin_users 
WHERE 
  email = 'apirat.kongchanagul@gmail.com'; 