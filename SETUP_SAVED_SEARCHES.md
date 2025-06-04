# Saved Searches Feature Setup

This guide explains how to set up and use the new Saved Searches feature for the Maps page.

## Overview

The Saved Searches feature allows users to:
- Save up to 100 location searches to their account
- Quick access to saved searches from the left sidebar
- Auto-navigation to saved locations with one click
- Visual feedback when searches are already saved
- Organized display with scroll support for long lists

## Database Setup

### 1. Run the Database Migration

Execute the following SQL script in your Supabase SQL editor:

```sql
-- Run this in Supabase SQL Editor
\i sql/create_saved_searches_table.sql
```

Or copy and paste the contents of `sql/create_saved_searches_table.sql` directly into the Supabase SQL editor.

### 2. Verify the Migration

After running the migration, verify that the table was created:

```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'saved_searches';

-- Check table structure
\d saved_searches;
```

## Features

### 1. Save Location Button
- Appears next to the search bar when a search has been performed
- Shows a bookmark icon for unsaved searches
- Shows a checkmark icon for already saved searches
- Disabled state when saving is in progress
- Green background when search is already saved

### 2. Saved Searches Sidebar
- Located in the left sidebar above Map Settings
- Header shows "X/100" counter indicating saved searches count
- Collapsible dropdown similar to Map Settings
- Scrollable list when searches exceed container height
- Empty state with helpful instructions

### 3. Search Management
- Click any saved search to navigate to that location
- Hover over saved searches to reveal delete button (three dots)
- "Clear all" option to remove all saved searches
- Visual indicators for different location types (facilities vs geographic areas)
- Automatic deduplication (can't save the same search twice)

### 4. Visual Feedback
- Search bar shows "Saved" indicator for current search if it's been saved
- Different icons for different location types:
  - 📍 Geographic areas (postcodes, SA2, SA3, SA4, LGA, localities)
  - 🏥 Healthcare facilities
  - 🏛️ Residential care (red)
  - 🏠 Home care (green)
  - ✉️ Retirement living (purple)

## Technical Implementation

### Database Schema
- Table: `saved_searches`
- Fields: `id`, `user_id`, `search_term`, `search_display_name`, `search_type`, `location_data`, `created_at`, `updated_at`
- Row Level Security enabled
- 100 search limit enforced at database level
- JSON storage for location coordinates and metadata

### Components Added
1. **SavedSearches.tsx** - Main sidebar component
2. **savedSearches.ts** - Database operations library
3. **Updated MapSearchBar.tsx** - Added save functionality
4. **Updated maps/page.tsx** - Integrated components

### API Functions
- `saveSearchToSavedSearches()` - Save a search with location data
- `getUserSavedSearches()` - Retrieve user's saved searches
- `deleteSavedSearch()` - Remove a specific saved search
- `clearUserSavedSearches()` - Remove all user's saved searches
- `isSearchSaved()` - Check if a search is already saved

## Usage Instructions

### For Users

1. **Saving a Search:**
   - Search for any location using the search bar
   - Click the bookmark icon next to the search input
   - The icon will turn into a checkmark when saved successfully

2. **Accessing Saved Searches:**
   - Click "Saved Locations" in the left sidebar
   - Browse your saved searches in the dropdown
   - Click any saved search to navigate to that location

3. **Managing Saved Searches:**
   - Hover over a saved search and click the three dots
   - Select "Delete" to remove individual searches
   - Use "Clear all" to remove all saved searches

4. **Search Limits:**
   - Each user can save up to 100 searches
   - The counter shows current usage (e.g., "25/100")
   - Delete old searches to make room for new ones

### For Developers

1. **Component Integration:**
   ```typescript
   // Add to parent component
   const savedSearchesRef = useRef<SavedSearchesRef>(null);
   
   // Refresh saved searches after saving
   const handleSavedSearchAdded = () => {
     savedSearchesRef.current?.refreshSavedSearches();
   };
   ```

2. **Database Operations:**
   ```typescript
   import { saveSearchToSavedSearches, getUserSavedSearches } from '../lib/savedSearches';
   
   // Save a search
   const result = await saveSearchToSavedSearches(userId, searchTerm, locationData);
   
   // Get user's searches
   const { searches, count, hasReachedLimit } = await getUserSavedSearches(userId);
   ```

## Troubleshooting

### Common Issues

1. **Database Table Not Found:**
   - Ensure you've run the SQL migration script
   - Check Supabase logs for migration errors

2. **Save Button Not Appearing:**
   - Verify user authentication
   - Check browser console for JavaScript errors

3. **Searches Not Saving:**
   - Check Supabase API keys in environment variables
   - Verify Row Level Security policies

4. **100 Search Limit Reached:**
   - Users must delete existing searches to save new ones
   - Clear all searches or delete individual searches

### Error Messages

- "Maximum of 100 saved searches allowed" - User at limit
- "This search is already saved" - Duplicate search attempt
- "Database not initialized" - Migration not run
- "Failed to save search" - General save error

## Security

- Row Level Security (RLS) enabled on `saved_searches` table
- Users can only access their own saved searches
- SQL injection protection through parameterized queries
- API key authentication required for all operations

## Performance

- Lazy loading of saved searches (only when sidebar expanded)
- Efficient indexing on `user_id` and `created_at` fields
- JSON storage for location data reduces database complexity
- Client-side caching reduces unnecessary API calls 