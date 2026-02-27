

## Remaining Tasks - AI Employer Verification System

### Current State Analysis
- **Phase 1-2 (Complete)**: DB schema + edge function deployed
- **Phase 3 (Complete)**: CompanyProfileSection already has document uploads (Company Reg, GST, PAN), Google Business URL input, trust score display, and "Submit for AI Verification" button wired to `verify-employer` edge function
- **Phase 4 (Partial)**: AdminEmployers has trust score column + VerificationBadge; AdminSettings has AI verification toggles. Missing: decision logs viewer, blacklist management
- **Phase 5 (Partial)**: JobDetail uses VerificationBadge but without `verificationMethod`/`googleBusinessVerified` props. EmployerDetail uses a plain Badge instead of VerificationBadge component
- **Phase 6 (Not Started)**: No re-verification cron job

### Implementation Plan

#### Task 1: Admin AI Verification Dashboard Enhancements

**AdminEmployers.tsx** - Add to the detail dialog:
- Fetch `employer_verification_checks` for selected employer and display as an expandable decision log (check type, status, score, AI details)
- Show trust score breakdown per check type

**New: Admin Blacklist Management** - Add to AdminEmployers or as a tab:
- Query `employer_blacklist` table
- Table showing type, value, reason, created_at
- Add form to insert new blacklist entries (domain, phone, IP, document_hash)
- Delete button per entry

#### Task 2: VerificationBadge on Job Postings & Employer Detail

**JobDetail.tsx**:
- Add `verification_method` and `google_business_verified` to `JobDetails.employer` interface
- Update the Supabase query to fetch these fields from employers
- Pass them to `<VerificationBadge>` (line 485) as `verificationMethod` and `googleBusinessVerified`

**EmployerDetail.tsx**:
- Add `verification_method`, `google_business_verified`, `trust_score` to `EmployerProfile` interface
- Replace the plain `<Badge>Verified</Badge>` (line 351) with `<VerificationBadge>` component with all props
- Fetch these fields in the query

#### Task 3: Re-verification Cron Job

**New edge function**: `supabase/functions/check-reverification/index.ts`
- Query employers where `next_reverification_at < now()` and `verification_status = 'approved'`
- For each, insert a notification for the employer ("Re-verification required")
- Update `verification_status` to `pending` or add a flag
- Insert admin notification about due re-verifications

**Register in AdminScheduledJobs.tsx**:
- Add entry to `SCHEDULED_JOBS` array: `{ name: 'Re-verification Check', description: 'Flag employers due for re-verification', functionName: 'check-reverification', schedule: 'Daily at 6 AM' }`

**Set up cron** via SQL insert (pg_cron + pg_net):
- Schedule daily invocation of `check-reverification` function

#### Task 4: Config updates
- Add `check-reverification` to `supabase/config.toml` with `verify_jwt = false`

### Files to Create/Modify
- **Create**: `supabase/functions/check-reverification/index.ts`
- **Edit**: `src/pages/admin/AdminEmployers.tsx` (decision logs + blacklist tab)
- **Edit**: `src/pages/JobDetail.tsx` (interface + query + badge props)
- **Edit**: `src/pages/EmployerDetail.tsx` (interface + query + badge component)
- **Edit**: `src/pages/admin/AdminScheduledJobs.tsx` (add entry)
- **Edit**: `supabase/config.toml` (add function)

