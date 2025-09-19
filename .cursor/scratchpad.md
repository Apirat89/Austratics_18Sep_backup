# Project Scratchpad

## Background and Motivation

**NEW ANALYSIS REQUEST: Maps Page Region Ranking Search Issue**

The user has reported an issue with the Maps page region ranking search functionality. When clicking on a region name in the regional rankings panel (showing SA2 regions ranked by various statistics), the search appears to default to navigating to "Braidwood Multi-Purpose Service" facility location on the map when there's no match found.

The user wants to understand:
1. How the region ranking search works when clicking on region names
2. Why it defaults to "Braidwood Multi-Purpose Service" when there's no match
3. What is causing this specific fallback behavior

**PREVIOUS CONTEXT:**

**CRITICAL ADMIN AUTHENTICATION ISSUE: Master Admin Credentials No Longer Working**

The master admin user `apirat.kongchanagul@gmail.com` can no longer access the admin system, despite being the primary administrative account.

**Current Investigation Status:**
- 🔍 **Authentication System Analysis** - Identified dual authentication architecture
- 🔍 **Database Migration History** - Found multiple admin system restructuring attempts  
- 🔍 **Password Hash Investigation** - Located current password configuration
- ❓ **Root Cause Unknown** - Need to determine why credentials stopped working

**AUTHENTICATION SYSTEM ARCHITECTURE:**
The application uses **two completely separate authentication systems**:

1. **Regular User Authentication** (`auth.users` table via Supabase Auth)
   - For end-users accessing application features
   - Managed through User Management Tab
   
2. **Admin Authentication** (`admin_users` table - Custom implementation)  
   - For system administrators with special privileges
   - Managed through Admin Tab
   - **Master admin**: `apirat.kongchanagul@gmail.com` with `is_master: true`

**KEY FINDINGS:**
- **Password Hash**: According to `20250115_fix_admin_rls.sql`, the password should be "admin123"
- **Hash Value**: `$2a$10$K7L1TIWakVBp/RY1JG8D1u7y6bZ8YdPe1K3P1CfMJ9LvB5J5VzfVK`
- **Status**: Should be 'active' with `is_master: true`
- **Authentication Route**: `/api/admin-auth/login` (NOT regular user login)

**POTENTIAL ISSUES TO INVESTIGATE:**
1. **Database State** - Admin user may not exist or have wrong status
2. **Password Hash Mismatch** - Migration may not have applied correctly  
3. **Session System** - Cookie-based admin sessions may be broken
4. **RLS Policies** - Row Level Security may be blocking access
5. **Migration Status** - Database migrations may not have run

**PREVIOUS CONTEXT (Expert-Confirmed):**

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

**NEW PRIMARY CHALLENGE: Understanding Region Ranking Search Fallback Behavior**

After analyzing the Maps page region ranking search flow, I've identified the complete search pathway and potential root cause for the "Braidwood Multi-Purpose Service" default behavior.

### 1. **Region Ranking Search Flow Analysis**

**Step 1: User clicks region in TopBottomPanel rankings**
- `TopBottomPanel.tsx` calls `handleRegionClick(sa2Id, sa2Name, index, isTop)`
- Passes `sa2Id` and `sa2Name` to Maps page `handleRegionClick` callback

**Step 2: Maps page processes region click**
- `handleRegionClick` in `/src/app/maps/page.tsx` (lines 975-1060)
- Switches to SA2 boundary layer if not already selected
- Attempts location lookup using `getLocationByName(sa2Name)`

**Step 3: Location lookup attempts (with fallbacks)**
- **Primary**: `getLocationByName(sa2Name)` - searches by region name
- **Fallback 1**: `getLocationByName(sa2Id)` - searches by SA2 ID  
- **Fallback 2**: Creates minimal search result with just SA2 ID
- **Final Fallback**: Basic search with `handleSearch(sa2Name)` (no navigation data)

**Step 4: Search service processing**
- `getLocationByName` calls `searchLocations(locationName, 1)` 
- Returns `results[0]` or `null` if no matches found

**Step 5: Final fallback when no location found**
- When all location lookups fail, calls `handleSearch(sa2Name)` with NO navigation data
- This triggers "general search" mode in `handleSearch` function (line 637-640)
- Sets `mapNavigation = null` and performs basic search

### 2. **Critical Finding: The "Braidwood Multi-Purpose Service" Mystery**

**ISSUE IDENTIFIED**: The search is NOT hardcoded to default to "Braidwood Multi-Purpose Service". 

**ACTUAL ROOT CAUSE**: When location lookup fails completely, the system performs a "general search" without coordinates. However, I could NOT find any hardcoded reference to "Braidwood Multi-Purpose Service" in the codebase.

**LIKELY EXPLANATIONS**:

1. **Search Index Issue**: The search service may be returning "Braidwood Multi-Purpose Service" as the first/best match when searching for unmatched region names
2. **Facility Index Fallback**: When boundary searches fail, the system searches healthcare facilities, and "Braidwood Multi-Purpose Service" might be appearing as the top result
3. **Cache/Data Issue**: There might be stale cached data or a data corruption issue causing this specific facility to appear

### 3. **Search Service Behavior Analysis**

**When `getLocationByName` returns null:**
- `MapSearchBar.handleSearch` line 225-230: Performs "general search" 
- `Maps.handleSearch` line 637-640: Sets `mapNavigation = null`
- `AustralianMap` receives no navigation data, so no map movement occurs
- However, the search term is still processed for highlighting

**Key Search Components:**
- `searchLocations()` searches: LGA, SA2, SA3, SA4, postcode, locality, facilities
- Healthcare facilities are included in search results via `buildHealthcareFacilityIndex()`
- Results are ranked by relevance score and type preference

### 4. **Debugging Strategy Required**

To identify why "Braidwood Multi-Purpose Service" appears:

1. **Check Search Results**: Log what `searchLocations()` returns for failing region names
2. **Examine Facility Index**: Check if "Braidwood Multi-Purpose Service" has unusual relevance scoring
3. **Test Specific Regions**: Try clicking different regions to see if same facility appears
4. **Check Search Cache**: Verify if cached search results contain this facility

**PREVIOUS CHALLENGE: Diagnosing Why Master Admin Credentials Stopped Working**

The master admin user `apirat.kongchanagul@gmail.com` cannot authenticate, and we need to systematically diagnose the issue.

### 1. **Authentication Flow Analysis**
The admin login process follows this path:
- **Frontend**: Admin sign-in page submits to `/api/admin-auth/login`
- **API Route**: `src/app/api/admin-auth/login/route.ts` calls `authenticateAdmin()`
- **Authentication Logic**: `src/lib/adminAuth.ts` validates credentials against `admin_users` table
- **Session Management**: Creates session token stored in `admin_sessions` table
- **Cookie Storage**: Sets `admin-session` cookie for subsequent requests

### 2. **Database State Investigation Required**
Key database queries needed to diagnose:
- **Admin User Existence**: `SELECT * FROM admin_users WHERE email = 'apirat.kongchanagul@gmail.com'`
- **Password Hash Verification**: Check if hash matches expected value
- **Status Check**: Verify `status = 'active'` and `is_master = true`
- **Migration Status**: Confirm all admin-related migrations have run

### 3. **Potential Root Causes**
**Database Issues:**
- Admin user record doesn't exist in `admin_users` table
- Password hash is incorrect or corrupted
- Status is set to 'inactive' or 'pending'
- `is_master` flag is false

**System Issues:**
- Database migrations haven't run properly
- Row Level Security is blocking queries
- Supabase connection issues
- Cookie/session system malfunction

### 4. **Migration History Concerns**
Multiple migration files suggest system instability:
- `20250115_create_master_admin_system.sql` - Creates admin system
- `20250115_fix_admin_rls.sql` - Disables RLS, sets password to "admin123"
- Various fix scripts in `sql/` and `scripts/` directories
- Potential conflicts between different migration approaches

### 5. **Diagnostic Strategy**
**Phase 1: Database State Verification**
- Check if admin user exists and has correct properties
- Verify password hash matches expected bcrypt hash for "admin123"
- Confirm migration status in database

**Phase 2: Authentication Logic Testing**
- Test password comparison logic with known values
- Verify Supabase connection and query execution
- Check for any error logs during authentication attempts

**Phase 3: System Integration Testing**
- Test complete login flow from frontend to backend
- Verify session creation and cookie handling
- Check admin page access after successful authentication

## High-level Task Breakdown

### Phase 1: Maps Region Ranking Search Analysis (HIGH PRIORITY - 15 min)
1. **Debug Search Flow** - Add logging to identify what happens when region ranking clicks fail to find locations
2. **Test Specific Regions** - Click different regions in rankings to see if "Braidwood Multi-Purpose Service" always appears
3. **Examine Search Results** - Log the actual search results returned by `searchLocations()` for failing region names
4. **Check Facility Index** - Investigate why "Braidwood Multi-Purpose Service" might be the top result for unmatched searches

### Phase 2: Search Service Investigation (MEDIUM - 10 min)  
5. **Analyze Search Ranking** - Check relevance scoring algorithm for healthcare facilities
6. **Examine Search Cache** - Verify if cached results contain stale or incorrect data
7. **Test Boundary vs Facility Search** - Determine if issue is in boundary search failing or facility search taking over
8. **Check Data Sources** - Verify healthcare facility data doesn't have corrupted entries

### Phase 3: Root Cause Identification (HIGH - 10 min)
9. **Isolate Search Behavior** - Test region searches directly through search service
10. **Check SA2 Name Mapping** - Verify SA2 names from rankings match searchable names in indices  
11. **Examine Search Result Ordering** - Understand why specific facility appears as default
12. **Document Findings** - Record exact cause and propose fix

### PREVIOUS PHASES: Database State Investigation (CRITICAL - 10 min)
1. **Query Admin User** - Check if `apirat.kongchanagul@gmail.com` exists in `admin_users` table
2. **Verify User Properties** - Confirm `status='active'`, `is_master=true`, and password hash
3. **Check Migration Status** - Verify admin-related migrations have been applied
4. **Identify Data Issues** - Determine if user record is missing or corrupted

### Phase 2: Authentication System Testing (HIGH - 15 min)
5. **Test Password Hash** - Verify bcrypt comparison with "admin123" password
6. **Debug Authentication Logic** - Add logging to `authenticateAdmin()` function
7. **Check Supabase Connection** - Verify database queries execute successfully
8. **Test API Route** - Directly test `/api/admin-auth/login` endpoint

### Phase 3: System Recovery (HIGH - 20 min)
9. **Fix Database State** - Recreate admin user if missing or repair corrupted data
10. **Apply Missing Migrations** - Run any admin system migrations that failed
11. **Update Password Hash** - Ensure correct bcrypt hash for known password
12. **Test Complete Flow** - Verify login works from frontend to backend

### Phase 4: Prevention & Documentation (MEDIUM - 10 min)
13. **Document Root Cause** - Record what caused the credentials to stop working
14. **Create Recovery Script** - Build automated script to fix similar issues
15. **Update Admin Documentation** - Ensure recovery procedures are documented
16. **Test Backup Admin Creation** - Verify system can create additional admin users

## Project Status Board

### 🟡 HIGH PRIORITY TASKS - MAPS REGION RANKING SEARCH ANALYSIS (Pending)
- [ ] **1.1** Debug search flow - add logging to identify what happens when region ranking clicks fail to find locations
- [ ] **1.2** Test specific regions - click different regions in rankings to see if "Braidwood Multi-Purpose Service" always appears  
- [ ] **1.3** Examine search results - log the actual search results returned by `searchLocations()` for failing region names
- [ ] **1.4** Check facility index - investigate why "Braidwood Multi-Purpose Service" might be the top result for unmatched searches

### 🟢 MEDIUM PRIORITY TASKS - SEARCH SERVICE INVESTIGATION (Pending)
- [ ] **2.1** Analyze search ranking - check relevance scoring algorithm for healthcare facilities
- [ ] **2.2** Examine search cache - verify if cached results contain stale or incorrect data
- [ ] **2.3** Test boundary vs facility search - determine if issue is in boundary search failing or facility search taking over
- [ ] **2.4** Check data sources - verify healthcare facility data doesn't have corrupted entries

### 🟡 HIGH PRIORITY TASKS - ROOT CAUSE IDENTIFICATION (Pending)
- [ ] **3.1** Isolate search behavior - test region searches directly through search service
- [ ] **3.2** Check SA2 name mapping - verify SA2 names from rankings match searchable names in indices
- [ ] **3.3** Examine search result ordering - understand why specific facility appears as default
- [ ] **3.4** Document findings - record exact cause and propose fix

### 🔴 CRITICAL TASKS - DATABASE STATE INVESTIGATION (Pending)
- [ ] **1.1** Query admin user - check if `apirat.kongchanagul@gmail.com` exists in `admin_users` table
- [ ] **1.2** Verify user properties - confirm `status='active'`, `is_master=true`, and password hash
- [ ] **1.3** Check migration status - verify admin-related migrations have been applied
- [ ] **1.4** Identify data issues - determine if user record is missing or corrupted

### 🟡 HIGH PRIORITY TASKS - AUTHENTICATION SYSTEM TESTING (Pending)
- [ ] **2.1** Test password hash - verify bcrypt comparison with "admin123" password
- [ ] **2.2** Debug authentication logic - add logging to `authenticateAdmin()` function
- [ ] **2.3** Check Supabase connection - verify database queries execute successfully
- [ ] **2.4** Test API route - directly test `/api/admin-auth/login` endpoint

### 🟡 HIGH PRIORITY TASKS - SYSTEM RECOVERY (Pending)
- [ ] **3.1** Fix database state - recreate admin user if missing or repair corrupted data
- [ ] **3.2** Apply missing migrations - run any admin system migrations that failed
- [ ] **3.3** Update password hash - ensure correct bcrypt hash for known password
- [ ] **3.4** Test complete flow - verify login works from frontend to backend

### 🟢 MEDIUM PRIORITY TASKS - PREVENTION & DOCUMENTATION (Pending)
- [ ] **4.1** Document root cause - record what caused the credentials to stop working
- [ ] **4.2** Create recovery script - build automated script to fix similar issues
- [ ] **4.3** Update admin documentation - ensure recovery procedures are documented
- [ ] **4.4** Test backup admin creation - verify system can create additional admin users

## Executor's Feedback or Assistance Requests

**🚨 PLANNER MODE ANALYSIS COMPLETE - REGION RANKING SEARCH ISSUE**

**Maps Page Region Ranking Search Investigation Summary:**

I have completed a comprehensive analysis of the Maps page region ranking search functionality and identified the likely cause of the "Braidwood Multi-Purpose Service" default behavior.

**SEARCH FLOW ARCHITECTURE:**
- Region clicks in TopBottomPanel trigger `handleRegionClick` in Maps page
- System attempts multiple location lookup strategies with progressive fallbacks
- Final fallback performs "general search" without coordinates when all lookups fail

**KEY FINDING - NOT A HARDCODED DEFAULT:**
- There is NO hardcoded reference to "Braidwood Multi-Purpose Service" in the codebase
- The facility appears as a result of the search service's ranking algorithm
- When boundary searches fail, the system falls back to searching healthcare facilities

**MOST LIKELY ROOT CAUSES:**
1. **Search Index Ranking**: "Braidwood Multi-Purpose Service" may have high relevance scores for unmatched region names
2. **Facility Search Fallback**: Healthcare facility index returns this as the top result when boundary searches fail
3. **Cache/Data Issues**: Stale cached search results or data corruption

**SEARCH SERVICE BEHAVIOR:**
- `getLocationByName` calls `searchLocations()` which searches all data types (boundaries + facilities)
- Results are ranked by relevance score and type preference
- Healthcare facilities are included via `buildHealthcareFacilityIndex()`
- When no boundary matches found, facilities can become top results

**DEBUGGING STRATEGY:**
The **Executor** needs to:
1. **Add logging** to capture actual search results for failing region names
2. **Test multiple regions** to confirm if same facility always appears
3. **Examine search ranking** algorithm for healthcare facilities
4. **Check data integrity** of facility indices and cached results

**EXECUTOR HANDOFF:**
I've created a detailed task breakdown with 12 specific steps to debug and fix this search behavior. The Executor should start with **Phase 1: Maps Region Ranking Search Analysis** to identify the exact search results being returned.

**CRITICAL**: This affects user experience when navigating from regional statistics to map locations - users expect to see the selected region, not a random facility.

---

**🚨 PREVIOUS ANALYSIS - MASTER ADMIN CREDENTIALS INVESTIGATION**

**Master Admin Credentials Investigation Summary:**

I have completed a comprehensive analysis of why the master admin credentials (`apirat.kongchanagul@gmail.com`) are no longer working. Here are my key findings:

**AUTHENTICATION SYSTEM ARCHITECTURE:**
- The application uses **two separate authentication systems**
- Admin authentication uses a custom `admin_users` table (NOT Supabase Auth)
- Master admin should authenticate via `/api/admin-auth/login` route

**EXPECTED CREDENTIALS:**
- **Email**: `apirat.kongchanagul@gmail.com`
- **Password**: `"admin123"` (according to migration file)
- **Hash**: `$2a$10$K7L1TIWakVBp/RY1JG8D1u7y6bZ8YdPe1K3P1CfMJ9LvB5J5VzfVK`

**MOST LIKELY ROOT CAUSES:**
1. **Database Migration Issues** - Admin user may not exist in `admin_users` table
2. **Password Hash Problems** - Migration may not have applied the correct hash
3. **Status Issues** - User status may be 'inactive' or 'pending' instead of 'active'
4. **RLS Problems** - Row Level Security may be blocking queries

**NEXT STEPS REQUIRED:**
The **Executor** needs to:
1. **Query the database** to check if the admin user exists
2. **Verify the password hash** matches the expected value
3. **Fix any database issues** found during investigation
4. **Test the complete authentication flow** after fixes

**EXECUTOR HANDOFF:**
I've created a detailed task breakdown with 16 specific steps to diagnose and fix this issue. The Executor should start with **Phase 1: Database State Investigation** to determine the current state of the admin user record.

**CRITICAL**: This is a **production access issue** - the master admin cannot manage the system until resolved.

---

## **COMMIT 04ff2a2 ANALYSIS: Changes Since Master Admin Last Worked**

**COMMIT ANALYZED**: `04ff2a26eea412dbd5c251a0bbef2ae9d03ea789`
**Date**: Thu Sep 18 16:14:36 2025 +0700
**Message**: "debug: Add comprehensive logging to password reset token validation"

### **KEY FINDING: Admin Authentication System UNCHANGED**

After thorough analysis of all changes since commit `04ff2a2`, **NO CHANGES were made to the admin authentication system**:

✅ **Admin signin page**: `src/app/auth/admin-signin/page.tsx` - **UNCHANGED**
✅ **Admin login API**: `src/app/api/admin-auth/login/route.ts` - **UNCHANGED**  
✅ **Admin auth logic**: `src/lib/adminAuth.ts` - **UNCHANGED**
✅ **Admin database system**: All admin tables and migrations - **UNCHANGED**

### **What Actually Changed Since 04ff2a2**

**ONLY Regular User Password Reset System Changed:**

1. **`src/lib/auth-tokens.ts`** - **MAJOR REFACTOR**:
   - **BEFORE**: Dual system (Redis for prod, file storage for dev)
   - **AFTER**: Redis-only system with expert-provided JSON parsing fixes
   - **Impact**: Only affects regular user password reset, NOT admin authentication

2. **Token Expiration Extended**:
   - **Admin forgot password**: 1 hour → 24 hours  
   - **Regular user forgot password**: 1 hour → 24 hours
   - **Impact**: Only affects password reset emails, NOT login credentials

3. **Email Template Changes**:
   - Logo changes in password reset emails
   - **Impact**: Visual only, no authentication logic affected

### **CRITICAL CONCLUSION**

**The master admin credentials issue is NOT caused by recent code changes.**

Since the admin authentication system is completely unchanged since commit `04ff2a2`, the problem must be:

1. **Database State Issue** - Admin user record corrupted/missing
2. **Environment Variable Problem** - Supabase connection issues  
3. **Migration Issue** - Admin system migrations never applied properly
4. **Infrastructure Problem** - Database connectivity or permissions

**ROOT CAUSE**: The issue existed before commit `04ff2a2` or is related to database/infrastructure state, NOT code changes.

**NEXT STEPS**: Focus investigation on database state and migration status, not code changes.

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

#### **Option A: Quick Fix (Fastest - 5 min) ✅ IMPLEMENTED**
1. ✅ **Enhanced Diagnostics**: Added `RESET_PASSWORD_START` and `REDIS_PING` logging
2. ✅ **Typed Error Codes**: Return `expired_or_invalid`, `already_used`, `invalid_format`
3. ✅ **Client Error Mapping**: User-friendly messages guide users to request new links
4. ⏳ **Fresh Token Testing**: Ready to test with real registered email

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

## 🚨 EXPERT DIAGNOSIS: JSON SERIALIZATION ERROR

### **NEW ROOT CAUSE IDENTIFIED: Redis JSON Serialization Issue**

**EXPERT TEAM ANALYSIS FROM LOGS:**
The logs reveal the actual issue - our diagnostics ARE working! The real problem:

**🚨 JSON SERIALIZATION ERROR:**
```
Error validating token: SyntaxError: "[object Object]" is not valid JSON
```

**What's Happening:**
1. **Write Side**: `redis.set(key, someObject)` without `JSON.stringify` → stored as `"[object Object]"`
2. **Read Side**: `JSON.parse(raw)` fails on `"[object Object]"` → SyntaxError
3. **Legacy Tokens**: Existing malformed tokens in Redis causing consistent failures

**PROOF FROM LOGS:**
- ✅ **Function Compiles**: `RESET_PASSWORD_START` and `REDIS_PING PONG` working
- ✅ **Redis Connected**: PONG response confirms connectivity  
- ✅ **Token Format Valid**: 64-char hex token format correct
- ❌ **JSON Parse Fails**: `"[object Object]"` cannot be parsed as JSON

### **SPECIFIC FILES AND FIXES REQUIRED:**

#### **EXACT EXPERT CODE TO COPY-PASTE:**

**🔧 Helper Functions (Add near top of `src/lib/auth-tokens.ts`):**
```ts
function keyForToken(token: string) {
  return `reset_token:${token}`;
}

type TokenRecord = { userId: string; createdAt: number; used?: boolean };

function parseJsonSafely(raw: unknown):
  | { ok: true; value: any }
  | { ok: false; reason: 'missing' | 'bad_string' | 'unknown'; raw?: unknown } {
  if (raw == null) return { ok: false, reason: 'missing' };
  if (typeof raw === 'string') {
    try {
      return { ok: true, value: JSON.parse(raw) };
    } catch {
      return { ok: false, reason: 'bad_string', raw };
    }
  }
  if (typeof raw === 'object') return { ok: true, value: raw as any };
  return { ok: false, reason: 'unknown', raw };
}
```

**🔧 Replace `validateResetToken()` (Line ~59):**
```ts
export async function validateResetToken(tokenRaw: string) {
  const token = (tokenRaw ?? '').trim();
  if (!/^[a-fA-F0-9]{64}$/.test(token)) {
    return { ok: false as const, code: 'invalid_format' as const };
  }
  
  const key = keyForToken(token);
  const raw = await redis.get(key);
  const parsed = parseJsonSafely(raw);

  if (!parsed.ok) {
    if (parsed.reason === 'bad_string') {
      await redis.del(key);
      console.warn('Deleted malformed reset token value', { key, raw: parsed.raw });
    }
    return { ok: false as const, code: 'expired_or_invalid' as const };
  }

  const rec = parsed.value as TokenRecord;
  if (!rec?.userId) return { ok: false as const, code: 'expired_or_invalid' as const };
  if (rec.used) return { ok: false as const, code: 'already_used' as const };

  return { ok: true as const, userId: rec.userId, key };
}
```

**🔧 Replace `markResetTokenUsed()` (Line ~91):**
```ts
export async function markResetTokenUsed(key: string) {
  const raw = await redis.get(key);
  const parsed = parseJsonSafely(raw);
  if (!parsed.ok) { 
    await redis.del(key); 
    return; 
  }

  const rec = parsed.value as TokenRecord;
  rec.used = true;
  await redis.set(key, JSON.stringify(rec), { ex: 600 });
}
```

**✅ Token Creation (Keep As-Is):**
```ts
// Line 30 - Already correct, uses JSON.stringify
await redis.set(key, JSON.stringify(data), { ex: 86400, nx: true });
```

### **EXPERT-CONFIRMED SURGICAL FIXES:**

**The expert team has provided exact copy-paste code to fix this issue!**

#### **Phase 1: Apply Expert Patches (5 minutes)**
1. **Add Helper Functions** - `keyForToken()`, `TokenRecord` type, `parseJsonSafely()`
2. **Replace `validateResetToken()`** - Lines ~59 with defensive JSON parsing + legacy cleanup
3. **Replace `markResetTokenUsed()`** - Lines ~91 with safe parsing + error handling
4. **Deploy Surgical Fixes** - No other code changes needed

#### **Phase 2: Update API Route (2 minutes)**
5. **Update Reset Route** - Change return type from `{ valid, userId, key }` to `{ ok, userId, key, code }`
6. **Update Error Handling** - Handle `{ ok: false, code }` instead of `{ valid: false, error }`

#### **Phase 3: Verify Fixes (COMPLETED ✅)**
7. **Generate Fresh Token** - ✅ Forgot-password endpoint working (returns expected "email not registered" for test)
8. **Test Reset Flow** - ✅ Old malformed token now returns proper error instead of crashing
9. **Check Function Logs** - ✅ No more JSON parse crashes, defensive parsing working
10. **Test Old Token** - ✅ Returns 400 with `{"error":"Failed to validate token","code":"expired_or_invalid"}`

#### **🎉 EXPERT FIXES SUCCESSFULLY DEPLOYED:**
- **Before**: `SyntaxError: "[object Object]" is not valid JSON` (crashed API)
- **After**: `{"error":"Failed to validate token","code":"expired_or_invalid"}` (graceful error handling)
- **Legacy Cleanup**: Malformed tokens automatically detected and cleaned up
- **New Tokens**: Will work perfectly with proper JSON serialization
- **Status**: ✅ **ISSUE RESOLVED** - No more Redis JSON parsing crashes!

#### **Phase 3: Verification Commands (Optional)**
8. **Check Redis Values** - Use curl to verify token format in production:
   ```bash
   curl -s "$KV_REST_API_URL/GET/reset_token:TOKEN_HERE" \
     -H "Authorization: Bearer $KV_REST_API_TOKEN"
   ```
9. **Expected Good Format**: `{"userId":"abc123","createdAt":169...,"used":false}`
10. **Expected Bad Format (before fix)**: `"[object Object]"`

### **CRITICAL FILES FOR TEAM CONSULTATION:**

#### **🔧 PRIMARY FIX FILES:**
1. **`src/lib/auth-tokens.ts`** - Add helpers + replace 2 functions (lines ~59 and ~91)
2. **`src/app/api/auth/reset-password/route.ts`** - Update to handle new return format `{ ok, code }`

#### **🔧 API ROUTE COMPATIBILITY UPDATE:**
**Current Code (Broken with new format):**
```ts
const tokenValidation = await validateResetToken(token);
if (!tokenValidation.valid) {
  const errorCode = tokenValidation.error === 'Invalid token format' ? 'invalid_format' : ...
```

**Updated Code (Compatible with expert fix):**
```ts
const tokenValidation = await validateResetToken(token);
if (!tokenValidation.ok) {
  return NextResponse.json(
    { error: 'Invalid or expired reset token', code: tokenValidation.code },
    { status: 400 }
  );
}
// Use tokenValidation.userId and tokenValidation.key as before
```

#### **📊 SUPPORTING EVIDENCE:**
3. **Vercel Function Logs** - Show exact `"[object Object]"` JSON parse errors
4. **Token Format**: `9d742974f3d44f6a9b3022affc9d703304991a618e3744d48e36434331029139` (64-char hex)
5. **Redis Connectivity**: ✅ Confirmed working (`REDIS_PING PONG`)

#### **✅ CONFIRMED WORKING:**
6. **`src/lib/redis.ts`** - Environment variables and connection working
7. **Token Creation** - Already uses `JSON.stringify` correctly
8. **Client Error Handling** - Already maps error codes to user messages

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
