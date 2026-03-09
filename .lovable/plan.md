

## Audit Round 4: Previous 17 Fixes Verified + 4 New Gaps Found

All 17 previously implemented fixes remain intact and working. This round identifies 4 remaining wiring gaps.

---

### Gap 18 — SalaryHeatmapOverlay Missing `forwardRef` (Console Warning)

**File**: `src/components/map/SalaryHeatmapOverlay.tsx` (line 133)

**Problem**: Active console warning: "Function components cannot be given refs." The `GoogleMapInner` component passes a ref to `SalaryHeatmapOverlay`, but it's a plain function component. This is the same class of bug previously fixed in `LeftSidebarPanel.tsx`'s `EmptyState`.

**Fix**: Wrap with `React.forwardRef`.

| File | Change |
|------|--------|
| `src/components/map/SalaryHeatmapOverlay.tsx` | Wrap export with `forwardRef` |

---

### Gap 19 — Related Jobs on JobDetail Missing `expires_at` + `is_active` Filter

**File**: `src/pages/JobDetail.tsx` (line 255)

**Problem**: The "More jobs from this company" query only filters by `status='open'` but misses `is_active=true` and `expires_at` checks. Expired/inactive related jobs can appear below job details.

**Fix**: Add `.eq('is_active', true).or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())` to the related jobs query.

| File | Change |
|------|--------|
| `src/pages/JobDetail.tsx` | Add expiry + active filters to related jobs query |

---

### Gap 20 — ActiveJobsTable Missing `expires_at` Filter (Employer Dashboard)

**File**: `src/components/dashboard/ActiveJobsTable.tsx` (line 55-62)

**Problem**: The employer's "Active Jobs" table queries `is_active=true` and `status='open'` but doesn't exclude expired jobs. An employer could see jobs that technically expired but weren't manually deactivated.

**Fix**: Add `.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())`.

| File | Change |
|------|--------|
| `src/components/dashboard/ActiveJobsTable.tsx` | Add expiry filter |

---

### Gap 21 — ActiveJobsTable N+1 Query for Application Counts

**File**: `src/components/dashboard/ActiveJobsTable.tsx` (lines 65-81)

**Problem**: For each job, a separate `applications` count query is made (N+1 pattern). With 5 jobs this is 6 total queries. This can be batched into a single query.

**Fix**: Fetch all application counts in one `.in('job_id', jobIds)` query grouped client-side, instead of N individual queries.

| File | Change |
|------|--------|
| `src/components/dashboard/ActiveJobsTable.tsx` | Batch application count query |

---

### Implementation Plan

| # | File | Change | Priority |
|---|------|--------|----------|
| 18 | `SalaryHeatmapOverlay.tsx` | Wrap with `forwardRef` to fix console warning | Medium |
| 19 | `JobDetail.tsx` | Add `is_active` + `expires_at` to related jobs query | High |
| 20 | `ActiveJobsTable.tsx` | Add `expires_at` filter | High |
| 21 | `ActiveJobsTable.tsx` | Batch application counts into single query | Medium |

All changes are client-side only — no database migrations needed.

