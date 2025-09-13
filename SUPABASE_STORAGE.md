# Supabase Storage Integration

This document explains how to use Supabase Storage for your application's data files, documents, and images. This integration allows your application to work even when your local computer is offline, making it perfect for deployed production environments.

## Why Supabase Storage?

Our application uses many types of data files:
- JSON data files (SA2 data, provider information, etc.)
- Documents (PDFs, DOCX files)
- Images (background photos, markers, etc.)

Previously, these files were stored locally in the repository, which caused two main problems:
1. Large files were not committed to GitHub due to size limitations
2. When the application was deployed, it couldn't access your local files

By moving these files to Supabase Storage, we solve both problems:
- Files are stored in a cloud service accessible from anywhere
- Files can be much larger than GitHub's limits
- Your application works even when your computer is off
- Updates every 3 months are easy to manage

## Implementation Approach

We've implemented a **hybrid approach** that gives you the best of both worlds:

1. **Try Supabase Storage first**: The system first attempts to load files from Supabase Storage.
2. **Fall back to local files**: If Supabase Storage fails or files aren't yet uploaded, it automatically falls back to loading the local files.

This means:
- You can continue working locally without any changes
- Production deployments will use Supabase Storage for better reliability
- The transition is seamless with no downtime or disruption

## Setup Instructions

### 1. Install Required Dependencies

```bash
npm install
```

### 2. Configure Your Supabase Environment

Open `.env` and add your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

You can find these values in your Supabase project dashboard under Settings → API.

### 3. Upload Your Data Files

```bash
# Make the upload script executable
npm run make-executable

# Upload your data files to Supabase Storage
npm run upload-data
```

## Storage Structure

Your files are organized into these buckets:

| Bucket | Contents | Public Access |
|--------|----------|---------------|
| `json_data` | JSON data files, SA2 data, provider data | Yes |
| `documents` | PDF documents, regulations, reports | No |
| `images` | Photos, icons, markers | Yes |
| `faq` | User guide documents (DOCX) | Yes |

## Using Storage Files in Code

The integration is **automatically active** once you set up your environment variables. No code changes are needed as we're using a hybrid approach that falls back to local files.

## Quarterly Updates

To update your data files:

1. Replace the local files with new versions (same filenames)
2. Run `npm run upload-data` to upload the changes
3. The application will automatically use the updated files

## Troubleshooting

- **Files not showing up**: Check your Supabase credentials in `.env`
- **Upload errors**: Ensure you have admin permissions in your Supabase project
- **Node.js errors**: Make sure you have the required dependencies with `npm install`
- **TypeScript errors**: Run `npm run build` before running the upload script

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Managing Storage Buckets](https://supabase.com/docs/guides/storage/buckets) 