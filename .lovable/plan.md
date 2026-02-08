
# Pending Tasks Completion Plan

## Audit Results - What's Done vs What's Still Needed

### Already Completed
- Candidate Dashboard: Real stats (no more Math.random), InterviewCalendar wired, sidebar items (Resume, Notifications, Saved Jobs) added
- Employer Dashboard: Real profile views from job view_count aggregation
- Admin: Routes for Applications, Moderation, Notifications all created and wired
- Admin: Feature flags in Settings page working
- Admin: PaginationControls component created and used in AdminApplications and AdminModeration
- PlatformNotificationBanner on Candidate Dashboard
- SavedJobsSection component created

### Still Pending

#### 1. Employer Dashboard - Missing PlatformNotificationBanner
The employer dashboard does not show platform notifications. The candidate dashboard has it but employer dashboard was missed.

#### 2. Pagination Missing on Most Admin Tables
Only AdminApplications and AdminModeration use PaginationControls. These admin pages still load ALL records without pagination:
- AdminUsers (loads all profiles)
- AdminEmployers (loads all employers)
- AdminJobs (loads all jobs)
- AdminCandidates (loads all candidates)
- AdminMessages (loads 100 conversations, but no pagination UI)

#### 3. Employer Dashboard - Analytics Section Still Just Shows PlanUsagePanel
The "Analytics" sidebar item in the employer dashboard renders only `PlanUsagePanel`. It needs a proper job analytics view with charts showing views/applications trends per job.

#### 4. Admin Dashboard - Quick Actions Link to Moderation Queue
The AdminDashboard "Moderate Jobs" quick action links to `/admin/jobs?moderation=pending` but there is now a dedicated `/admin/moderation` page that should also be linked.

#### 5. Admin-to-User Dashboard Links Missing
No "View as" or "View Profile" links from admin tables to the candidate/employer detail pages.

---

## Implementation Steps

### Step 1: Add PlatformNotificationBanner to Employer Dashboard
- Import and add `<PlatformNotificationBanner userType="employer" />` at the top of the employer dashboard home view

### Step 2: Add Pagination to Admin Tables
Add server-side pagination with `PaginationControls` to:
- **AdminUsers**: Add page state, use `.range()` with `count: 'exact'`, render PaginationControls
- **AdminEmployers**: Same pattern
- **AdminJobs**: Same pattern
- **AdminCandidates**: Same pattern
- **AdminMessages**: Same pattern

Each table will use PAGE_SIZE of 20, with range-based queries and total count.

### Step 3: Create Employer Job Analytics Section
- Create `src/components/employer/JobAnalyticsDashboard.tsx`
- Show per-job performance: views, application counts, status breakdown
- Use Recharts (already installed) for a bar chart of views and applications per job
- Wire it into the employer dashboard `renderSectionContent` under `case 'analytics'` alongside the existing PlanUsagePanel

### Step 4: Add Admin-to-User Links
- In AdminUsers: Add a "View Profile" dropdown item that links to `/candidates/:id` or `/employers/:id` based on user_type
- In AdminEmployers: Add "View Detail" link to `/employers/:id`
- In AdminCandidates: Add "View Detail" link to `/candidates/:id`
- In AdminJobs: Add "View Job" link to `/jobs/:id`

### Step 5: Update Admin Dashboard Quick Actions
- Add a link to the moderation queue (`/admin/moderation`) in the quick actions section

---

## Technical Details

### Files to Create
- `src/components/employer/JobAnalyticsDashboard.tsx` - Recharts-based job performance charts

### Files to Modify
- `src/pages/EmployerDashboard.tsx` - Add PlatformNotificationBanner import and usage, wire JobAnalyticsDashboard into analytics section
- `src/pages/admin/AdminUsers.tsx` - Add pagination, add view profile links
- `src/pages/admin/AdminEmployers.tsx` - Add pagination, add view detail links
- `src/pages/admin/AdminJobs.tsx` - Add pagination, add view job links
- `src/pages/admin/AdminCandidates.tsx` - Add pagination, add view detail links
- `src/pages/admin/AdminMessages.tsx` - Add pagination
- `src/pages/admin/AdminDashboard.tsx` - Add moderation queue quick action link
