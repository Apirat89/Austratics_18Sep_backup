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

### Phase 1: Apply Expert Patches (CRITICAL - 10 min)
1. **Update `lib/redis.ts`** - Apply expert patch supporting both KV and Upstash env vars
2. **Update `lib/auth-tokens.ts`** - Apply expert patch removing dynamic require, adding atomic operations
3. **Update `app/api/auth/reset-password/route.ts`** - Apply expert patch with Node.js runtime and diagnostics
4. **Update `app/api/auth/forgot-password/route.ts`** - Ensure atomic TTL token creation

### Phase 2: Deploy and Validate (HIGH - 5 min)
5. **Deploy to Vercel** - Push changes and trigger deployment
6. **Check Function Logs** - Verify `RESET_TOKEN_STORE` and `REDIS_PING` logs show success
7. **Test Token Creation** - Generate new reset token and verify Redis storage
8. **Optional: cURL Verification** - Direct Redis REST API check for token existence

### Phase 3: End-to-End Testing (HIGH - 5 min)
9. **Test Fresh Reset Flow** - Complete password reset with new token
10. **Test Failing Token** - Verify `8351457e8e415293163a5fff157b9e41c36be806ba083a21c096ba1d6cbdf891` now works or gives proper error
11. **Verify Error Codes** - Check `expired_or_invalid`, `already_used`, `invalid_format` responses
12. **Optional UX Improvement** - Handle missing token in page URL gracefully

## Project Status Board

### ✅ CRITICAL TASKS - EXPERT PATCHES APPLIED (Completed)
- [x] **1.1** Update `lib/redis.ts` with expert patch (support both KV and Upstash env vars) ✅
- [x] **1.2** Update `lib/auth-tokens.ts` with expert patch (remove dynamic require, atomic operations) ✅
- [x] **1.3** Update `app/api/auth/reset-password/route.ts` with expert patch (Node.js runtime, diagnostics) ✅
- [x] **1.4** Update `app/api/auth/forgot-password/route.ts` (ensure atomic TTL token creation) ✅

### 🟡 HIGH PRIORITY TASKS - DEPLOY AND VALIDATE (Pending)
- [ ] **2.1** Deploy changes to Vercel and trigger new deployment
- [ ] **2.2** Check Vercel Function logs for `RESET_TOKEN_STORE` and `REDIS_PING` success
- [ ] **2.3** Test token creation flow and verify Redis storage working
- [ ] **2.4** Optional: Use cURL to directly verify token exists in Redis via REST API

### 🟢 IMPLEMENTATION TASKS - END-TO-END TESTING (Pending)
- [ ] **3.1** Test complete password reset flow with fresh token
- [ ] **3.2** Test failing token: `8351457e8e415293163a5fff157b9e41c36be806ba083a21c096ba1d6cbdf891`
- [ ] **3.3** Verify error codes: `expired_or_invalid`, `already_used`, `invalid_format`
- [ ] **3.4** Optional: Implement UX improvement for missing token in page URL

## Executor's Feedback or Assistance Requests

**CRITICAL ISSUE IDENTIFIED - READY FOR IMMEDIATE EXECUTION**

Based on the user's specific information, I now have a clear diagnosis path:

**CONFIRMED DETAILS:**
- **Token**: `8351457e8e415293163a5fff157b9e41c36be806ba083a21c096ba1d6cbdf891`
- **URL**: https://www.austratics.com/auth/reset-password?token=... (correct regular user URL)
- **Environment**: Production (should use Redis storage)
- **Error**: "Invalid Reset Link - This password reset link is invalid or has expired"

**EXPERT-CONFIRMED ROOT CAUSE ANALYSIS:**

Based on expert advice, the issue is **definitively a server-side token validation problem** with these ranked causes:

1. **🚨 Code Falling Back to File Storage Instead of Redis** (CONFIRMED ROOT CAUSE)
   - Redis configured in Vercel but code not detecting/using it
   - Environment variable name mismatch (`KV_REST_API_URL` vs `UPSTASH_REDIS_REST_URL`)
   - Dynamic require/import failing, falling back to file storage silently

2. **🔧 Validator using wrong storage system** 
   - Environment detection incorrectly using file/disk storage in prod (stateless on Vercel)
   - Production should use Redis but falling back to file storage

3. **🔑 Token never persisted / wrong key format**
   - Key mismatch: stored as `reset:${userId}:${token}`, read as `passwordReset:${token}`
   - Token stored in wrong namespace/DB index

4. **📝 Encoding/parsing issue**
   - Double-encoded token or whitespace issues
   - Client sending `token=undefined`

**EXPERT-PROVIDED SURGICAL DIAGNOSIS PLAN:**
1. **Add startup logging** - Log Redis env detection in `lib/auth-tokens.ts`
2. **Test Redis connectivity** - Add `redis.ping()` health check in API route
3. **Check token existence** - Direct Redis lookup with `redis.get(key)` and `redis.ttl(key)`
4. **Verify key naming consistency** - Ensure create/validate/markUsed use same key format

**EXPERT-PROVIDED EXACT PATCHES (COPY-PASTE READY):**
- **A) `lib/redis.ts`** - Support both Vercel KV and Upstash env vars with error throwing
- **B) `lib/auth-tokens.ts`** - Remove dynamic require, hard-fail in prod, atomic operations
- **C) `app/api/auth/reset-password/route.ts`** - Force Node.js runtime, add diagnostics
- **D) `app/api/auth/forgot-password/route.ts`** - Ensure atomic TTL on token creation
- **E) Validation steps** - Deploy and check Vercel Function logs for Redis connectivity
- **F) Optional UX improvement** - Handle missing token in page URL gracefully

**READY FOR EXECUTOR MODE:** Expert-confirmed Redis fallback issue with surgical fix approach and copy-paste code provided.

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

**EXPECTED BEHAVIOR AFTER FIX**: 
- Code should detect Redis env vars (`KV_REST_API_*` format) and log `useRedis: true`
- Production should store tokens in Redis with atomic `EX: 3600` TTL
- `validateResetToken()` should find token in Redis using consistent `reset_token:${token}` key
- No silent fallback to file storage in production environment

**EXPERT-PROVIDED EXACT PATCHES (COPY-PASTE READY):**

### **1) `lib/redis.ts` - Accept both Vercel KV and Upstash envs**
```ts
// lib/redis.ts
import { Redis } from '@upstash/redis';

const url =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  throw new Error(
    'Redis env vars missing. Expected KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN.'
  );
}

export const redis = new Redis({ url, token });
```

### **2) `lib/auth-tokens.ts` - Remove dynamic require + hard-fail in prod**
```ts
// lib/auth-tokens.ts
import { redis } from './redis';
const IS_PROD = process.env.NODE_ENV === 'production';

// helpful boot log (remove after verifying)
console.log('RESET_TOKEN_STORE', {
  node: process.version,
  nodeEnv: process.env.NODE_ENV,
  kvUrlPresent: !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL),
  kvTokenPresent: !!(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN),
});

function keyFor(token: string) {
  return `reset_token:${token}`;
}

export async function createResetToken(userId: string) {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''); // 64 hex
  const key = keyFor(token);
  const data = { userId, createdAt: Date.now() };

  // atomic set + 1h TTL
  await redis.set(key, JSON.stringify(data), { ex: 3600, nx: true });
  return token;
}

export async function validateResetToken(tokenRaw: string) {
  const token = (tokenRaw ?? '').trim();
  if (!/^[a-fA-F0-9]{64}$/.test(token)) return { ok: false, code: 'invalid_format' };

  const key = keyFor(token);
  const json = await redis.get<string>(key);
  if (!json) return { ok: false, code: 'expired_or_invalid' };

  const record = JSON.parse(json) as { userId: string; createdAt: number; used?: boolean };

  if (record.used) return { ok: false, code: 'already_used' };
  return { ok: true, userId: record.userId, key }; // return key so route can mark used
}

export async function markResetTokenUsed(key: string) {
  const json = await redis.get<string>(key);
  if (!json) return;
  const record = JSON.parse(json);
  record.used = true;
  // keep a short TTL after use (optional)
  await redis.set(key, JSON.stringify(record), { ex: 600 });
}
```

### **3) `app/api/auth/reset-password/route.ts` - Force Node, add diagnostics**
```ts
// app/api/auth/reset-password/route.ts
export const runtime = 'nodejs';

import { redis } from '@/lib/redis';
import { validateResetToken, markResetTokenUsed } from '@/lib/auth-tokens';

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    // temporary diagnostics (remove when green)
    const pong = await redis.ping().catch((e) => `ERR:${e.message}`);
    console.info('REDIS_PING', pong, 'TOKEN_LEN', token?.length);

    const res = await validateResetToken(token);
    if (!res.ok) {
      return Response.json({ ok: false, code: res.code }, { status: 400 });
    }

    // ... update user password with res.userId + newPassword ...

    await markResetTokenUsed(res.key);
    return Response.json({ ok: true });
  } catch (e: any) {
    console.error('RESET_PASSWORD_ERROR', e);
    return Response.json({ ok: false, code: 'server_error' }, { status: 500 });
  }
}
```

### **4) Validation Steps**
1. Deploy and check **Functions → Logs** in Vercel for `RESET_TOKEN_STORE` and `REDIS_PING: PONG`
2. Optional cURL check: `curl -s "$KV_REST_API_URL/GET/reset_token:TOKEN_HERE" -H "Authorization: Bearer $KV_REST_API_TOKEN"`
3. Test reset flow - expect `expired_or_invalid`, `already_used`, or success responses
