
# Comprehensive Feature Implementation Plan

## Issues to Fix

### 1. Duplicate "Settings" in Employer Sidebar
The employer sidebar has "Settings" in the `sidebarItems` array (line 222 of `EmployerDashboard.tsx`) AND a hardcoded "Settings" link in the `DashboardSidebar.tsx` footer (line 156). Remove the "Settings" item from the employer's `sidebarItems` array since the footer link already handles it.

### 2. Education Dates Truncation on Public Profile
In `CandidateDetail.tsx` (line 343), education years display `{edu.startYear} -- {edu.endYear}`. The data might be stored as numbers that get truncated. Add a `String()` cast: `{String(edu.startYear)} -- {String(edu.endYear || 'Present')}` to ensure proper rendering.

### 3. Dark Mode Toggle Not Functional
The Moon icon button in `DashboardHeader.tsx` (line 107) has no `onClick` handler. The app uses `next-themes` (already installed) via the Sonner component but there's no `ThemeProvider` wrapping the app. Need to add `ThemeProvider` to `main.tsx` and wire the toggle button.

---

## New Features

### Feature 1: Application Status Timeline (High Priority)
**Files modified:** `src/components/candidate/JobActivityTabs.tsx`

Add a visual step-based timeline showing: Applied -> Reviewed -> Shortlisted -> Interview -> Hired (or Rejected as a branch). Each application card will show a horizontal progress indicator with colored dots/steps based on the current `status` field. The existing `statusConfig` already maps all statuses.

Implementation:
- Add a `StatusTimeline` sub-component inside `JobActivityTabs.tsx`
- Define ordered steps: `['pending', 'reviewed', 'shortlisted', 'hired']`
- Render colored dots connected by lines; fill dots up to the current status
- If status is `rejected`, show a red X at the rejection point
- Render this timeline below the job title in each application card

### Feature 2: Email Notifications for Realtime Events (High Priority)
**Files created:** `supabase/functions/send-notification-email/index.ts`
**Database:** Add a trigger on `notifications` INSERT that calls the edge function

Implementation:
- Create an edge function that receives notification data and sends an email via Resend (RESEND_API_KEY already configured)
- Add a `notification_preferences` table with columns: `user_id`, `email_notifications_enabled` (default true), `email_digest_frequency` ('instant', 'daily', 'weekly')
- Create a database trigger on `notifications` INSERT that calls `pg_net` to invoke the edge function
- The edge function checks user preferences before sending
- Add a toggle in `SecuritySettings.tsx` for candidates and `CompanyProfileEdit.tsx` for employers

### Feature 3: Dashboard Quick Stats Animation (Low Priority)
**Files modified:** `src/components/dashboard/DashboardStatCard.tsx`

Add a count-up animation when stat values load:
- Use a simple `useEffect` + `useState` with `requestAnimationFrame` to animate from 0 to the target value over ~800ms
- Apply an ease-out curve for natural feel
- Only animate on initial mount (not on re-renders)

### Feature 4: Employer Candidate Notes (Medium Priority)
Already implemented in `ApplicantTabs.tsx` via the `application_notes` table and Note dialog. No additional work needed -- the feature exists and is functional.

### Feature 5: Dark Mode Toggle Persistence (Medium Priority)
**Files modified:** `src/main.tsx`, `src/components/dashboard/DashboardHeader.tsx`, `src/components/dashboard/EmployerHeader.tsx`

Implementation:
- Wrap the `<App />` in `main.tsx` with `<ThemeProvider attribute="class" defaultTheme="system" storageKey="hire-theme">` from `next-themes`
- Update `DashboardHeader.tsx` Moon button to use `useTheme()` hook, toggle between light/dark, show Sun/Moon icon accordingly
- Do the same in `EmployerHeader.tsx` if it has a theme button
- `next-themes` automatically persists to `localStorage`

### Feature 6: Job Expiry Countdown Badge (Medium Priority)
**Files modified:** `src/pages/EmployerDashboard.tsx`, `src/components/dashboard/ActiveJobsTable.tsx`

The `JobExpiryBadge` component already exists at `src/components/employer/JobExpiryBadge.tsx`. Integration:
- Import and render `JobExpiryBadge` in the job cards within the employer dashboard's jobs section
- Add it to `ActiveJobsTable.tsx` rows where `expires_at` is available
- The jobs table has an `expires_at` column -- use it directly

### Feature 7: Candidate Profile PDF Export (Medium Priority)
**Files created:** `src/components/candidate/ProfilePDFExport.tsx`
**Files modified:** `src/pages/CandidateDetail.tsx`

Implementation:
- Create a "Download PDF" button component using `html2canvas` + `jsPDF` (both already installed)
- Capture the profile content area as a canvas and convert to PDF
- Add the button to the candidate's own profile view (when `isOwnProfile` is true) and to the sidebar actions
- Style: a simple "Download as PDF" button with a Download icon

### Feature 8: Onboarding Tour (High Priority)
**Files created:** `src/components/onboarding/OnboardingTour.tsx`
**Files modified:** `src/pages/CandidateDashboard.tsx`, `src/pages/EmployerDashboard.tsx`

Implementation:
- Build a lightweight tooltip-based tour using absolute-positioned highlight overlays
- Define tour steps per role (candidate: 5 steps covering stats, sidebar, profile edit, resume, map; employer: 5 steps covering stats, post job, applicants, tasks, analytics)
- Track completion in `localStorage` key `onboarding-complete-{userId}`
- Show only on first visit (when key is absent)
- Each step: a floating card with title, description, "Next"/"Skip"/"Done" buttons
- No external dependency needed -- pure React + Tailwind positioned elements

### Feature 9: Bulk Task Assignment (Medium Priority)
**Files modified:** `src/components/employer/TaskManager.tsx`

Implementation:
- Change the "Assign Task" dialog's Candidate select from single to multi-select using checkboxes
- When multiple candidates are selected, insert one task row per candidate in a `Promise.all` loop
- Update the dialog title to "Assign Task to X candidate(s)"
- Add a "Select All" option at the top of the candidate list

### Feature 10: Mobile Bottom Nav for Dashboards (High Priority)
**Files created:** `src/components/dashboard/DashboardBottomNav.tsx`
**Files modified:** `src/pages/CandidateDashboard.tsx`, `src/pages/EmployerDashboard.tsx`

Implementation:
- Create a new `DashboardBottomNav` component similar to the existing `BottomNavBar` but tailored for dashboard pages
- Candidate nav items: Home (dashboard), Applications, Messages, Profile
- Employer nav items: Home (dashboard), Jobs, Messages, Profile
- Fixed at bottom, visible only on `md:hidden`
- Active state matches the current `activeSection`
- Clicking items calls `onItemClick` to switch dashboard sections or open modals
- Add `pb-16 md:pb-0` to the main content area to prevent content from being hidden behind the nav

---

## Technical Summary

| # | Feature | Files | DB Changes |
|---|---------|-------|-----------|
| Fix 1 | Duplicate Settings | `EmployerDashboard.tsx` | None |
| Fix 2 | Education dates | `CandidateDetail.tsx` | None |
| Fix 3 | Dark mode | `main.tsx`, `DashboardHeader.tsx`, `EmployerHeader.tsx` | None |
| 1 | Application Timeline | `JobActivityTabs.tsx` | None |
| 2 | Email Notifications | New edge function, `SecuritySettings.tsx` | New `notification_preferences` table |
| 3 | Stats Animation | `DashboardStatCard.tsx` | None |
| 4 | Candidate Notes | Already done | None |
| 5 | Dark Mode Persist | `main.tsx`, headers | None |
| 6 | Job Expiry Badge | `EmployerDashboard.tsx`, `ActiveJobsTable.tsx` | None |
| 7 | PDF Export | New component, `CandidateDetail.tsx` | None |
| 8 | Onboarding Tour | New component, both dashboards | None |
| 9 | Bulk Task Assign | `TaskManager.tsx` | None |
| 10 | Mobile Bottom Nav | New component, both dashboards | None |
