

## Audit Results: 7 Gaps Found (All Related to Existing Features)

---

### Gap 1 — Expired Jobs Shown in Browse/Map/Recommendations (High Priority, Data Accuracy)

**Problem**: `useBrowseJobs`, `get_nearby_jobs` RPC, `useMapData` direct query, `RecommendedJobs` fallback, and `useJobMatches` all query jobs with `status=open AND is_active=true` but never check `expires_at`. Expired jobs appear in browse results, map markers, recommendations, and match calculations.

**Fix**:
- **`useBrowseJobs.ts`**: Add `.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())` to the query chain
- **`get_nearby_jobs` DB function**: Add `AND (j.expires_at IS NULL OR j.expires_at > now())` to the WHERE clause (migration)
- **`useMapData.ts` direct fallback**: Add same `.or()` filter on the direct `jobs` query
- **`RecommendedJobs.tsx` fallback query**: Add expires filter
- **`useJobMatches.ts`**: Filter out expired jobs in the join or post-fetch

| File | Change |
|------|--------|
| `src/hooks/useBrowseJobs.ts` | Add expires_at filter to query |
| `src/hooks/useMapData.ts` | Add expires_at filter to direct fallback |
| `src/components/candidate/RecommendedJobs.tsx` | Add expires_at filter to fallback |
| `src/hooks/useJobMatches.ts` | Filter expired jobs from matches |
| DB migration | Update `get_nearby_jobs` function |

---

### Gap 2 — `useMapData` Crashes When `userLocation` Is Null (High Priority, Stability)

**Problem**: `fetchCandidates` and `fetchJobs` access `userLocation.lat` and `userLocation.lng` directly inside the `if (user)` block without checking if `userLocation` is null. When a logged-in user hasn't granted location permission, this causes a runtime crash.

**Fix**: Add early return `if (!userLocation) return [];` at the top of both `fetchCandidates` and `fetchJobs`.

| File | Change |
|------|--------|
| `src/hooks/useMapData.ts` | Add null guard for userLocation in both fetch functions |

---

### Gap 3 — Employer Dashboard Stats Still Sequential (Medium Priority, Performance)

**Problem**: After the unread RPC fix, lines 96-101 in `EmployerDashboard.tsx` still run `interviewCount`, `viewCount`, `notifCount`, `unreadData`, and `subData` queries sequentially. Same pattern in `CandidateDashboard.tsx` (lines 71-73).

**Fix**: Wrap remaining sequential queries into the existing `Promise.all` block.

| File | Change |
|------|--------|
| `src/pages/EmployerDashboard.tsx` | Move 5 remaining queries into Promise.all |
| `src/pages/CandidateDashboard.tsx` | Move 3 remaining queries into Promise.all |

---

### Gap 4 — `useMessageNotifications` Stale Closure on `location.pathname` (Low Priority, Messaging)

**Problem**: The realtime channel callback captures `location.pathname` at subscription time. When the user navigates to a conversation page, the "don't show notification if viewing this conversation" check (line 52) uses the stale pathname from when the channel was created, not the current route.

**Fix**: Store `location.pathname` in a `useRef` and read from the ref inside the callback.

| File | Change |
|------|--------|
| `src/hooks/useMessageNotifications.ts` | Use ref for pathname to avoid stale closure |

---

### Gap 5 — `LoginPage` Stats Query Has No Error Handling (Low Priority, Stability)

**Problem**: `Login.tsx` line 27-39 fires three parallel Supabase queries on mount with no try/catch. If any fails, the component crashes or shows 0s silently.

**Fix**: Wrap in try/catch, keep 0 defaults on error.

| File | Change |
|------|--------|
| `src/pages/Login.tsx` | Add try/catch around stats fetch |

---

### Gap 6 — `ProfileSetup` No Loading Skeleton (Medium Priority, UX)

**Problem**: `ProfileSetup.tsx` shows nothing while `authLoading || profileLoading` is true. User sees a blank page.

**Fix**: Show a skeleton card layout (matching the form structure) while auth resolves.

| File | Change |
|------|--------|
| `src/pages/ProfileSetup.tsx` | Add skeleton UI during auth loading |

---

### Gap 7 — Nominatim Geocoding Creates New AbortController Without Cleanup (Low Priority, Memory)

**Problem**: `LocationBadge.tsx` creates an `AbortController` inside the async function but never aborts it if the component unmounts before the fetch completes. The `useEffect` has no cleanup.

**Fix**: Move AbortController creation outside the async function and return `controller.abort()` in the useEffect cleanup.

| File | Change |
|------|--------|
| `src/components/map/LocationBadge.tsx` | Proper AbortController cleanup in useEffect |

---

### Implementation Order

1. **Gap 2** — Crash fix (useMapData null guard) — critical stability
2. **Gap 1** — Expired jobs filter (5 files + 1 migration) — data accuracy
3. **Gap 3** — Dashboard query parallelization — performance
4. **Gap 4** — Message notification stale closure — correctness
5. **Gap 6** — ProfileSetup skeleton — UX
6. **Gap 5** — Login stats error handling — stability
7. **Gap 7** — LocationBadge abort cleanup — memory

