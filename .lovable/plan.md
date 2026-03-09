

## Audit Round 3: Previous 13 Fixes Verified + 4 New Gaps Found

All 13 previous fixes remain intact and working correctly. This round identifies 4 remaining expired-job filtering gaps that were missed in earlier audits.

---

### Gap 14 — Job Radar Missing `expires_at` Filter

**File**: `src/hooks/useJobRadar.ts` (line 150-151)

**Problem**: The query fetches jobs with `status=open` and `is_active=true` but does not exclude expired jobs. Candidates see expired listings in their Job Radar results.

**Fix**: Add `.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())` to the Supabase query chain.

---

### Gap 15 — Recently Viewed Jobs Shows Expired Listings

**File**: `src/components/candidate/RecentlyViewedJobs.tsx` (line 50)

**Problem**: The `job_views` query uses `!inner` join on `jobs` but never filters by `expires_at`, `is_active`, or `status`. Jobs that expired after being viewed still appear in the "Recently Viewed" section.

**Fix**: Add filters to the inner join or post-filter results:
- Add `.eq('job.is_active', true)` won't work on inner joins — instead, add `is_active, status, expires_at` to the select fields and filter client-side after fetch.

---

### Gap 16 — Job Match Carousel Missing `expires_at` and `status` Filters

**File**: `src/components/dashboard/JobMatchCarousel.tsx` (line 49)

**Problem**: Only checks `is_active=true`. Missing both `status=open` and `expires_at` filter. This is the weakest-filtered job query in the system — expired and closed jobs can appear in the dashboard carousel.

**Fix**: Add `.eq('status', 'open')` and `.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())`.

---

### Gap 17 — Company Watchlist Job Count Includes Expired Jobs

**File**: `src/components/candidate/CompanyWatchlist.tsx` (line 60-65)

**Problem**: The open-jobs count query checks `is_active=true` and `status=open` but not `expires_at`. The "X open jobs" badge may overcount by including expired listings.

**Fix**: Add `.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())` to the count query.

---

### Implementation Plan

| # | File | Change | Priority |
|---|------|--------|----------|
| 14 | `src/hooks/useJobRadar.ts` | Add `expires_at` filter to job fetch query | High |
| 15 | `src/components/candidate/RecentlyViewedJobs.tsx` | Add `is_active`, `status`, `expires_at` to select + client-side filter | Medium |
| 16 | `src/components/dashboard/JobMatchCarousel.tsx` | Add `status=open` + `expires_at` filter | High |
| 17 | `src/components/candidate/CompanyWatchlist.tsx` | Add `expires_at` filter to job count query | Low |

All 4 gaps are the same class of bug (missing expiry filter) applied to 4 different query paths. No new database migrations needed.

