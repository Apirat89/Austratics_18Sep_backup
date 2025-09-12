# Fix Master Admin User

This directory contains scripts to fix the master admin user (apirat.kongchanagul@gmail.com) by removing it from `auth.users` while preserving it in `admin_users`.

## Problem

The master admin user (apirat.kongchanagul@gmail.com) exists in both authentication systems:
1. `auth.users` - Supabase Auth for regular users
2. `admin_users` - Custom admin authentication system

This causes issues when trying to delete the user through the UI, as there are protections for master admin users.

## Solution

The solution is to surgically remove the user from `auth.users` while keeping it in `admin_users`, thus maintaining the separation between the two authentication systems.

## How to Run the Fix

### Option 1: Using Supabase Studio SQL Editor (Recommended)

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of `fix_master_admin_user.sql` or `fix_master_admin_[timestamp].sql`
4. Paste and run the SQL in the editor

### Option 2: Using PSQL

If you have access to the Supabase database via PSQL:

```bash
# Connect to your database
psql "postgres://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres"

# Run the SQL script
\i /path/to/fix_master_admin_user.sql
```

### Option 3: Using Node.js Script (Verification Only)

The `fix_master_admin.js` script can be used to verify the status of the user:

```bash
# Install dependencies if needed
npm install @supabase/supabase-js dotenv

# Run the script
node scripts/fix_master_admin.js
```

This script will:
1. Check if the user exists in `auth.users`
2. Check if the user exists in `admin_users`
3. Export the SQL script for manual execution

## Verification

After running the SQL script, run the Node.js script again to verify the user has been removed from `auth.users`:

```bash
node scripts/fix_master_admin.js
```

You should see output confirming:
- User not found in `auth.users` (expected)
- User confirmed in `admin_users` with master admin status

## Documentation

For more details about the authentication systems in this project, please refer to:
- `docs/authentication-systems.md` 