

## Plan: Candidate Dashboard Overhaul

### Task 1: Redesign Bento Grid Layout with Glassmorphism (Home View)
**File: `src/pages/CandidateDashboard.tsx`**

Replace the current linear layout (stats → messages → interviews → AI matches) with a proper bento grid matching the employer dashboard pattern:

- Use `grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6` layout
- **Row 1**: 4 stat cards (Applied, Profile Views, Messages, Interviews) — keep existing `DashboardStatCard`
- **Row 2**: Welcome/Hero card (lg:col-span-2, hidden on mobile) with gradient background, user greeting, and contextual status message + CTA button
- **Row 3**: Quick Actions panel (full-width col-span-6) with 8 shortcuts in glassmorphism card:
  - Find Jobs, My Applications, Messages, Interviews, Resume, AI Match, Auto Apply, Career Buddy
  - Each with icon, color-coded bg, hover-lift animation, staggered framer-motion entrance
- **Row 4**: Messages Preview (col-span-4) + Upcoming Interview (col-span-2) — both wrapped in glassmorphism containers with decorative blur orbs
- **Row 5**: AI Job Matches + Job Match Carousel below the grid

All containers get: `bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl` with absolute positioned blur orbs.

### Task 2: Upgrade Chat Section to Match Employer Dashboard
**File: `src/pages/CandidateDashboard.tsx`**

- The `messages` section already renders `<DashboardMessaging />` which is the same component used by the employer — this is already consistent.
- No changes needed here; the component is shared.

### Task 3: Enhance Notification, Resume, and Section Cards
**File: `src/components/candidate/NotificationCenter.tsx`**

Upgrade the notification card:
- Add filter tabs: All / Unread / Application Updates
- Add "Clear All" button alongside "Mark all read"
- Group notifications by date (Today, Yesterday, Earlier)
- Add empty state animation with framer-motion
- Upgrade card wrapper with glassmorphism: `bg-card/50 backdrop-blur-2xl`

### Task 4: Add All Feature Shortcuts on Dashboard Home
**File: `src/pages/CandidateDashboard.tsx`**

Expand `quickActions` from 4 mobile-only buttons to a full 8-item grid (visible on all screens), matching employer dashboard pattern:
- Find Jobs (navigate to `/`)
- My Applications (`jobs`)
- Messages (`messages`)
- Interviews (`interviews`)
- Resume (`resume`)
- AI Match (`ai-resume`)
- Auto Apply (`auto-apply`)
- Career Buddy (`career-buddy`)

Remove the mobile-only constraint (`sm:hidden`) and use the same responsive grid as employer: `grid-cols-4 lg:grid-cols-8`.

### Implementation Summary

**Files to modify:**
1. `src/pages/CandidateDashboard.tsx` — Bento grid layout, quick actions grid, glassmorphism wrappers, hero card
2. `src/components/candidate/NotificationCenter.tsx` — Filter tabs, date grouping, enhanced styling

