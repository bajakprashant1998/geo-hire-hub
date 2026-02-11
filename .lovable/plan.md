

# Fix Map Visibility, Dashboard Responsiveness, and Navigation Links

## Issues Found

### Issue 1: Candidate Cards Not Visible on Map Without Login
**Root Cause**: The database Row-Level Security (RLS) policies on `candidates` and `profiles` tables block anonymous (unauthenticated) access entirely. The `candidates` table only allows viewing by admins, the candidate themselves, or authenticated employers. The `profiles` table only shows candidate profiles to authenticated employers via `is_employer(auth.uid())`. When a user is not logged in, the database returns zero rows, so no candidate markers appear on the map.

**Fix**: Add public-facing RLS policies that allow anonymous users to read candidate profiles with `is_visible_on_map = true`. The data restriction (showing only name and job title) is already handled at the frontend level in the popup cards and MarkerPreviewSheet.

### Issue 2: Candidate Dashboard Not Responsive on Mobile
**Root Cause**: Several layout issues in `CandidateDashboard.tsx` and child components:
- The "Complete your profile" banner text and buttons can overflow on small screens
- The Messages + Interview grid (`lg:grid-cols-3`) can feel cramped
- Section content cards use `p-6` padding which is too large on mobile
- The stat card subtitles can truncate awkwardly on small screens

**Fix**: Adjust padding, text sizes, and grid breakpoints for better mobile rendering.

### Issue 3: General Responsiveness Audit
Key pages to fix:
- `DashboardHeader.tsx`: Welcome message hidden on mobile (already handled with `hidden sm:block`) but the mobile header is too bare -- add a compact greeting
- `DashboardStatCard.tsx`: Already responsive but value text (`text-2xl sm:text-3xl`) could be slightly smaller on very small screens
- `AIJobMatches.tsx`: The match cards have a `grid-cols-2` skills section that can break on very narrow screens -- change to single column on mobile
- `JobMatchCarousel.tsx`: Card width of 260px is good but the header buttons could overlap on small screens

### Issue 4: Job Page Links Not Working Properly
**Root Cause**: Navigation links from the candidate dashboard and homepage to job detail pages use `/jobs/${id}` which is correctly routed in `App.tsx`. However:
- The `AIJobMatches` component links work correctly (`/jobs/${match.job_id}`)
- The `JobMatchCarousel` links work correctly (`/jobs/${job.id}`)
- The map popup "Apply Now" navigates to `/jobs/${id}?action=apply` which works
- The redirect alias `/job/:id` to `/jobs/:id` does NOT work correctly -- it literally navigates to `/jobs/:id` (the string `:id`) instead of preserving the parameter

**Fix**: Fix the redirect in `App.tsx` from the broken static redirect to a proper component that reads the param and redirects.

---

## Implementation Steps

### Step 1: Add Public RLS Policies for Candidate Visibility
Create a database migration adding:
- A SELECT policy on `profiles` allowing anonymous reads where `is_visible_on_map = true` AND `user_type = 'candidate'`
- A SELECT policy on `candidates` allowing anonymous reads (joined profiles must be visible)

This allows the `useMapData.ts` fallback query (lines 69-104) to return candidate data for unauthenticated users.

### Step 2: Fix Candidate Dashboard Responsiveness
In `CandidateDashboard.tsx`:
- Reduce section content padding from `p-6` to `p-4 sm:p-6`
- Add `text-center sm:text-left` to the profile completion banner for better mobile alignment
- Make the "Back to Dashboard" button more compact on mobile

### Step 3: Fix AIJobMatches Responsiveness
In `AIJobMatches.tsx`:
- Change skills grid from `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`
- Reduce score circle size on mobile (`w-12 h-12 sm:w-14 sm:h-14`)
- Make the match badge wrap better on small screens

### Step 4: Fix the `/job/:id` Redirect in App.tsx
Replace the broken `<Navigate to="/jobs/:id" replace />` with a proper redirect component that reads the `id` param and navigates to `/jobs/${id}`.

### Step 5: Add Compact Mobile Greeting to DashboardHeader
Show a short "Hi, Name" text on mobile screens where the full welcome message is hidden.

---

## Technical Details

### Database Migration (Step 1)
```sql
-- Allow anonymous users to view candidate profiles on map
CREATE POLICY "Public can view visible candidate profiles"
ON public.profiles FOR SELECT
USING (
  is_visible_on_map = true
  AND user_type = 'candidate'
);

-- Allow anonymous users to view candidates
CREATE POLICY "Public can view candidates"
ON public.candidates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = candidates.profile_id
    AND p.is_visible_on_map = true
  )
);
```

### Files to Modify

| File | Changes |
|------|---------|
| Database migration | Add 2 public SELECT RLS policies |
| `src/App.tsx` | Fix `/job/:id` redirect to properly forward the param |
| `src/pages/CandidateDashboard.tsx` | Adjust padding and layout for mobile |
| `src/components/candidate/AIJobMatches.tsx` | Fix grid and sizing for mobile |
| `src/components/dashboard/DashboardHeader.tsx` | Add compact mobile greeting |

### Redirect Fix (App.tsx)
Create a small `JobRedirect` component that reads `useParams().id` and renders `<Navigate to={`/jobs/${id}`} replace />`.

