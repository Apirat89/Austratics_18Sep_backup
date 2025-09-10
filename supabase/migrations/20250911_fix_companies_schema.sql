-- Notify pgREST to reload schema
SELECT pg_notify('pgrst', 'reload schema');

-- Drop created_by column if it exists (causing issues)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.companies DROP COLUMN created_by;
  END IF;
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema'; 