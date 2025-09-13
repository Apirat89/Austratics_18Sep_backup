# Quick Guide: Setting Up Supabase Storage

This is a simplified guide to get your data files into Supabase Storage.

## Step 1: Install Required Packages

```bash
npm install
```

## Step 2: Set Up Your Supabase Credentials

Add these to your `.env` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

You can find these in your Supabase dashboard under Settings → API.

## Step 3: Upload Your Files to Supabase

```bash
# Make the script executable
npm run make-executable

# Upload all files
npm run upload-data
```

That's it! Your application will now use Supabase Storage for data files, with an automatic fallback to local files if needed.

## What Gets Uploaded

- **JSON Data**: SA2 data, provider data, statistics
- **Documents**: PDFs, regulation documents, reports  
- **Images**: Photos, markers, icons
- **FAQ Files**: User guide DOCX files

## When to Update

Upload new files whenever you make quarterly data updates, using the same command:

```bash
npm run upload-data
```

For more details, see the full [SUPABASE_STORAGE.md](./SUPABASE_STORAGE.md) document. 