# Project Scratchpad

## Background and Motivation

**EXPERT-CONFIRMED ISSUE: Token Storage System Mismatch (400 API Error)**

**Expert Analysis Summary:**
After deploying Redis fixes, the 400 API error is confirmed to be a storage system mismatch:

1. **400 Error Source**: `/api/auth/reset-password` returning "Invalid or expired token"
2. **Root Cause**: Old token `8351457e8e415293163a5fff157b9e41c36be806ba083a21c096ba1d6cbdf891` exists in file storage but new system only checks Redis
3. **Chrome Error**: "Could not establish connection" is unrelated browser extension noise
4. **Solution Options**: Either generate fresh token (fastest) or add temporary file→Redis fallback

**Expert-Recommended Solutions:**
- **Option A (Fastest)**: Issue fresh reset link with new Redis-based token
- **Option B (Migration)**: Add temporary fallback to read file storage, then migrate to Redis
- **Diagnostics**: Add `REDIS_PING` and token lookup logging to confirm Redis connectivity

---

**NEW PRIORITY TASK: Change Password Reset Token Expiration from 1 Hour to 1 Day**

The user wants to extend the password reset token expiration time from 1 hour to 1 day (24 hours) for better user experience. This requires updating both the backend token expiration logic and the email template text.

**Current Email Header Analysis:**
Looking at the screenshot and current email templates, I can see the header structure contains:
1. **Logo in circular container** - The Austratics company logo we recently added
2. **"Austratics" heading** - Company name in large text
3. **"Secure Password Reset Request" subtitle** - Descriptive text

**Possible Elements to Remove:**
Based on the screenshot and user request, the element to remove could be:
- **Option A**: The circular logo container (most likely based on visual prominence)
- **Option B**: The "Secure Password Reset Request" subtitle text
- **Option C**: The entire header styling/background

**Context:** This request comes after we successfully implemented the company logo replacement task, so the user may want to simplify the email header design.

**Business Impact:**
- User wants to simplify the email header design
- May improve email loading speed by removing visual elements
- Could enhance email client compatibility
- Maintains professional appearance while reducing complexity

**Technical Requirements:**
Based on the screenshot, I need to identify and remove the specific element the user is referring to. The most prominent visual element in the header is the circular logo container that we recently added.

**Current Email Templates to Update:**
1. **Regular User Template**: `src/lib/email.ts` 
2. **Admin User Template**: `src/lib/emailService.ts`
3. **Email Preview Template**: `EMAIL_PREVIEW.html`

## Key Challenges and Analysis

**PRIMARY CHALLENGE: Identifying the Specific Element to Remove**

Based on the screenshot and user request "pls remove this from the Password Reset Request email", I need to determine which element should be removed:

### 1. **Visual Analysis of Screenshot**
Looking at the provided screenshot, the email header contains:
- **Circular logo container** with company logo (most prominent visual element)
- **"Austratics" heading** in white text
- **"Secure Password Reset Request" subtitle** in lighter text
- **Blue gradient background** for the header section

### 2. **Most Likely Candidate for Removal**
The **circular logo container** is the most visually prominent element that could be considered for removal because:
- It's the newest addition (just implemented in previous task)
- It's the most complex visual element in the header
- It adds visual weight that user may want to simplify
- Removing it would create a cleaner, text-only header design

### 3. **Alternative Interpretations**
- **"Secure Password Reset Request" text** - Could be seen as redundant
- **Entire logo section** - User might want completely minimal header
- **Circular background styling** - Keep logo but remove circular container

### 4. **Technical Implementation Considerations**
- **CSS Updates**: Need to remove logo-related CSS classes
- **HTML Structure**: Remove logo div and img elements  
- **Consistency**: Apply same change across all three email templates
- **Fallback**: No emoji fallback needed if removing logo entirely

### 5. **User Clarification Needed**
Since the request is ambiguous ("remove this"), I should present options to the user:
- **Option A**: Remove the circular logo container entirely
- **Option B**: Remove the "Secure Password Reset Request" subtitle
- **Option C**: Remove both logo and subtitle for minimal header
- **Option D**: Keep text but remove circular styling around logo

## High-level Task Breakdown

### Phase 1: User Clarification (CRITICAL - 5 min)
1. **Present Options to User** - Show different removal possibilities with visual examples
2. **Get Specific Confirmation** - Clarify which element should be removed
3. **Understand Design Intent** - Confirm the desired final appearance

### Phase 2: Email Template Updates (HIGH - 15 min)
4. **Update Regular User Template** - Remove specified element from `src/lib/email.ts`
5. **Update Admin Template** - Remove specified element from `src/lib/emailService.ts`
6. **Update Preview Template** - Remove specified element from `EMAIL_PREVIEW.html`
7. **Clean Up CSS** - Remove unused CSS classes for removed elements

### Phase 3: Testing and Deployment (MEDIUM - 10 min)
8. **Visual Testing** - Verify email preview shows desired appearance
9. **Cross-Template Consistency** - Ensure all templates have identical changes
10. **Commit and Push** - Deploy changes to GitHub main branch
11. **Documentation Update** - Update any relevant documentation

## Project Status Board

### 🔴 CRITICAL TASKS - USER CLARIFICATION (Completed)
- [x] **1.1** Present removal options to user with visual examples ✅
- [x] **1.2** Get specific confirmation on which element to remove ✅  
- [x] **1.3** Understand design intent and desired final appearance ✅

**USER CONFIRMED**: Option A - Remove Circular Logo Container entirely

### 🟡 HIGH PRIORITY TASKS - EMAIL TEMPLATE UPDATES (Completed)
- [x] **2.1** Update regular user template (`src/lib/email.ts`) - remove specified element ✅
- [x] **2.2** Update admin template (`src/lib/emailService.ts`) - remove specified element ✅
- [x] **2.3** Update preview template (`EMAIL_PREVIEW.html`) - remove specified element ✅
- [x] **2.4** Clean up unused CSS classes for removed elements ✅

### 🟢 TESTING & DEPLOYMENT TASKS (Completed)
- [x] **3.1** Visual testing - verify email preview shows desired appearance ✅
- [x] **3.2** Cross-template consistency - ensure all templates have identical changes ✅
- [x] **3.3** Commit and push changes to GitHub main branch ✅
- [x] **3.4** Update documentation for email template changes ✅

## Executor's Feedback or Assistance Requests

**✅ TASK COMPLETED SUCCESSFULLY**

**Implementation Summary:**

Successfully implemented **Option A: Remove Circular Logo Container** from all password reset email templates as requested.

**Changes Made:**

1. **Regular User Template** (`src/lib/email.ts`):
   - ✅ Removed `<div class="logo">` container and logo image
   - ✅ Removed unused `.logo` and `.logo img` CSS classes
   - ✅ Kept "Austratics" heading and "Secure Password Reset Request" subtitle

2. **Admin Template** (`src/lib/emailService.ts`):
   - ✅ Removed `<div class="logo">` container and logo image  
   - ✅ Removed unused `.logo` and `.logo img` CSS classes
   - ✅ Kept "Admin Password Reset" heading and subtitle

3. **Preview Template** (`EMAIL_PREVIEW.html`):
   - ✅ Removed `<div class="logo">` container and logo image
   - ✅ Removed unused `.logo` and `.logo img` CSS classes
   - ✅ Kept "Aged Care Analytics" heading and subtitle

**Result:**
- Clean, text-only email headers with blue gradient background
- Improved email loading speed (removed image assets)
- Better cross-email client compatibility
- Simplified, professional appearance

**Git Commit:** `c06d634` - feat(email): Remove circular logo container from password reset email headers
**Deployed to:** GitHub main branch successfully

**READY FOR PRODUCTION:** All password reset emails now display simplified headers without logo containers as requested.

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

## 🚨 EXPERT-CONFIRMED 400 API ERROR ANALYSIS

### **EXPERT-RECOMMENDED SOLUTION PATHS**

#### **Option A: Quick Fix (Fastest - 5 min)**
1. **Issue Fresh Reset Link**: Generate new token via `/api/auth/forgot-password`
2. **Use New Token**: Test with Redis-based token instead of old file-based one
3. **Verify System**: Confirm Redis token validation works properly

#### **Option B: Migration Support (Complete - 15 min)**
1. **Add File Fallback**: Check file storage if Redis lookup fails
2. **Auto-Migration**: Copy found tokens to Redis with remaining TTL
3. **Enhanced Errors**: Return typed codes (`expired_or_invalid`, `already_used`)

### **EXPERT-PROVIDED DIAGNOSTIC CODE**
```ts
// Add to /api/auth/reset-password
console.info('RESET_PASSWORD_START', { tokenLen: token?.length, tokenPreview: token?.slice(0,8) });
const ping = await redis.ping().catch(e => `ERR:${e.message}`);
console.info('REDIS_PING', ping);
```

### **CLIENT ERROR MAPPING**
```ts
const message = 
  data.code === 'expired_or_invalid'
    ? 'This reset link is invalid or has expired. Please request a new one.'
    : data.code === 'already_used'  
    ? 'This reset link was already used. Please request a new one.'
    : 'Something went wrong. Please try again.';
```

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
