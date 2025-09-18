# Project Scratchpad

## Background and Motivation

**CRITICAL ISSUE: Password Reset Token Validation Failure - IDENTIFIED**

Based on the user's response, I can now identify the exact issue:

**Problem Details:**
1. **User Type**: Regular user (not admin)
2. **Reset URL**: https://www.austratics.com/auth/reset-password?token=8351457e8e415293163a5fff157b9e41c36be806ba083a21c096ba1d6cbdf891
3. **Environment**: Production
4. **Token**: `8351457e8e415293163a5fff157b9e41c36be806ba083a21c096ba1d6cbdf891`
5. **Error Message**: "Invalid Reset Link - This password reset link is invalid or has expired. Please request a new one."

**ROOT CAUSE ANALYSIS:**
From the provided information, this is clearly a **regular user** using the **correct URL** (`/auth/reset-password`) with a **64-character hex token** (which matches the expected format from `src/lib/auth-tokens.ts`). The issue is likely:

1. **Production Environment Storage Issue**: Production uses Redis via `TokenManager` class, but the token isn't found
2. **Token Expiration**: The token may have expired (1-hour limit)
3. **Redis Connection Problem**: Redis may not be properly configured in production
4. **Token Generation vs Validation Mismatch**: Token created in one system but validated in another

**IMMEDIATE IMPACT:**
- Users cannot reset their passwords
- Critical authentication flow is broken
- Production environment issue affecting real users

**System Architecture Overview:**
The application uses a dual authentication system:
1. **Regular User Authentication** - Custom token-based system with Redis/file storage
2. **Admin Authentication** - Supabase-based system with database token storage

## Key Challenges and Analysis

**PRIMARY CHALLENGE: Production Redis Token Storage Failure**

Based on the specific token and error message, the main challenges are:

### 1. **Production Redis Configuration Issue**
- **Token Format**: `8351457e8e415293163a5fff157b9e41c36be806ba083a21c096ba1d6cbdf891` (64-char hex - correct format)
- **Environment**: Production should use Redis via `TokenManager` class
- **Problem**: Token not found in Redis, suggesting connection or storage issue

### 2. **Token Lifecycle Management**
- **Creation**: Token created via `/api/auth/forgot-password` route
- **Storage**: Should be stored in Redis with 1-hour expiration
- **Validation**: Attempted via `validateResetToken()` in `src/lib/auth-tokens.ts`
- **Issue**: Token validation returning `{ valid: false, error: 'Invalid or expired token' }`

### 3. **Environment Variable Configuration**
- **Redis Connection**: `REDIS_URL` or Redis connection string
- **Fallback Logic**: Production should use Redis, development uses file storage
- **Detection**: `isProduction` flag determines storage method

### 4. **Token Validation Flow**
- **URL**: `/auth/reset-password?token=...`
- **Page Component**: `src/app/auth/reset-password/page.tsx` extracts token
- **Client Component**: `src/app/auth/reset-password/reset-password-content.tsx` handles validation
- **API Call**: Form submission calls `/api/auth/reset-password`

### 5. **Potential Root Causes**
- **Redis Not Connected**: Redis service not available or misconfigured
- **Environment Detection**: `isProduction` flag incorrect, using file storage instead of Redis
- **Token Expiration**: Token older than 1 hour
- **Cross-Environment Issue**: Token created in one environment, validated in another

## High-level Task Breakdown

### Phase 1: Immediate Diagnosis (CRITICAL - 15 min)
1. **Verify Redis Configuration** - Check if Redis is properly configured in production
2. **Test Token Storage System** - Determine if production is using Redis or file storage
3. **Environment Variable Check** - Verify `REDIS_URL` and `isProduction` flag
4. **Manual Token Validation** - Test the specific failing token directly

### Phase 2: System Investigation (HIGH - 30 min)
5. **Add Debug Logging** - Enhanced logging in `validateResetToken()` function
6. **Test Token Creation Flow** - Verify tokens are being created and stored properly
7. **Redis Connection Testing** - Test Redis connectivity in production environment
8. **Environment Detection Fix** - Ensure production properly detects environment

### Phase 3: Fix Implementation (HIGH - 20 min)
9. **Implement Storage Fix** - Based on diagnosis, fix Redis connection or fallback logic
10. **Add Error Handling** - Better error messages for token validation failures
11. **Test Complete Flow** - End-to-end test of password reset with the failing token
12. **Production Deployment** - Deploy fix and verify resolution

## Project Status Board

### 🔴 CRITICAL TASKS - IMMEDIATE DIAGNOSIS (In Progress)
- [ ] **1.1** Verify Redis configuration in production environment
- [ ] **1.2** Test if production is using Redis or file storage for tokens
- [ ] **1.3** Check environment variables (`REDIS_URL`, `isProduction` flag)
- [ ] **1.4** Manual validation test of token: `8351457e8e415293163a5fff157b9e41c36be806ba083a21c096ba1d6cbdf891`

### 🟡 HIGH PRIORITY TASKS - SYSTEM INVESTIGATION (Pending)
- [ ] **2.1** Add debug logging to `validateResetToken()` in `src/lib/auth-tokens.ts`
- [ ] **2.2** Test token creation flow via `/api/auth/forgot-password`
- [ ] **2.3** Test Redis connectivity in production environment
- [ ] **2.4** Fix environment detection logic if needed

### 🟢 IMPLEMENTATION TASKS - FIX DEPLOYMENT (Pending)
- [ ] **3.1** Implement identified storage system fix (Redis connection or fallback)
- [ ] **3.2** Add better error handling and user feedback for token validation
- [ ] **3.3** End-to-end test of complete password reset flow
- [ ] **3.4** Deploy fix to production and verify resolution
- [x] **3.3** Implement fallback strategy if logo fails to load ✅
- [x] **3.4** Update documentation for email template changes ✅

## Executor's Feedback or Assistance Requests

**CRITICAL ISSUE IDENTIFIED - READY FOR IMMEDIATE EXECUTION**

Based on the user's specific information, I now have a clear diagnosis path:

**CONFIRMED DETAILS:**
- **Token**: `8351457e8e415293163a5fff157b9e41c36be806ba083a21c096ba1d6cbdf891`
- **URL**: https://www.austratics.com/auth/reset-password?token=... (correct regular user URL)
- **Environment**: Production (should use Redis storage)
- **Error**: "Invalid Reset Link - This password reset link is invalid or has expired"

**MOST LIKELY ROOT CAUSE:**
The issue is almost certainly a **Redis configuration problem in production**. The token format is correct (64-char hex), the URL is correct, but the validation is failing because:
1. Redis is not properly connected in production
2. Environment detection is wrong (using file storage instead of Redis)
3. Token was created but not properly stored in Redis

**IMMEDIATE ACTION PLAN:**
1. Check `src/lib/auth-tokens.ts` and `src/lib/redis.ts` for Redis configuration
2. Verify production environment variables (`REDIS_URL`)
3. Add debug logging to determine which storage system is being used
4. Test the specific failing token manually

**READY FOR EXECUTOR MODE:** The problem is clearly defined and the investigation path is straightforward.

## Lessons

### Email Template Development Best Practices (Updated)
- **Asset Management**: Always keep email assets in public directory for accessibility
- **Logo Processing**: Use ImageMagick to create white versions of logos for email headers
- **Email Optimization**: Create smaller versions (60px) for faster email loading
- **CSS Styling**: Use circular containers with padding for professional logo presentation
- **Fallback Strategy**: Always provide emoji/text fallback for when images don't load
- **Consistency**: Multiple email templates require identical logo implementation
- **Environment Awareness**: Use environment variables for URL construction (dev vs prod)
- **Testing**: Use HTML preview files for quick visual verification before deployment

---

## KEY FILES FOR LOGO REPLACEMENT TASK

### 🎨 **PRIMARY EMAIL TEMPLATE FILES (MUST UPDATE)**
1. **`src/lib/email.ts`** - Regular user password reset email template (line 35: 🏥 emoji)
2. **`src/lib/emailService.ts`** - Admin password reset email template (line 476: 🔐 emoji)
3. **`EMAIL_PREVIEW.html`** - Email preview template for testing (line 32: 🏥 emoji)

### 🖼️ **LOGO ASSETS**
4. **`public/Austratics Logo.png`** - Current company logo (needs white version for email)
5. **`data/Austratics Logo.png`** - Backup copy of logo

### 📧 **EMAIL STYLING COMPONENTS**
- **CSS Classes**: `.logo`, `.header` - Circular logo styling with gradient background
- **Inline Styles**: Email-safe CSS for cross-client compatibility
- **Responsive Design**: Logo sizing for desktop and mobile email clients

### 🔧 **IMPLEMENTATION STRATEGY**
1. **Logo Preparation**: Create white version with transparent background
2. **Template Updates**: Replace emojis with `<img>` tags pointing to logo
3. **Fallback Implementation**: Keep emoji as alt text for accessibility
4. **Testing**: Use `EMAIL_PREVIEW.html` for visual verification

---

## 🚨 UPDATED PRIORITY: PASSWORD RESET TOKEN VALIDATION FAILURE

### CRITICAL FILES FOR PASSWORD RESET TOKEN VALIDATION FIX

#### 🔑 **CORE TOKEN VALIDATION FILES (IMMEDIATE PRIORITY)**
1. **`src/lib/auth-tokens.ts`** - Main token validation logic, `validateResetToken()` function
2. **`src/lib/redis.ts`** - Redis `TokenManager` class for production token storage
3. **`src/app/api/auth/reset-password/route.ts`** - API endpoint that calls token validation
4. **`src/app/auth/reset-password/page.tsx`** - Server component that extracts token from URL

#### 🔧 **ENVIRONMENT CONFIGURATION FILES**
5. **`.env` file** - Environment variables including `REDIS_URL`
6. **`vercel.json`** - Vercel deployment configuration
7. **`next.config.ts`** - Next.js configuration for environment detection

#### 📧 **TOKEN CREATION FILES (FOR COMPARISON)**
8. **`src/app/api/auth/forgot-password/route.ts`** - Token creation endpoint
9. **`src/lib/email.ts`** - Email service that sends reset links

#### 🛠️ **DEBUGGING UTILITIES**
10. **`scripts/debug-password-reset-tokens.js`** - Debug script for token investigation
11. **`diagnose.js`** - General system diagnostics

### 🚨 **SPECIFIC INVESTIGATION POINTS**
1. **Redis Connection**: Check if `REDIS_URL` is set and Redis is accessible in production
2. **Environment Detection**: Verify `process.env.NODE_ENV === 'production'` or similar logic
3. **Token Storage Path**: Confirm production uses Redis, not file storage
4. **Token Expiration**: Verify 1-hour expiration logic in Redis storage
5. **Error Handling**: Check if Redis connection failures are properly handled

**FAILING TOKEN TO TEST**: `8351457e8e415293163a5fff157b9e41c36be806ba083a21c096ba1d6cbdf891`

**EXPECTED BEHAVIOR**: 
- Production should store tokens in Redis with 1-hour expiration
- `validateResetToken()` should find token in Redis and return `{ valid: true, email, userId }`
- If Redis fails, should gracefully fallback or show meaningful error
