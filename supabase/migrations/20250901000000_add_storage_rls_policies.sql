-- =============================================================================
-- STORAGE BUCKET RLS POLICIES
-- =============================================================================
-- This migration adds Row Level Security policies to all storage buckets
-- Only authenticated users can access private buckets

-- -----------------------------------------------------------------------------
-- ENABLE RLS ON ALL BUCKETS
-- -----------------------------------------------------------------------------
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- BUCKET ACCESS POLICIES
-- -----------------------------------------------------------------------------

-- PUBLIC POLICY FOR AUTHENTICATED USERS ONLY:
-- Applies to all buckets since they are now set to private
CREATE POLICY "Allow authenticated users to access objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (true);

-- PUBLIC ACCESS POLICY FOR LOGIN PAGE BACKGROUND IMAGES:
-- This allows anyone (even unauthenticated users) to access login page images
CREATE POLICY "Allow public access to login page background images"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'images' AND 
  (
    name LIKE '%koala%' OR 
    name LIKE '%aerial%' OR 
    name LIKE '%scarborough%' OR
    name LIKE '%australian%' OR
    name LIKE '%aerial-view%'
  )
);

-- DOWNLOAD POLICY FOR AUTHENTICATED USERS ONLY:
CREATE POLICY "Allow authenticated users to download objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (true);

-- UPLOAD POLICY FOR SERVICE ROLE ONLY:
-- This is for our server-side upload script
CREATE POLICY "Allow service role to upload objects"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (true);

-- UPDATE POLICY FOR SERVICE ROLE ONLY:
CREATE POLICY "Allow service role to update objects"
ON storage.objects
FOR UPDATE
TO service_role
USING (true);

-- -----------------------------------------------------------------------------
-- BUCKET BROWSING POLICIES
-- -----------------------------------------------------------------------------

-- Allow authenticated users to list buckets
CREATE POLICY "Allow authenticated users to list buckets"
ON storage.buckets
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to list objects in buckets
CREATE POLICY "Allow authenticated users to browse objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (true);

-- Allow public access to list login page images
CREATE POLICY "Allow public to list login page images"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'images' AND 
  (
    name LIKE '%koala%' OR 
    name LIKE '%aerial%' OR 
    name LIKE '%scarborough%' OR
    name LIKE '%australian%' OR
    name LIKE '%aerial-view%'
  )
);

-- -----------------------------------------------------------------------------
-- NOTES
-- -----------------------------------------------------------------------------
-- These policies enforce that:
-- 1. Only authenticated users can download files from all buckets
-- 2. Only the service role can upload/modify files
-- 3. Unauthenticated users cannot access any files EXCEPT login page images
-- 4. Login page background images have special public access
--
-- To test these policies, use the SQL Editor in Supabase Dashboard:
--
-- For an authenticated user session:
-- SELECT auth.uid() IS NOT NULL AS is_authenticated;
-- SELECT * FROM storage.objects LIMIT 10;  -- Should return records
--
-- For an unauthenticated session:
-- SELECT auth.uid() IS NOT NULL AS is_authenticated;
-- SELECT * FROM storage.objects WHERE bucket_id = 'images' AND name LIKE '%koala%';  -- Should return specific login images 