

# Fix All Issues + Add All Features

## Part 1: Bug Fixes (10 Issues)

### Issue 1 - Public Job Browsing (HIGH)
The `get_nearby_jobs` and `get_nearby_candidates` RPCs require auth, but `useMapData.ts` already has a fallback direct query path for anonymous users (lines 147-193). The fallback works because RLS allows public reads on jobs/candidates. **No code change needed** for the fallback itself -- the map already shows data for guests via direct queries. However, if the RPC throws an error that gets surfaced as a toast, we should suppress it silently.

- **File**: `src/hooks/useMapData.ts` -- ensure RPC errors for unauthenticated users fail silently (they already do via the `if (user)` guard on lines 45 and 121, so this is actually already working). Verify and confirm.

### Issue 2 - Login Toggle is Cosmetic (MEDIUM)
The "Job Seeker / Employer" toggle on login sets `userType` state but never uses it. Since login is email/password based and user_type is set during signup, the toggle is misleading.

- **File**: `src/pages/Login.tsx` -- Remove the toggle entirely. Login should just be email + password; the backend already knows the user type.

### Issue 3 - Terms/Privacy Links (MEDIUM)
Links go to `#` on Login and Signup pages.

- **Files**: Create `src/pages/TermsOfService.tsx` and `src/pages/PrivacyPolicy.tsx` with proper legal content templates.
- **File**: `src/App.tsx` -- Add routes `/terms` and `/privacy`.
- **Files**: `src/pages/Login.tsx`, `src/pages/Signup.tsx` -- Update `Link to="#"` to `Link to="/terms"` and `Link to="/privacy"`.

### Issue 4 - ProfileSetup Duplicate Records (MEDIUM)
DB triggers (`handle_new_candidate_profile`, `handle_new_employer_profile`) auto-create candidate/employer rows on profile insert. But `ProfileSetup.tsx` also does `INSERT` into candidates/employers, causing conflicts.

- **File**: `src/pages/ProfileSetup.tsx` -- Change `insert` to `upsert` (or use `update` with `.eq('profile_id', profile.id)`) for both candidates and employers tables to avoid duplicate key errors.

### Issue 5 - Hardcoded Login Stats (LOW)
"10K+ Active Jobs", "5K+ Companies", "50K+ Job Seekers" are hardcoded.

- **File**: `src/pages/Login.tsx` -- Fetch real counts from Supabase (`jobs`, `employers`, `profiles` tables) on mount and display them. Use simple `.select('id', { count: 'exact', head: true })` queries.

### Issue 6 - Candidate Profile Views Misleading (MEDIUM)
Currently counts `job_views` for jobs the candidate applied to, which is not "profile views."

- **Database**: Create a `profile_views` table (viewer_id, profile_id, created_at).
- **File**: `src/pages/CandidateDashboard.tsx` -- Query `profile_views` instead of `job_views`.
- **Files**: `src/pages/CandidateDetail.tsx`, `src/pages/EmployerDetail.tsx` -- Insert a view record when the page loads.

### Issue 7 - Hardcoded Notification Count (MEDIUM)
`notificationCount={2}` in CandidateDashboard, `notificationCount={3}` in EmployerDashboard.

- **File**: `src/pages/CandidateDashboard.tsx` -- Fetch unread notification count from `notifications` table where `user_id = user.id AND is_read = false`.
- **File**: `src/pages/EmployerDashboard.tsx` -- Same fix.

### Issue 8 - Hardcoded HSL Colors (LOW)
EmployerDashboard uses `text-[hsl(142,53%,43%)]` instead of semantic tokens like `text-primary`.

- **File**: `src/pages/EmployerDashboard.tsx` -- Replace all `hsl(142,53%,43%)` with `primary` token variants (`bg-primary`, `text-primary`, `hover:bg-primary/90`).

### Issue 9 - Messages google-blue (LOW)
- **File**: `src/pages/Messages.tsx` -- Find and replace any `google-blue` class with a proper design token.

### Issue 10 - No Delete Account (MEDIUM)
- **File**: `src/components/candidate/SecuritySettings.tsx` -- The "Delete Account" button exists but shows a toast placeholder. Implement actual account deletion: delete candidate/employer record, delete profile, then call `supabase.auth.admin.deleteUser()` via an edge function (since client can't delete auth users).
- **File**: Create `supabase/functions/delete-account/index.ts` -- Edge function that verifies the caller and deletes their auth user.

## Part 2: New Features (12 Features)

### Feature 1 - Public Job Browsing
Already working via the fallback in `useMapData.ts`. Just confirm and clean up any error toasts for anonymous users.

### Feature 2 - Terms & Privacy Pages
Covered in Issue 3 above.

### Feature 3 - Application Status Notifications
- **Database**: Create a trigger on `applications` table that inserts a notification row when `status` changes.
- **Migration**: `CREATE FUNCTION notify_application_status_change()` trigger function that inserts into `notifications` with appropriate message.

### Feature 4 - Employer Verification Badge on Listings
- **File**: `src/components/map/MapContainer.tsx` -- Show a verified checkmark icon on map markers/popups for employers with `verification_status = 'approved'`.
- **File**: `src/pages/JobDetail.tsx` -- Import and display `VerificationBadge` component (already exists at `src/components/employer/VerificationBadge.tsx`).

### Feature 5 - Search/Filter on Jobs Browse Page
- **File**: Create `src/pages/BrowseJobs.tsx` -- A dedicated `/browse-jobs` page with keyword search, location filter, salary range slider, job type filter, and pagination.
- **File**: `src/App.tsx` -- Add route.

### Feature 6 - Profile Views Tracking
Covered in Issue 6 above (profile_views table + recording views on detail pages).

### Feature 7 - Bulk Application Actions
- **File**: `src/components/employer/ApplicantTabs.tsx` -- Add checkbox selection per applicant, integrate `BulkActionsBar` (already exists) for shortlist/reject multiple applicants at once.

### Feature 8 - Dark/Light Mode on Landing Page
- **File**: `src/components/map/Header.tsx` -- Add a theme toggle button (Sun/Moon icon) using the existing `next-themes` setup.

### Feature 9 - Dynamic Sitemap
- **File**: Create `supabase/functions/sitemap/index.ts` -- Edge function that queries all jobs, candidates, and employers with slugs and generates XML sitemap.
- **File**: `public/robots.txt` -- Update sitemap URL.

### Feature 10 - PWA Support
- **File**: Create `public/manifest.json` with app name, icons, theme color.
- **File**: `index.html` -- Add manifest link.
- **File**: Create `public/sw.js` -- Basic service worker for offline caching.

### Feature 11 - Report Job/Candidate UI
- **File**: Create `src/components/ReportDialog.tsx` -- Reusable dialog for submitting reports (reason, description).
- **Files**: `src/pages/JobDetail.tsx`, `src/pages/CandidateDetail.tsx` -- Add a "Report" button that opens the dialog and inserts into `job_reports` or `employer_reports` tables.

### Feature 12 - Pagination on Lists
- **File**: `src/components/map/LeftSidebarPanel.tsx` -- Add cursor-based pagination (load more button) for nearby jobs/candidates lists.
- **File**: `src/components/employer/ApplicantTabs.tsx` -- Add pagination for applicant lists.
- **File**: `src/pages/BrowseJobs.tsx` -- Built-in pagination from the start.

## Technical Details

### Database Migration (Single Migration)
```sql
-- Profile views tracking
CREATE TABLE public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  viewer_id uuid,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert views" ON public.profile_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view their own stats" ON public.profile_views FOR SELECT USING (
  profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Application status change notification trigger
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  candidate_user_id uuid;
  job_title text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT p.user_id INTO candidate_user_id
    FROM candidates c JOIN profiles p ON c.profile_id = p.id
    WHERE c.id = NEW.candidate_id;

    SELECT j.title INTO job_title FROM jobs j WHERE j.id = NEW.job_id;

    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      candidate_user_id,
      'application_update',
      'Application Status Updated',
      'Your application for "' || COALESCE(job_title, 'a job') || '" has been ' || NEW.status,
      '/candidate-dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_application_status_change
  AFTER UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION notify_application_status_change();
```

### Edge Function: delete-account
Validates the JWT, extracts user ID, deletes the auth user using service role key.

### Edge Function: sitemap
Queries jobs, candidates (visible), employers (approved) and outputs XML.

### File Change Summary
| Action | File |
|--------|------|
| Edit | `src/pages/Login.tsx` (remove toggle, fetch live stats) |
| Edit | `src/pages/Signup.tsx` (update terms links) |
| Edit | `src/pages/ProfileSetup.tsx` (upsert instead of insert) |
| Edit | `src/pages/CandidateDashboard.tsx` (real notification count, profile views) |
| Edit | `src/pages/EmployerDashboard.tsx` (real notification count, fix HSL colors) |
| Edit | `src/pages/CandidateDetail.tsx` (record profile view, add report button) |
| Edit | `src/pages/EmployerDetail.tsx` (record profile view) |
| Edit | `src/pages/JobDetail.tsx` (add verification badge, report button) |
| Edit | `src/pages/Messages.tsx` (fix google-blue class) |
| Edit | `src/components/candidate/SecuritySettings.tsx` (real delete account) |
| Edit | `src/components/map/Header.tsx` (add theme toggle) |
| Edit | `src/components/map/MapContainer.tsx` (verification badge on markers) |
| Edit | `src/components/map/LeftSidebarPanel.tsx` (pagination) |
| Edit | `src/components/employer/ApplicantTabs.tsx` (bulk actions, pagination) |
| Edit | `src/App.tsx` (new routes) |
| Edit | `public/robots.txt` (sitemap URL) |
| Edit | `index.html` (PWA manifest link) |
| Create | `src/pages/TermsOfService.tsx` |
| Create | `src/pages/PrivacyPolicy.tsx` |
| Create | `src/pages/BrowseJobs.tsx` |
| Create | `src/components/ReportDialog.tsx` |
| Create | `public/manifest.json` |
| Create | `public/sw.js` |
| Create | `supabase/functions/delete-account/index.ts` |
| Create | `supabase/functions/sitemap/index.ts` |
| Create | DB migration (profile_views table, notification trigger) |

