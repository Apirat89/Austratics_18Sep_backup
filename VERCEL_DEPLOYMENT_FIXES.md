# Vercel Deployment Fixes

This document outlines the issues with the Vercel deployment and provides solutions for fixing them.

## Current Issues

1. **Missing Background Image on Sign-On Page**
   - The background images from Supabase Storage aren't loading correctly
   - We've updated the code to add more debugging and fallbacks

2. **Maps Page UI/UX Different**
   - The Maps page now uses a simpler UI with the `MapDisplay` component
   - This was part of the refactoring to fix the Supabase Storage integration

3. **MapTiler API Key Error**
   - Error message: "MapTiler API key is missing. Add NEXT_PUBLIC_MAPTILER_KEY to your environment variables"
   - The code is looking for `NEXT_PUBLIC_MAPTILER_KEY` but you have `MAPTILER_API_KEY` in your environment

## Solutions

### 1. Environment Variable Fixes

You need to ensure your environment variables are properly set in **Vercel's Environment Variables** section:

1. Log into Vercel dashboard
2. Go to your project settings
3. Navigate to "Environment Variables"
4. Add these variables:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ejhmrjcvjrrsbopffhuo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# MapTiler
NEXT_PUBLIC_MAPTILER_KEY=kRXIomKt5G8qkT2RIMQD
```

**Important:** The environment variable for MapTiler must be named `NEXT_PUBLIC_MAPTILER_KEY` in Vercel.

### 2. Code Changes Made

1. **MapDisplay Component**
   - Added support for multiple MapTiler API key environment variable names
   - Improved error messaging to be more helpful

2. **Login Page**
   - Enhanced debugging for the background image loading
   - Added better fallback mechanisms when Supabase Storage URLs fail

### 3. Supabase Storage Bucket Configuration

Make sure your Supabase Storage buckets are properly configured:

1. **Images Bucket**: Should be set to "Public" since these are general UI assets
2. **JSON Data Bucket**: Should have Row Level Security policies if it contains sensitive data

### 4. Vercel Build Command

If you're still having issues, consider adding a custom build command in Vercel that sets the environment variables:

```
NEXT_PUBLIC_MAPTILER_KEY=$MAPTILER_API_KEY next build
```

This will map your existing `MAPTILER_API_KEY` to the variable name the code expects.

## Manual Verification Steps

After deploying, check:

1. Open browser developer tools (F12)
2. Look at the Console for any error messages
3. Check the Network tab to see if any requests to Supabase Storage are failing
4. Verify that your MapTiler requests are working correctly

If you continue experiencing issues, provide the exact error messages from the browser console for further troubleshooting. 