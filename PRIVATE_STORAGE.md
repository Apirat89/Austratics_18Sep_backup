# Private Supabase Storage Implementation Guide

This guide explains how to set up private access to your Supabase Storage buckets so that **only authenticated users** can access your files, with specific exceptions for login page assets.

## 1. What Has Been Implemented

I've implemented the following components for secure storage access:

1. **Signed URL Generation**: Added `getSignedUrl()` function in `src/lib/supabase-storage.ts` to create temporary secure URLs
2. **Updated Helpers**: Modified `getImageUrl()` and other helper functions to use signed URLs for private buckets
3. **RLS Policies**: Created SQL migration files that add Row Level Security (RLS) policies to restrict bucket access
4. **Public Exceptions**: Added special policies to allow public access to login page background images
5. **Automatic Fallback**: If signed URL generation fails, the code falls back to local files

## 2. Apply the RLS Policies

Run this command to apply the RLS policies to your Supabase project:

```bash
npm run apply-storage-rls
```

This will:
1. Connect to your Supabase project using the service role key
2. Apply RLS policies to all storage buckets
3. Verify that RLS is properly enabled

## 3. Special Login Page Configuration

To ensure the login page looks good without requiring authentication:

1. **Public Access Policies**: The RLS policies include special exceptions for:
   - Background image files with names containing 'koala', 'aerial', 'scarborough', etc.
   - These files are accessible without authentication

2. **Direct Public URLs**: The login page uses `getPublicUrl()` instead of signed URLs to:
   - Load background images without authentication
   - Maintain visual appearance for non-authenticated users

## 4. Testing Your Setup

1. **Verify in Supabase Dashboard**:
   - Go to your Supabase project dashboard
   - Navigate to Storage → Configuration → RLS Policies
   - You should see the policies listed:
     - "Allow authenticated users to access objects"
     - "Allow public access to login page background images"
     - "Allow service role to upload objects"
     - etc.

2. **Test with logged-in user**:
   - Log in to your application
   - Navigate to pages that display images, JSON data, or documents
   - All content should load correctly

3. **Test with logged-out user**:
   - Open an incognito window (not logged in)
   - The login page should display with proper background images
   - Other pages should redirect to login or show placeholders

## 5. Updating Files

The upload process remains the same:

1. Replace local files with updated versions (keeping the same names)
2. Run `npm run upload-data`
3. The application will automatically use the updated files

## 6. Troubleshooting

### Login Background Images Not Loading

If login page background images aren't loading:
1. Check if the image filenames match the patterns in the RLS policy:
   - They should contain 'koala', 'aerial', 'scarborough', 'australian', etc.
2. Verify the RLS policies have been applied correctly
3. Test accessing the image directly via a signed URL from the browser console

### Images Not Loading After Login

If images don't load for authenticated users:

1. Check browser console for errors
2. Verify user authentication status with:
   ```js
   const { data } = await supabase.auth.getSession();
   console.log('Is authenticated:', !!data.session);
   ```
3. Try temporarily making the bucket public in Supabase Dashboard to isolate the issue

### Database Connection Issues

If RLS policies don't apply:

1. Verify your `.env` has valid Supabase credentials
2. Check if your Supabase instance has the SQL function `exec_sql` available
3. You may need to manually apply the SQL from `supabase/migrations/20250901000000_add_storage_rls_policies.sql`

## 7. Security Considerations

1. **URL Expiration**: Signed URLs expire after 1 hour by default
2. **URL Sharing**: Anyone with a signed URL can access the file until it expires
3. **Service Role Key**: Keep your `SUPABASE_SERVICE_ROLE_KEY` secure - it has full access
4. **Public Assets**: Be careful about which assets you make publicly accessible via exception policies 