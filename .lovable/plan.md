
## System Audit Results: Previous Fixes Verified + 6 New Gaps Found

---

### ✅ Previous Fixes Verified (7 Gaps — All Implemented)

| # | Fix | Status |
|---|-----|--------|
| 1 | Expired Jobs Filter | ✅ `useBrowseJobs.ts`, `useMapData.ts`, `RecommendedJobs.tsx`, `useJobMatches.ts`, `get_nearby_jobs` RPC |
| 2 | useMapData Null Guard | ✅ `if (!userLocation) return [];` in both fetch functions |
| 3 | Dashboard Parallelization | ✅ Both dashboards use `Promise.all` for stats queries |
| 4 | Message Notification Stale Closure | ✅ `pathnameRef` implemented in `useMessageNotifications.ts` |
| 5 | Login Stats Error Handling | ✅ try/catch wraps stats fetch |
| 6 | ProfileSetup Skeleton | ✅ Loading skeleton present (lines 177-198) |
| 7 | LocationBadge Abort Cleanup | ✅ AbortController with proper cleanup return |

---

### 🔍 New Gaps Identified

#### Gap 1 — JobDetail Missing `expires_at` Check (Medium Priority)
**Problem**: `JobDetail.tsx` fetches and displays job details without checking if the job has expired. Users can still view and potentially apply to expired jobs.

**Fix**: Add expired job banner/alert when `expires_at < now()`.

| File | Change |
|------|--------|
| `src/pages/JobDetail.tsx` | Add expired job alert banner, disable apply button for expired jobs |

---

#### Gap 2 — Job Application Validation Missing Client-Side Expiry Check (Low Priority)
**Problem**: While the DB trigger `validate_application_deadline` blocks expired applications server-side, the client shows an unclear error. Better UX is to prevent the application form from being shown at all.

**Fix**: Check `expires_at` before rendering application dialog.

| File | Change |
|------|--------|
| `src/pages/JobDetail.tsx` | Disable "Apply" button and show tooltip for expired jobs |

---

#### Gap 3 — SavedJobsSection Missing Batch Remove Feature (UX Enhancement)
**Problem**: Users must remove saved jobs one-by-one. For the "Closed" tab with many entries, this is tedious.

**Fix**: Add "Remove All Closed" button in the stats section.

| File | Change |
|------|--------|
| `src/components/candidate/SavedJobsSection.tsx` | Add bulk remove for closed jobs |

---

#### Gap 4 — RecommendedJobs AI Fallback Missing Error Boundary (Medium Priority)
**Problem**: If the AI recommendation edge function fails AND the basic fallback also fails, the component shows a blank skeleton indefinitely.

**Fix**: Add error state with retry button.

| File | Change |
|------|--------|
| `src/components/candidate/RecommendedJobs.tsx` | Add error state handling with retry |

---

#### Gap 5 — Missing Loading State in Job Radar When Recalculating (UX)
**Problem**: `useJobMatches.ts` has a `calculating` state but the UI doesn't show a clear recalculation indicator during match refresh.

**Files to check**: `JobRadar.tsx` component usage of `calculating` state.

---

#### Gap 6 — usePresence Missing User ID Validation (Minor)
**Problem**: `setTyping` doesn't validate that `convId` matches the active `conversationId` passed to the hook, potentially broadcasting typing to wrong channels if misused.

**Fix**: Add convId validation in `setTyping`.

| File | Change |
|------|--------|
| `src/hooks/usePresence.ts` | Validate convId matches active conversationId |

---

### Recommended Features Based on Gaps

| # | Feature | Addresses Gap | Implementation |
|---|---------|---------------|----------------|
| 1 | Expired Job Banner | Gap 1 & 2 | Show alert with message "This job listing has expired" + disabled apply button |
| 2 | Bulk Remove Closed Jobs | Gap 3 | "Clear All Closed" button with confirmation dialog |
| 3 | AI Recommendations Error State | Gap 4 | Error card with "Retry" button and fallback message |
| 4 | Typing Validation | Gap 6 | Early return if convId doesn't match hook's conversationId |

---

### Implementation Priority

```text
Priority 1 (Data Integrity):
  └── Gap 1+2: Expired job handling in JobDetail

Priority 2 (UX Polish):
  └── Gap 3: Bulk remove closed saved jobs
  └── Gap 4: AI recommendations error state

Priority 3 (Minor):
  └── Gap 5: Job Radar calculating indicator
  └── Gap 6: Typing channel validation
```

---

### Technical Snippets

**Gap 1+2: Expired Job Alert (JobDetail.tsx)**
```tsx
const isExpired = job.expires_at && new Date(job.expires_at) < new Date();

{isExpired && (
  <Alert variant="destructive" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription>
      This job listing has expired and is no longer accepting applications.
    </AlertDescription>
  </Alert>
)}

<Button disabled={isExpired || hasApplied} ...>
  {isExpired ? 'Expired' : 'Apply Now'}
</Button>
```

**Gap 3: Bulk Remove (SavedJobsSection.tsx)**
```tsx
const removeAllClosed = async () => {
  const closedIds = savedJobs
    ?.filter(s => !s.job?.is_active || s.job?.status !== 'open')
    .map(s => s.id) || [];
  if (closedIds.length === 0) return;
  
  await supabase.from('saved_jobs').delete().in('id', closedIds);
  queryClient.invalidateQueries({ queryKey: ['saved-jobs', candidateId] });
  toast.success(`Removed ${closedIds.length} closed jobs`);
};
```

**Gap 4: Error State (RecommendedJobs.tsx)**
```tsx
const [error, setError] = useState(false);

// In catch block:
setError(true);
setLoading(false);

// In render:
if (error) {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <p>Failed to load recommendations</p>
        <Button onClick={() => { setError(false); fetchAIRecommendations(); }}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

### Summary

- **7 previous gaps**: All verified as implemented ✅
- **6 new gaps**: Identified through this audit
- **Runtime error**: Google Maps `getRootNode` error is already handled by global `unhandledrejection` listener
- **No critical bugs**: System is stable, gaps are enhancements
