-- Check admin_users table structure
SELECT 
  column_name, 
  data_type
FROM 
  information_schema.columns 
WHERE 
  table_name = 'admin_users'
ORDER BY 
  ordinal_position;

-- Check current admin user
SELECT *
FROM admin_users
WHERE email = 'apirat.kongchanagul@gmail.com';

-- Update the status if needed
UPDATE admin_users
SET status = 'active'
WHERE email = 'apirat.kongchanagul@gmail.com'
AND (status IS NULL OR status != 'active');

-- Verify the update
SELECT id, email, status, is_master
FROM admin_users
WHERE email = 'apirat.kongchanagul@gmail.com'; 