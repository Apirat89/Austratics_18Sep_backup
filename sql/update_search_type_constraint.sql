-- Update the search_type constraint to allow 'residential' type
-- This will separate residential page saves from maps page saves

-- Drop the existing constraint
ALTER TABLE saved_searches DROP CONSTRAINT IF EXISTS saved_searches_search_type_check;

-- Add the new constraint with 'residential' included
ALTER TABLE saved_searches ADD CONSTRAINT saved_searches_search_type_check 
  CHECK (search_type IN ('location', 'facility', 'general', 'residential'));

-- Verify the constraint was updated (using pg_get_constraintdef for newer PostgreSQL versions)
SELECT 
  conname,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'saved_searches_search_type_check';
