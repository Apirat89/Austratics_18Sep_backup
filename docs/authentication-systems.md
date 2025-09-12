# Authentication Systems Documentation

## Two Separate Authentication Systems

This application uses two completely separate authentication systems that should remain separate:

1. **Regular User Authentication**
   - **Table**: `auth.users` (Supabase Auth)
   - **Added through**: User Management Tab
   - **Purpose**: Regular application users accessing the application features
   - **API routes**: `/api/admin/auth-users/*` for management
   - **UI**: Shown in User Management tab

2. **Admin Authentication**
   - **Table**: `admin_users` (Custom implementation)
   - **Added through**: Admin Tab
   - **Purpose**: System administrators with special privileges
   - **API routes**: `/api/admin-auth/*` for management
   - **UI**: Shown in Admin tab
   - **Special protection**: Master admin (apirat.kongchanagul@gmail.com) has additional protections

## Important Guidelines

- **Keep Systems Separate**: Admin users should only exist in `admin_users` table; regular users should only exist in `auth.users` table
- **No Synchronization**: The systems are intentionally not synchronized
- **Prevent Duplication**: No user should be created in both systems simultaneously

## Special Case: Master Admin

The master admin user (apirat.kongchanagul@gmail.com) has been removed from the regular auth.users table to maintain proper separation between systems. This user:

- Exists only in `admin_users` table
- Has master admin privileges (`is_master: true`)
- Cannot be deleted through the regular UI
- Manages the entire system through the admin interface

## How to Add Users

### Adding Regular Users

When adding regular users through the User Management tab:
1. Users are created in `auth.users` table
2. Users receive a password reset email
3. Users can only access regular application features

### Adding Admin Users

When adding admin users through the Admin tab:
1. Users are created in `admin_users` table
2. Users receive admin credentials
3. Users can access admin features based on their permissions

## Troubleshooting

If a user exists in both systems (which should be avoided):

1. Determine which role the user should have:
   - If they should be an admin only, delete from `auth.users`
   - If they should be a regular user only, delete from `admin_users`

2. To delete a user from `auth.users` only:
   ```sql
   DELETE FROM auth.users WHERE email = 'user@example.com';
   ```

3. To delete a user from `admin_users` only:
   ```sql
   DELETE FROM admin_users WHERE email = 'user@example.com';
   ```

## Implementation Notes

These systems use different authentication mechanisms:
- Regular users: Supabase Auth JWT tokens
- Admin users: Custom session management with admin-session cookies

This separation provides security benefits by isolating admin functionality from regular user access. 