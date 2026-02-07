
# Comprehensive Dashboard and Admin Enhancement Plan

## Audit Summary

After scanning the entire codebase across all three dashboards (Candidate, Employer, Admin), here is what exists, what's incomplete, and what needs to be built.

---

## Current State Assessment

### Candidate Dashboard - Gaps Found
- **Profile Views stat uses random number** (`Math.random()`) instead of real data
- **Interviews section** reuses `JobActivityTabs` instead of showing the dedicated `InterviewCalendar` component that was already created
- **No saved jobs section** - sidebar has "Saved Jobs" but `renderSectionContent` just redirects to `JobActivityTabs`
- **Resume section** not accessible from sidebar (no 'resume' in sidebar items)
- **Notification Center** exists but not linked in sidebar navigation

### Employer Dashboard - Gaps Found
- **Profile Views stat uses random fallback** (`Math.random()`)
- **Analytics section** just shows `PlanUsagePanel` instead of job performance metrics
- **No job templates feature** for saving/reusing job descriptions
- **No candidate comparison tool**
- **Interview section** uses `InterviewScheduler` (good) but no calendar view

### Admin Panel - Gaps Found
- **No Application Management page** - can't view/manage all applications across the platform
- **No Platform Notifications/Announcements system** - no way to broadcast messages to users
- **No Content Moderation queue** - relies only on job moderation status, no unified queue
- **AdminSettings** is functional but missing: feature flags, email template config, platform branding
- **AdminUsers** shows `custom_email_verified` which is now outdated (switched to native Supabase auth)
- **No pagination** on any admin table - will break with scale
- **AdminDashboard** has hardcoded "quick stats" trend data for some cards

---

## Implementation Plan

### Phase 1: Fix Existing Bugs and Data Gaps

**1.1 Candidate Dashboard Fixes**
- Replace `Math.random()` profile views with actual view count from candidates table or a computed metric
- Wire "Scheduled Interviews" sidebar item to render `InterviewCalendar` component (already built) instead of `JobActivityTabs`
- Add "Resume" to sidebar items and connect it properly
- Add "Notifications" to sidebar items

**1.2 Employer Dashboard Fixes**
- Replace `Math.random()` profile views fallback with real view_count aggregation
- Create a proper analytics sub-section with job performance charts (views, applications per job, time-to-fill)
- Wire the InterviewScheduler to show actual interview data

**1.3 Admin User Management Fix**
- Update `AdminUsers.tsx` to check `email_confirmed_at` via auth metadata instead of the deprecated `custom_email_verified` field

### Phase 2: New Admin Features

**2.1 Application Management Page (`/admin/applications`)**
- New file: `src/pages/admin/AdminApplications.tsx`
- View all applications across the platform
- Filter by status (applied, shortlisted, interviewed, hired, rejected)
- Filter by date range, job, employer
- Bulk status updates
- Application analytics (conversion rates, average time in each stage)

**2.2 Platform Notifications System (`/admin/notifications`)**
- New file: `src/pages/admin/AdminNotifications.tsx`
- Database table: `platform_notifications` (title, message, type, target_audience, active, expires_at)
- Create/edit/delete platform-wide announcements
- Target specific audiences (all users, candidates only, employers only)
- Set expiry dates for time-limited notices
- Display notifications in user dashboards via a new `PlatformNotificationBanner` component

**2.3 Content Moderation Queue (`/admin/moderation`)**
- New file: `src/pages/admin/AdminModeration.tsx`
- Database table: `moderation_queue` (content_type, content_id, reason, status, reviewed_by, reviewed_at)
- Unified view of flagged jobs, profiles, and messages
- Quick-action buttons: approve, reject, escalate
- Auto-flag rules configuration (keyword filtering)

**2.4 Admin Settings Enhancement**
- Add feature flags section (toggle platform features on/off)
- Add platform info section (site name, support email, social links)
- Add maintenance mode toggle

### Phase 3: Dashboard UI/UX Polish

**3.1 Candidate Dashboard Enhancements**
- Add a "Saved Jobs" section that queries saved/bookmarked jobs from the database
- Add profile completeness guided steps (step-by-step checklist with quick-edit modals)
- Integrate `InterviewCalendar` component into the dashboard home as a compact widget

**3.2 Employer Dashboard Enhancements**
- Create a job analytics card showing views/applications trends per job using Recharts
- Add "Job Templates" feature: save job descriptions as templates, quick-duplicate existing jobs
- Add candidate comparison view for side-by-side skill scoring

**3.3 Admin Dashboard Enhancement**
- Add real trend data for all stat cards (replace hardcoded arrays)
- Add "Platform Health" section showing active users in last 24h, error rates
- Add recent signups list with quick-approve actions

### Phase 4: Cross-Dashboard Connectivity

**4.1 Admin-to-User Dashboard Links**
- From Admin Users page, add "View as" links to open candidate/employer detail pages
- From Admin Jobs page, add direct links to employer dashboards
- From Admin Applications page, link to both job detail and candidate detail

**4.2 Notification Integration**
- Show platform notifications from admin in both candidate and employer dashboards
- Add a `PlatformNotificationBanner` component that fetches active notifications
- Display at the top of dashboard pages

**4.3 Pagination for All Admin Tables**
- Add cursor-based pagination to AdminUsers, AdminEmployers, AdminJobs, AdminCandidates, AdminMessages
- Show page count and navigation controls
- Maintain filter state across pages

---

## Database Changes Required

```sql
-- Platform notifications table
CREATE TABLE platform_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'candidates', 'employers')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

-- Content moderation queue
CREATE TABLE moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('job', 'profile', 'message')),
  content_id UUID NOT NULL,
  reported_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feature flags table
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

RLS policies will be added for admin-only access on all new tables.

---

## Files to Create
- `src/pages/admin/AdminApplications.tsx` - Application management
- `src/pages/admin/AdminNotifications.tsx` - Notification center
- `src/pages/admin/AdminModeration.tsx` - Content moderation queue
- `src/components/admin/PaginationControls.tsx` - Reusable pagination
- `src/components/dashboard/PlatformNotificationBanner.tsx` - User-facing notification display
- `src/components/employer/JobAnalyticsDashboard.tsx` - Per-job analytics charts

## Files to Modify
- `src/pages/CandidateDashboard.tsx` - Fix random stats, add InterviewCalendar, add sidebar items
- `src/pages/EmployerDashboard.tsx` - Fix random stats, add analytics section
- `src/pages/admin/AdminUsers.tsx` - Fix email verification status check
- `src/pages/admin/AdminSettings.tsx` - Add feature flags and platform config
- `src/pages/admin/AdminDashboard.tsx` - Add real trend data, platform health
- `src/components/admin/AdminLayout.tsx` - Add new nav items for Applications, Notifications, Moderation
- `src/App.tsx` - Add routes for new admin pages

## Route Additions
- `/admin/applications` - AdminApplications
- `/admin/notifications` - AdminNotifications
- `/admin/moderation` - AdminModeration
