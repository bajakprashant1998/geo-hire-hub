

## Audit Round 5: Previous 21 Fixes Verified + 5 New Gaps Found

All 21 previous fixes remain intact. This round identifies 5 remaining wiring and performance gaps.

---

### Gap 22 — ReferralDashboard Bounty Jobs Missing `expires_at` Filter

**File**: `src/components/candidate/ReferralDashboard.tsx` (line 332-333)

**Problem**: The "Jobs with Bounties" query filters `is_active=true` and `status=open` but doesn't exclude expired jobs. Candidates see expired bounty jobs they can't actually apply to.

**Fix**: Add `.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())` to the bounty jobs query.

---

### Gap 23 — PlanUsagePanel Active Job Count Includes Expired Jobs

**File**: `src/components/employer/PlanUsagePanel.tsx` (line 50-52)

**Problem**: The "active jobs" count query uses `is_active=true` and `status=open` but no `expires_at` check. This inflates the "X of Y active jobs" usage meter, potentially preventing employers from posting new jobs when they actually have capacity.

**Fix**: Add `.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())` to the active job count query.

---

### Gap 24 — JobAnalyticsDashboard N+1 Query Pattern (60 queries)

**File**: `src/components/employer/JobAnalyticsDashboard.tsx` (lines 62-90)

**Problem**: For each of up to 20 jobs, 3 separate queries are made (applications count, application statuses, interview count) = up to 60 individual queries. This is the worst N+1 pattern remaining in the codebase.

**Fix**: Batch into 3 total queries using `.in('job_id', jobIds)`, then group client-side.

---

### Gap 25 — EmployerDashboard Over-fetching Job Data

**File**: `src/pages/EmployerDashboard.tsx` (line 72)

**Problem**: Uses `.select('*')` to fetch all job columns when the dashboard only needs `id, title, status, is_active, created_at, expires_at, job_type, job_address, view_count, employer_id, job_category, slug`. Fetching `description` (which can be very large) wastes bandwidth.

**Fix**: Replace `select('*')` with explicit column list excluding `description` and other heavy unused fields.

---

### Gap 26 — EmployerDashboard `activeJobs` Count Ignores Expiry

**File**: `src/pages/EmployerDashboard.tsx` (line 86)

**Problem**: `const activeJobs = jobsWithCounts.filter(j => j.is_active && j.status === 'open').length` doesn't check `expires_at`. This inflates the "Active Jobs" stat on the employer home view.

**Fix**: Add `&& (!j.expires_at || new Date(j.expires_at) > new Date())` to the filter.

---

### Implementation Plan

| # | File | Change | Priority |
|---|------|--------|----------|
| 22 | `ReferralDashboard.tsx` | Add `expires_at` filter to bounty jobs query | Medium |
| 23 | `PlanUsagePanel.tsx` | Add `expires_at` filter to active count query | High |
| 24 | `JobAnalyticsDashboard.tsx` | Batch 3 queries instead of N+1 (60 → 3) | High |
| 25 | `EmployerDashboard.tsx` | Replace `select('*')` with explicit columns | Medium |
| 26 | `EmployerDashboard.tsx` | Add expiry check to activeJobs client filter | High |

No database migrations needed. All changes are client-side query and filter fixes.

### Suggested Features (Based on Gaps Found)

These features emerge directly from the recurring `expires_at` filtering gap pattern:

1. **Centralized Job Query Utility** — Create a shared `buildActiveJobQuery()` helper that automatically applies `is_active`, `status=open`, and `expires_at` filters to any Supabase job query, preventing this class of bug from recurring.

2. **Scheduled Job Expiry Cron** — Add a backend function that runs daily to automatically set `is_active=false` on jobs past their `expires_at`, so stale data is cleaned at the source rather than relying on every client query to filter correctly.

3. **Employer Plan Usage Alert** — Since PlanUsagePanel was miscounting active jobs, add a toast notification when an employer approaches their plan's job limit (e.g., "You have 1 active job slot remaining").

