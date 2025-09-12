-- Check for any tables that have foreign key references to auth.users
SELECT
  tc.table_schema AS referencing_schema,
  tc.table_name AS referencing_table,
  kcu.column_name AS referencing_column,
  ccu.table_schema AS referenced_schema,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column,
  tc.constraint_name AS constraint_name
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

-- Check if there are other constraints or triggers that might prevent deletion
SELECT
  trigger_schema,
  trigger_name,
  event_manipulation,
  action_statement
FROM
  information_schema.triggers
WHERE
  event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND event_manipulation = 'DELETE';

-- See if there are any rows in profiles that match this user
SELECT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5'
);

-- Check for user_events (the error message mentioned user_events)
SELECT EXISTS (
  SELECT 1 FROM public.user_events 
  WHERE user_id = 'e6aca4f3-4edc-49ff-926d-924e5d8a29d5'
); 