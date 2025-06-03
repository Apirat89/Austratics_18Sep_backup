# Setup Search History Database

To enable the search history feature for the map page, you need to run the SQL script in your Supabase database.

## Steps:

1. **Open Supabase Dashboard**
   - Go to [supabase.com](https://supabase.com)
   - Navigate to your project
   - Go to "SQL Editor" in the left sidebar

2. **Run the SQL Script**
   - Copy the contents of `sql/create_search_history_table.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the script

3. **Verify the Table**
   - Go to "Table Editor" in the left sidebar
   - You should see a new table called `search_history`
   - The table should have the following columns:
     - `id` (bigint, primary key)
     - `user_id` (uuid, foreign key to auth.users)
     - `search_term` (text)
     - `search_type` (text, default 'location')
     - `created_at` (timestamp with time zone)
     - `updated_at` (timestamp with time zone)

## Features Enabled:

- ✅ User search history storage
- ✅ Search suggestions based on history
- ✅ "More from recent history" functionality
- ✅ Clear search history option
- ✅ Row Level Security (users can only access their own searches)
- ✅ Automatic timestamp updates

## Security:

The table has Row Level Security enabled, so users can only:
- View their own search history
- Insert their own searches
- Update their own searches
- Delete their own searches

## Next Steps:

After running the SQL script, your map page will have:

1. **Search Bar** (top left corner)
   - Real-time search suggestions
   - Search history integration
   - Google Maps-style UI

2. **Layers Control** (bottom left corner)
   - Collapsible design
   - Facility types selection
   - Boundary layers selection
   - Map style selection

3. **No More AI Prompt**
   - Removed from bottom of page as requested

The search functionality will automatically save searches to the database and show them in the dropdown for quick access.