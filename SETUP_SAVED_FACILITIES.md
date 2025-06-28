# Setup Saved Facilities Feature

## Issue
You're seeing an error when trying to save facilities because the `residential_saved_facilities` table doesn't exist in your database.

## Solution
You need to run the SQL migration to create the required table. Follow these steps:

### Option 1: Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Go to **SQL Editor** in the left sidebar
4. Create a new query and paste the following SQL:

```sql
-- Create dedicated table for residential page saved facilities
-- This ensures complete separation from maps page saved searches

-- Create the residential_saved_facilities table
CREATE TABLE IF NOT EXISTS public.residential_saved_facilities (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    facility_id TEXT NOT NULL,
    facility_name TEXT NOT NULL,
    facility_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate saves per user
ALTER TABLE public.residential_saved_facilities 
ADD CONSTRAINT residential_saved_facilities_user_facility_unique 
UNIQUE (user_id, facility_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_residential_saved_facilities_user_id 
ON public.residential_saved_facilities(user_id);

CREATE INDEX IF NOT EXISTS idx_residential_saved_facilities_created_at 
ON public.residential_saved_facilities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_residential_saved_facilities_user_created 
ON public.residential_saved_facilities(user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.residential_saved_facilities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data isolation
CREATE POLICY "Users can view their own residential saved facilities" 
ON public.residential_saved_facilities FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own residential saved facilities" 
ON public.residential_saved_facilities FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own residential saved facilities" 
ON public.residential_saved_facilities FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own residential saved facilities" 
ON public.residential_saved_facilities FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_residential_saved_facilities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_residential_saved_facilities_updated_at
    BEFORE UPDATE ON public.residential_saved_facilities
    FOR EACH ROW
    EXECUTE FUNCTION update_residential_saved_facilities_updated_at();

-- Create function to enforce 100 facility limit per user
CREATE OR REPLACE FUNCTION check_residential_facility_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.residential_saved_facilities WHERE user_id = NEW.user_id) >= 100 THEN
        RAISE EXCEPTION 'Cannot save more than 100 residential facilities per user';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_residential_facility_limit
    BEFORE INSERT ON public.residential_saved_facilities
    FOR EACH ROW
    EXECUTE FUNCTION check_residential_facility_limit();
```

5. Click **Run** to execute the SQL
6. Refresh your application and try saving a facility again

### Option 2: Local Supabase CLI (If you have it set up)
If you have Supabase CLI installed and linked to your project:

```bash
supabase db push
```

This will apply the migration file we created in `supabase/migrations/20250605_create_residential_saved_facilities.sql`.

## Verification
After running the SQL, you should be able to:
- Save residential facilities
- View saved facilities in the "Saved Facilities" tab
- Remove saved facilities
- See a limit of 100 saved facilities per user

## Features Included
- ✅ User isolation (users can only see their own saved facilities)
- ✅ Duplicate prevention (can't save the same facility twice)
- ✅ 100 facility limit per user
- ✅ Automatic timestamps (created_at, updated_at)
- ✅ Performance-optimized indexes
- ✅ Row Level Security (RLS) policies

## Notes
- The table is completely separate from the maps page saved searches
- All data is isolated per user using Row Level Security
- Deleting a user will automatically clean up their saved facilities 