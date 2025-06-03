# Environment Setup Guide

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

### 1. Supabase Configuration (Required for Authentication)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to get these:**
1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project or select existing one
3. Go to Settings → API
4. Copy the Project URL and anon public key
5. Copy the service_role key (keep this secret!)

### 2. Email Configuration (Required for Password Reset)

```bash
RESEND_API_KEY=re_1234567890abcdef...
```

**How to get this:**
1. Go to [Resend](https://resend.com/) and create an account
2. Generate an API key in your dashboard
3. Copy the API key

**Alternative: Using Gmail/Outlook SMTP (Optional)**
If you prefer to use your own email provider instead of Resend:

```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**How to set up Gmail:**
1. Enable 2-factor authentication on your Google account
2. Generate an "App Password" (not your regular password)
3. Use the app password in `EMAIL_PASSWORD`

### 3. Gemini AI Configuration

```bash
GEMINI_API_KEY=AIzaSyC...
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyC...
```

**How to get these:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Copy the key

### 4. MapTiler Configuration

```bash
MAPTILER_API_KEY=your_maptiler_api_key_here
NEXT_PUBLIC_MAPTILER_API_KEY=your_maptiler_api_key_here
```

**How to get these:**
1. Go to [MapTiler Cloud](https://cloud.maptiler.com/account/keys/)
2. Create an account
3. Generate an API key

### 5. Application Configuration

```bash
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Note:** `NEXT_PUBLIC_SITE_URL` is used for password reset email redirects. Set this to your production domain when deploying.

## Example .env.local File

Create a file called `.env.local` in your project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoyMDE1NTU2MDAwfQ.example-signature-here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIwMTU1NTYwMDB9.example-service-role-signature

# Email (Choose ONE option below)
# Option 1: Resend (Recommended)
RESEND_API_KEY=re_1234567890abcdefghijklmnopqrstuvwxyz

# Option 2: Gmail/Outlook SMTP (Alternative)
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASSWORD=your-app-password

# Gemini AI
GEMINI_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz

# MapTiler
MAPTILER_API_KEY=1234567890abcdef
NEXT_PUBLIC_MAPTILER_API_KEY=1234567890abcdef

# App Config
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Email Configuration Details

### Custom Password Reset Emails

The application now sends beautiful, professional password reset emails from your own domain/email address instead of Supabase's default emails.

**Features:**
- Professional HTML email template with your branding
- Secure token-based reset system
- 1-hour expiration for security
- Rate limiting (3 attempts per 15 minutes)
- Mobile-responsive design

**Email Customization:**
To customize the email template, edit `src/lib/email.ts`:
- Change the "from" email address to your domain
- Modify the email content and styling
- Add your company logo or branding

**Domain Setup for Resend:**
1. Add your domain in Resend dashboard
2. Configure DNS records (SPF, DKIM, DMARC)
3. Update the "from" address in `src/lib/email.ts`
4. Example: `from: 'Aged Care Analytics <noreply@yourdomain.com>'`

## Security Notes

- **Never commit `.env.local` to git** (it's already in `.gitignore`)
- Keep your service role key secret - it has admin access to your database
- Keep your email API keys secure - they can send emails on your behalf
- Use different keys for development and production
- Regenerate keys if you suspect they've been compromised

## Next Steps

1. Create your `.env.local` file with real values
2. Set up either Resend or Gmail for email sending
3. Test the authentication by running `npm run dev`
4. Try the complete password reset flow:
   - Go to forgot password page
   - Enter your email
   - Check your email for the reset link
   - Click the link and set a new password

## Setting up Supabase Authentication

In your Supabase dashboard:

1. **Disable Email Auth (Since we're using custom emails):**
   - Go to Authentication → Settings
   - Disable "Enable email confirmations" (we handle this ourselves)

2. **Configure Site URL:**
   - Set Site URL to `http://localhost:3000` for development
   - Add your production URL when deploying

3. **Users Table:**
   - The users are automatically managed by Supabase Auth
   - You can view them under Authentication → Users

## Testing the Setup

Once you have your environment variables set up, you can test:

1. **Basic Authentication:**
   - Start the development server: `npm run dev`
   - Navigate to `/auth/signup`
   - Try creating an account
   - Check your Supabase dashboard under Authentication → Users
   - Navigate to `/` and try logging in

2. **Password Reset Flow:**
   - Go to `/auth/forgot-password`
   - Enter your email address
   - Check your email for the reset link
   - Click the link (should go to `/auth/reset-password?token=...`)
   - Set a new password
   - Try signing in with the new password

## Troubleshooting

### Email Not Sending
- Check your `RESEND_API_KEY` is correct
- Verify your Resend account is active
- Check the console for error messages
- Make sure `NEXT_PUBLIC_SITE_URL` is set correctly

### Reset Link Not Working
- Ensure the token parameter is in the URL
- Check that the token hasn't expired (1 hour limit)
- Verify the reset password page is accessible

### Authentication Issues
- Verify all Supabase environment variables are correct
- Check Supabase dashboard for user creation
- Ensure your Supabase project is active 