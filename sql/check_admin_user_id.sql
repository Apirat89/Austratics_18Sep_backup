-- SQL Script to check the user_id in admin_users for apirat.kongchanagul@gmail.com

-- Check fields available in admin_users
SELECT 
  column_name, 
  data_type 
FROM 
  information_schema.columns 
WHERE 
  table_name = 'admin_users' 
ORDER BY 
  ordinal_position;

-- Check apirat.kongchanagul record in admin_users
SELECT 
  *
FROM 
  admin_users 
WHERE 
  email = 'apirat.kongchanagul@gmail.com';

-- Count total number of admin users with status = 'active'
SELECT 
  count(*) as active_admin_count 
FROM 
  admin_users 
WHERE 
  status = 'active';

-- Check if the user_id field in admin_users is referencing auth.users
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