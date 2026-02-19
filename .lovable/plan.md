

# Fix 7 Remaining Issues + Add 6 Feature Suggestions

## Part 1: Fix Remaining Issues

### Issue 1 - Employer Notification Count Hardcoded (line 473)
`notificationCount={0}` is hardcoded in `EmployerDashboard.tsx`.

**Fix**: Fetch unread notification count from the `notifications` table in `fetchEmployerData()`, store it in state, and pass the real value to `EmployerHeader`.

**File**: `src/pages/EmployerDashboard.tsx`
- Add `notificationCount` to the stats state (default `0`)
- In `fetchEmployerData`, query `notifications` where `user_id = user.id AND is_read = false`
- Replace `notificationCount={0}` with `notificationCount={stats.notificationCount}`

---

### Issue 2 - SecuritySettings useState Side Effect (line 35)
`useState(() => { ... })` is used to run an async fetch -- this is incorrect. `useState` initializers should be synchronous and return the initial value.

**Fix**: Replace `useState(() => { ... })` with `useEffect(() => { ... }, [user])`.

**File**: `src/components/candidate/SecuritySettings.tsx`

---

### Issue 3 - Dashboard Stat Subtitles Are Fake Multipliers
Both dashboards use computed fake subtitles like `+${Math.floor(stats.applications * 0.2)} this week` and `"-3% vs last week"`.

**Fix**: Remove fake growth numbers and show simple, honest subtitles:
- "Total Applied" -> subtitle: "all time"
- "Profile Views" -> subtitle: "all time" 
- "Total Applications" -> subtitle: "across all jobs"
- "Scheduled Interviews" -> subtitle: "upcoming"
- Employer "Profile Views" -> subtitle: "total job views"

**Files**: `src/pages/CandidateDashboard.tsx`, `src/pages/EmployerDashboard.tsx`

---

### Issue 4 - Employer "Profile Views" Shows job view_count, Not Actual Profile Views
`stats.profileViews` is set to `totalViews` which is `jobsWithCounts.reduce(sum + job.view_count)` -- that's job views, not employer profile views.

**Fix**: Query `profile_views` table for the employer's profile ID instead.

**File**: `src/pages/EmployerDashboard.tsx` -- in `fetchEmployerData`, replace the `totalViews` calculation with a real `profile_views` count query.

---

### Issue 5 - `text-white` Used Directly (line 258)
`text-white` is hardcoded in the employer login prompt card instead of `text-primary-foreground`.

**Fix**: Replace `text-white` with `text-primary-foreground`.

**File**: `src/pages/EmployerDashboard.tsx`

---

### Issue 6 - `shadow-google` Class Usage
`shadow-google` is used across many candidate components. This is actually defined in `tailwind.config.ts` as a custom shadow, so it IS part of the design system. No change needed -- this is a false positive. Keeping as-is.

---

### Issue 7 - Hardcoded "Enterprise Plan" Label (line 469)
`planName="Enterprise Plan"` is hardcoded instead of fetching the real plan name.

**Fix**: Fetch the employer's active subscription plan name from `employer_subscriptions` joined with `employer_plans`, and pass it to `EmployerHeader`.

**File**: `src/pages/EmployerDashboard.tsx`
- Add `planName` to state (default `"Free Plan"`)
- In `fetchEmployerData`, query `employer_subscriptions` with `employer_plans` join
- Pass real `planName` to `EmployerHeader`

---

## Part 2: New Feature Suggestions

### Feature 1 - Employer Security Settings
Currently only candidates have security settings (password change, 2FA placeholder, delete account). Employers have no equivalent.

**Fix**: Add a "Security" sidebar item to the employer dashboard that renders the existing `SecuritySettings` component (it's generic enough to work for both roles).

**File**: `src/pages/EmployerDashboard.tsx`
- Add `{ icon: Shield, label: 'Security', value: 'security' }` to `sidebarItems`
- Add `case 'security': return <SecuritySettings />;` to `renderSectionContent`

---

### Feature 2 - "Back to Dashboard" Link on Browse Jobs
When a logged-in user visits `/browse-jobs`, there's no easy way back to their dashboard.

**Fix**: Add a contextual "Back to Dashboard" button at the top of the BrowseJobs page when the user is authenticated.

**File**: `src/pages/BrowseJobs.tsx`

---

### Feature 3 - Real "Next Interview" Subtitle
The candidate dashboard shows "Next: Tomorrow" as a hardcoded subtitle for upcoming interviews.

**Fix**: Query the next scheduled interview date and display the actual date or relative time (e.g., "Next: Feb 21").

**File**: `src/pages/CandidateDashboard.tsx`
- In `fetchCandidate`, query `interviews` for the next scheduled interview
- Compute subtitle based on actual date

---

### Feature 4 - Candidate "Unread Messages" Subtitle Fix
Shows `${Math.min(2, stats.unreadMessages)} urgent` which is meaningless.

**Fix**: Change to a simple subtitle like "new messages" or "all read".

**File**: `src/pages/CandidateDashboard.tsx`

---

### Feature 5 - Email Change in Security Settings
Users currently cannot change their email address.

**Fix**: Add an "Update Email" section to `SecuritySettings.tsx` that calls `supabase.auth.updateUser({ email: newEmail })`.

**File**: `src/components/candidate/SecuritySettings.tsx`

---

### Feature 6 - WhatsApp Button Verification
Ensure WhatsApp button works on candidate/employer detail pages by verifying the `whatsapp_number` field is being fetched and passed correctly.

**Files**: `src/pages/CandidateDetail.tsx`, `src/pages/EmployerDetail.tsx` -- verify data flow, no changes expected if already correct.

---

## Technical Details

### File Change Summary

| Action | File | Changes |
|--------|------|---------|
| Edit | `src/pages/EmployerDashboard.tsx` | Fix notification count, profile views, plan name, text-white, stat subtitles, add security sidebar item |
| Edit | `src/components/candidate/SecuritySettings.tsx` | Fix useState side effect -> useEffect, add email change section |
| Edit | `src/pages/CandidateDashboard.tsx` | Fix stat subtitles, fetch real next interview date |
| Edit | `src/pages/BrowseJobs.tsx` | Add "Back to Dashboard" link for logged-in users |

### No Database Changes Required
All fixes use existing tables (`notifications`, `profile_views`, `employer_subscriptions`, `employer_plans`, `interviews`).

