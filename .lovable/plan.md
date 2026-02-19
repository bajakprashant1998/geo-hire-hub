

# Comprehensive Dashboard Enhancement Plan

## Overview

This plan covers 5 feature areas: Public Profile preview (already partially done), real-time notifications, mobile responsiveness improvements, profile completion prompts, and task search/filter for employers.

---

## 1. Public Profile Tab (Already Implemented -- Verify Only)

Both `CandidateDashboard.tsx` and `EmployerDashboard.tsx` already have the "Public Profile" sidebar item and render `CandidateDetail`/`EmployerDetail` with an `id` prop. Both detail components already accept an optional `id` prop and implement `isOwnProfile` logic. **No changes needed.**

---

## 2. Real-Time Notifications

Push live updates for new messages, task assignments, and application status changes using Supabase realtime subscriptions.

### Database Migration
- Enable realtime on `notifications`, `tasks`, and `applications` tables:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
```

### New Hook: `src/hooks/useRealtimeDashboard.ts`
- Subscribe to `postgres_changes` on 3 tables filtered by user context
- On `notifications` INSERT -> show a toast and increment notification badge
- On `tasks` INSERT (where `candidate_id` matches) -> toast "New task assigned" 
- On `applications` UPDATE (status change) -> toast "Application status updated to {status}"
- Return a `refreshTrigger` counter that dashboards use to re-fetch stats

### Integration
- **CandidateDashboard.tsx**: Call `useRealtimeDashboard({ candidateId, userId })`, re-fetch stats when `refreshTrigger` changes
- **EmployerDashboard.tsx**: Call `useRealtimeDashboard({ employerId, userId })`, subscribe to application inserts for employer's jobs

---

## 3. Mobile Responsiveness Audit

### CandidateDashboard.tsx
- Stats grid: already `grid-cols-2 lg:grid-cols-4` -- good
- Section content card: reduce padding on mobile from `p-3 sm:p-4 md:p-6` (already correct)
- "Back to Dashboard" button: make it sticky on mobile with a bottom safe-area offset
- Sidebar items: already have `touch-target-sm touch-scale` -- good

### EmployerDashboard.tsx
- Job list in "jobs" section: currently `lg:grid-cols-3` -- add `gap-3 sm:gap-6` and stack on mobile
- Job card action buttons: switch to icon-only on small screens (already partially done with `hidden sm:inline`)
- Stats grid: already responsive

### DashboardSidebar.tsx
- Already handles mobile overlay + fixed positioning -- good
- Add `safe-area-inset-bottom` padding to the sidebar footer for phones with notches

### DashboardHeader components
- Already responsive with mobile menu button -- good

### Changes Summary
| File | Change |
|------|--------|
| `src/components/dashboard/DashboardSidebar.tsx` | Add `pb-safe` to sidebar footer |
| `src/pages/CandidateDashboard.tsx` | Minor padding tweaks, sticky back button on mobile |
| `src/pages/EmployerDashboard.tsx` | Improve job section gap spacing on mobile |

---

## 4. Profile Completion Prompts

### Candidate Dashboard
Create a new component `src/components/candidate/ProfileCompletionPrompts.tsx` that shows actionable nudge cards on the dashboard home when key items are missing:

- **No Resume**: "Upload your resume to get noticed by employers" with a CTA button linking to the resume section
- **No Audio Resume**: "Record a voice intro to stand out" with a CTA to audio-resume section
- **No Photo**: "Add a profile photo" linking to edit profile
- **No Skills**: "Add your skills to match with jobs" linking to edit profile
- **No Location**: "Set your location to find nearby jobs" linking to edit profile

Each prompt is a compact card with an icon, message, and action button. Dismissed prompts are stored in `localStorage` so they don't reappear.

### Employer Dashboard
Create `src/components/employer/ProfileCompletionPrompts.tsx`:

- **No Description**: "Add a company description to attract candidates"
- **No Office Photo**: "Upload an office photo to build trust"
- **No Tax ID**: "Add your Tax ID for verification"
- **No Jobs Posted**: "Post your first job to start hiring"

### Integration
- Render prompts on the dashboard home view (below stats, above messages preview)
- Show max 2-3 prompts at a time, prioritized by importance
- Each prompt has a dismiss (X) button

---

## 5. Search/Filter for Employer Task Lists

### TaskManager.tsx Enhancements
Add a search bar and candidate filter dropdown above the existing status tabs:

- **Search Input**: Filter tasks by title or description (client-side text search)
- **Candidate Filter**: A `Select` dropdown populated from the existing `candidates` state, filtering tasks by `candidate_id`
- **Priority Filter**: A `Select` dropdown to filter by priority (all / high / medium / low)
- **Combined Filtering**: All filters work together with the existing status tab filter

### Changes
| File | Change |
|------|--------|
| `src/components/employer/TaskManager.tsx` | Add search input, candidate select, priority select above tabs. Update `filteredTasks` logic to chain all filters. |

---

## Technical Details

| # | Feature | Files Modified/Created | DB Changes |
|---|---------|----------------------|------------|
| 1 | Public Profile | None (already done) | None |
| 2 | Real-time Notifications | New: `src/hooks/useRealtimeDashboard.ts`. Modified: `CandidateDashboard.tsx`, `EmployerDashboard.tsx` | Enable realtime on `notifications`, `tasks`, `applications` |
| 3 | Mobile Responsiveness | `DashboardSidebar.tsx`, `CandidateDashboard.tsx`, `EmployerDashboard.tsx` | None |
| 4 | Profile Completion Prompts | New: `src/components/candidate/ProfileCompletionPrompts.tsx`, `src/components/employer/ProfileCompletionPrompts.tsx`. Modified: `CandidateDashboard.tsx`, `EmployerDashboard.tsx` | None |
| 5 | Task Search/Filter | `src/components/employer/TaskManager.tsx` | None |

