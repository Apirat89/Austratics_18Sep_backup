-- Surgical SQL script to delete apirat.kongchanagul from auth.users
-- First, backup the user record for safety
DO $$
DECLARE
  user_id uuid := 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5';
  user_email text := 'apirat.kongchanagul@gmail.com';
  user_exists boolean;
BEGIN
  -- Check if the user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id AND email = user_email) INTO user_exists;
  
  IF user_exists THEN
    RAISE NOTICE 'Found user % (%) in auth.users', user_email, user_id;
    
    -- Create backup table if it doesn't exist
    CREATE TABLE IF NOT EXISTS backup_deleted_users (
      id uuid PRIMARY KEY,
      email text NOT NULL,
      deleted_at timestamptz DEFAULT now(),
      user_data jsonb,
      notes text
    );
    
    -- Backup the user data
    INSERT INTO backup_deleted_users (id, email, user_data, notes)
    SELECT 
      id, 
      email, 
      row_to_json(u)::jsonb,
      'Backup before surgical removal of user record'
    FROM auth.users u
    WHERE id = user_id;
    
    RAISE NOTICE 'User data backed up to backup_deleted_users table';
    
    -- Check if user_events table exists and has references to this user
    BEGIN
      PERFORM 1 FROM information_schema.tables WHERE table_name = 'user_events';
      IF FOUND THEN
        -- Delete from user_events first to avoid foreign key issues
        DELETE FROM public.user_events WHERE user_id = user_id;
        RAISE NOTICE 'Removed user_events records for user %', user_id;
      ELSE
        RAISE NOTICE 'user_events table not found, skipping';
      END IF;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'user_events table does not exist, skipping';
    END;
    
    -- Check for profiles table reference
    BEGIN
      PERFORM 1 FROM information_schema.tables WHERE table_name = 'profiles';
      IF FOUND THEN
        -- Delete from profiles
        DELETE FROM public.profiles WHERE id = user_id;
        RAISE NOTICE 'Removed profiles record for user %', user_id;
      ELSE
        RAISE NOTICE 'profiles table not found, skipping';
      END IF;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'profiles table does not exist, skipping';
    END;
    
    -- Now we can safely delete the auth.user record
    DELETE FROM auth.users WHERE id = user_id;
    
    -- Verify deletion
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) INTO user_exists;
    IF user_exists THEN
      RAISE NOTICE 'ERROR: User was not deleted from auth.users';
    ELSE
      RAISE NOTICE 'SUCCESS: User % was deleted from auth.users', user_email;
    END IF;
  ELSE
    RAISE NOTICE 'User % (%) not found in auth.users - nothing to delete', user_email, user_id;
  END IF;
END $$; 