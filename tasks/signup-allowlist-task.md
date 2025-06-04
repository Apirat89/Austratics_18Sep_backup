# Task: Implement Email Allowlist Validation for Signup Backend

## Task ID: 3

## Title
Modify Signup Backend to Implement Email Allowlist Validation

## Description
Modify the signup backend system to implement email allowlist validation instead of automatic account creation. The system should check incoming signup requests against a pre-defined list of approved client emails before creating accounts.

## Priority
High

## Status
Pending

## Dependencies
None

## Requirements

### Core Functionality
1. **Pre-approval Email Check**: Replace automatic account creation with email allowlist validation
2. **Allowlist Management**: Create a system to manage approved client emails
3. **Conditional Account Creation**: Only create accounts for pre-approved emails
4. **Email Verification Control**: Only send verification emails to approved signups
5. **User Feedback**: Provide appropriate messaging for both approved and non-approved attempts

### Initial Approved Email
- `apirat.kongchanagul@gmail.com` (first email to be added to allowlist)

## Implementation Details

### Backend Changes Required
- Modify `/api/auth/signup` route to check email against allowlist
- Create allowlist data structure (database table or config file)
- Implement email validation logic before account creation
- Update error/success messaging system
- Prevent automatic verification email sending for non-approved emails

### User Experience Changes
- **Approved Email**: Normal signup flow with account creation and verification email
- **Non-approved Email**: Clear message indicating email needs to be pre-approved
- **Error Handling**: Graceful handling of non-approved signup attempts

### Security Considerations
- Allowlist should be stored securely
- Clear distinction between "email not allowed" vs "email already exists"
- Rate limiting to prevent allowlist enumeration

## Files to Modify
- `src/app/api/auth/signup/route.ts` - Main signup logic
- Create email allowlist configuration/database
- Update frontend messaging in `src/app/auth/signup/page.tsx`

## Acceptance Criteria
- [ ] Signup only works for emails in the allowlist
- [ ] `apirat.kongchanagul@gmail.com` can successfully sign up
- [ ] Non-approved emails receive appropriate rejection message
- [ ] No verification emails sent to non-approved emails
- [ ] System maintains security best practices
- [ ] Clear user feedback for all scenarios

## Test Strategy
1. Test signup with approved email (`apirat.kongchanagul@gmail.com`)
2. Test signup with non-approved email
3. Verify no verification emails sent to non-approved attempts
4. Test error messaging clarity
5. Verify account creation only occurs for approved emails

## Notes
This change transforms the signup from an open registration system to an invite-only/pre-approved system, which is common for B2B applications in the aged care analytics space. 