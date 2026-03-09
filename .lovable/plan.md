
Goal: fix the two confirmed gaps without changing product behavior.

1) Employer Dashboard N+1 in `fetchEmployerData`
- Current issue:
  - `jobs` are fetched once, then `applications` count is queried once per job (`Promise.all`), causing N+1 calls.
- Implementation plan:
  - In `src/pages/EmployerDashboard.tsx`, replace per-job count loop with one batched applications query:
    - Fetch all jobs for employer.
    - Build `jobIds`.
    - Single query: `applications.select('job_id').in('job_id', jobIds)`.
    - Reduce results into `Record<job_id, count>`.
    - Map counts back into `jobsWithCounts`.
  - Keep existing derived stats logic (`activeJobs`, `totalApplications`) but compute from the mapped counts.
- Expected result:
  - Query count drops from `1 + N` to `2` for jobs+applications, improving dashboard load time and reducing backend pressure.

2) Profile fetch race condition (auth/profile guard coordination)
- Current issue:
  - `useAuth` timeout forces `profileLoading=false` after 5s even while retries may still complete.
  - Dashboards treat `!profile && !profileLoading` as terminal and show “Profile Not Found” too early.
- Implementation plan:

A. Stabilize auth context state
- File: `src/hooks/useAuth.tsx`
- Add a new state flag (e.g. `profileResolved`) to represent “initial profile resolution finished” rather than “currently loading”.
- Flow changes:
  - On new authenticated session:
    - set `profileResolved=false`, start profile fetch/retries.
    - timeout should no longer mark profile as terminal failure; it can stop spinner only for current attempt, but must not indicate final no-profile state.
  - In `fetchProfile`:
    - only set final resolution (`profileResolved=true`) after retry chain ends (success or exhausted retries).
- Expose `profileResolved` in context alongside existing fields.

B. Update route/dashboard guards to use resolved-state, not transient loading only
- File: `src/components/auth/AuthRouteGuard.tsx`
  - Gate on `authLoading || (user && !profileResolved)` for role-protected routes.
  - If resolved and still no profile, redirect to `/profile-setup` (or existing fallback destination used by app), instead of rendering role pages with null profile.
- File: `src/components/dashboard/DashboardAuthGuard.tsx`
  - Replace “Profile Not Found” trigger condition with:
    - show loading while `user && !profile && !profileResolved`
    - only show “Profile Not Found” when `user && !profile && profileResolved`
- Files: `src/pages/EmployerDashboard.tsx`, `src/pages/CandidateDashboard.tsx`
  - In auth effect, do not set `dataLoading=false` on `!profile` until profile resolution is finalized.
  - Keep retry effect, but couple terminal fallback to resolved-state to prevent premature empty-state.

3) Validation and regression checks
- Auth/profile:
  - Login with existing user profile → no “Profile Not Found” flash.
  - Simulate slow profile fetch (network throttling) → dashboard waits correctly and eventually loads.
  - User with genuinely missing profile → ends in deterministic fallback (`/profile-setup` or profile-not-found UI).
- Employer dashboard:
  - Verify stats unchanged functionally.
  - Confirm only one applications fetch for job counts (no per-job requests).
- Role routing:
  - Candidate/employer redirects still correct.
  - No protected route renders with `profile=null`.

4) Scope and risk notes
- No schema migration required for these two fixes.
- Low-risk UI/state refactor; main risk is unintended loading loops.
- Mitigation: keep effect dependencies tight and mark initial profile resolution explicitly to avoid oscillation.

Implementation files (planned):
- `src/pages/EmployerDashboard.tsx`
- `src/pages/CandidateDashboard.tsx`
- `src/hooks/useAuth.tsx`
- `src/components/auth/AuthRouteGuard.tsx`
- `src/components/dashboard/DashboardAuthGuard.tsx`
