# Setting Up Storage Policies in Supabase Dashboard

This guide shows how to manually set up the required storage policies in the Supabase Dashboard to ensure private storage with public exceptions for login page assets.

## 1. Navigate to Storage Settings

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click on "Storage" in the left sidebar
4. Click on "Policies" in the submenu

## 2. Create Public Access Policy for Login Images

Follow these steps to create a policy allowing unauthenticated users to access login page background images:

1. Find the "images" bucket in the list
2. Click "New Policy"
3. Fill in the form with these settings:

   **Policy Settings:**
   - **Name:** Allow public access to login page background images
   - **Allowed operation:** SELECT
   - **FOR:** Anonymous users (anon)
   - **WITH CHECK expression:**
   ```sql
   name LIKE '%koala%' OR 
   name LIKE '%aerial%' OR 
   name LIKE '%scarborough%' OR
   name LIKE '%australian%' OR
   name LIKE '%aerial-view%'
   ```
   - Click "Create Policy"

It should look similar to this:

```
┌──────────────────────────────────────────────────────────────┐
│ Create Policy for Bucket "images"                            │
├──────────────────────────────────────────────────────────────┤
│ Name: Allow public access to login page background images    │
│                                                              │
│ Allowed operation: ● SELECT  ○ INSERT  ○ UPDATE  ○ DELETE    │
│                                                              │
│ FOR: ○ All authenticated users  ● Anonymous users (anon)     │
│                                                              │
│ WITH CHECK expression:                                       │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ name LIKE '%koala%' OR                                 │   │
│ │ name LIKE '%aerial%' OR                                │   │
│ │ name LIKE '%scarborough%' OR                           │   │
│ │ name LIKE '%australian%' OR                            │   │
│ │ name LIKE '%aerial-view%'                              │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ [Cancel]                  [Create Policy]                    │
└──────────────────────────────────────────────────────────────┘
```

## 3. Create Authenticated Access Policy for All Other Files

Now create a policy for authenticated users to access all files:

1. For each bucket (images, json_data, documents, faq), do the following:
   
   **Policy Settings:**
   - **Name:** Allow authenticated users to access files
   - **Allowed operation:** SELECT
   - **FOR:** All authenticated users
   - **WITH CHECK expression:**
   ```sql
   true
   ```
   - Click "Create Policy"

## 4. Verify Your Policies

After creating all policies, the Storage Policies page should show:

- "Allow public access to login page background images" (for images bucket)
- "Allow authenticated users to access files" (for all buckets)

## 5. Test Access

1. **Login page access:**
   - Open your site in an incognito window
   - The login page should display with background images

2. **Authenticated access:**
   - Login to your site
   - All content should be accessible

3. **Public access to protected content:**
   - In an incognito window, try accessing a JSON data file directly using its URL
   - You should get an access denied error 