-- Check the structure of the admin_users table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM 
  information_schema.columns 
WHERE 
  table_name = 'admin_users' 
ORDER BY 
  ordinal_position;

-- Check if there are any foreign keys on the admin_users table
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

-- Check the current record for apirat.kongchanagul
SELECT * 
FROM admin_users 
WHERE email = 'apirat.kongchanagul@gmail.com'; 