-- SQL Script to fix issues with the admin_users table
-- This addresses the problem where apirat.kongchanagul appears to have lost the user_id reference

-- 1. Check for null or invalid user_id in admin_users
DO $$
DECLARE
  problem_count INT;
BEGIN
  SELECT COUNT(*) INTO problem_count
  FROM admin_users
  WHERE user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = admin_users.user_id
  );
  
  RAISE NOTICE 'Found % admin users with null or invalid user_id', problem_count;
END $$;

-- 2. Fix the admin user specifically for apirat.kongchanagul by creating a new auth.users entry
DO $$
DECLARE
  admin_id UUID;
  new_user_id UUID;
BEGIN
  -- Get the admin user record
  SELECT id INTO admin_id
  FROM admin_users
  WHERE email = 'apirat.kongchanagul@gmail.com';
  
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin user apirat.kongchanagul@gmail.com not found in admin_users';
  END IF;
  
  -- Check if we have a backup of the user ID
  SELECT id INTO new_user_id
  FROM backup_deleted_users
  WHERE email = 'apirat.kongchanagul@gmail.com'
  ORDER BY deleted_at DESC
  LIMIT 1;
  
  IF new_user_id IS NULL THEN
    -- Generate new UUID if no backup found
    new_user_id := gen_random_uuid();
  END IF;
  
  -- Create a new auth.users entry (but with correct ID if possible)
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmed_at
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'apirat.kongchanagul@gmail.com',
    -- Use a secure, random password hash - this is a placeholder only
    '$2a$10$rqAArGiRlgCU6A2Fvnf9IOKzIK2h.hHGH.f7/g1BOEV9MdBJdXA4a',
    NOW(),
    NULL,
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Master Admin"}',
    NOW(),
    NOW(),
    NOW()
  );
  
  -- Update the admin_users record with the new user_id
  UPDATE admin_users
  SET 
    user_id = new_user_id,
    updated_at = NOW()
  WHERE id = admin_id;
  
  RAISE NOTICE 'Successfully created new auth.users entry for apirat.kongchanagul@gmail.com with ID %', new_user_id;
  RAISE NOTICE 'Updated admin_users record with the new user_id';
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error fixing admin user: %', SQLERRM;
END $$;

-- 3. Verify the fix worked
SELECT 
  a.id as admin_id, 
  a.email, 
  a.user_id, 
  a.status, 
  a.is_master,
  u.email as auth_user_email
FROM 
  admin_users a
LEFT JOIN
  auth.users u ON a.user_id = u.id
WHERE 
  a.email = 'apirat.kongchanagul@gmail.com'; 