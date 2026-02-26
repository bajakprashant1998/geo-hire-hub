

## Two-Way Interview Scheduling System — Implementation Plan

This is a large-scope upgrade touching database schema, RLS policies, both dashboards, and notifications. Here's the structured plan:

---

### 1. Database Migration

Add new columns to `interviews` table to support two-way scheduling:

| Column | Type | Purpose |
|--------|------|---------|
| `requested_by` | text ('candidate' / 'employer') | Who initiated the interview |
| `candidate_message` | text | Optional message from candidate |
| `employer_notes` | text | Internal employer notes |
| `confirmed_by_candidate` | boolean (default false) | Candidate confirmation |
| `confirmed_by_employer` | boolean (default false) | Employer confirmation |
| `rescheduled_from` | uuid (nullable, FK → interviews) | Link to original if rescheduled |
| `cancelled_by` | text (nullable) | Who cancelled |
| `cancel_reason` | text (nullable) | Cancellation reason |
| `completed_at` | timestamptz (nullable) | When marked complete |

Update `status` default flow to support: `requested → pending_confirmation → confirmed → rescheduled → rejected → completed → cancelled`

Add new RLS policies:
- Candidates can INSERT interviews (for requesting) — restricted to jobs they've applied to
- Candidates can UPDATE their own interviews (for confirm/cancel only)

Add anti-spam validation trigger:
- Max 2 interview requests per candidate per job
- 48-hour cooldown between requests
- Block duplicate date/time requests per candidate
- Candidate can only request if they have an active application

---

### 2. Candidate Side — New `CandidateInterviewManager` Component

Replace simple `InterviewCalendar` with a full-featured component containing:

**Tabs:**
- **Upcoming** — Confirmed interviews with Join/Details buttons
- **Requested** — Pending requests sent by candidate, with status badges
- **Past** — Completed/cancelled interviews
- **Request Interview** — Form to request interview for an applied job

**Request Interview Flow:**
1. Select from applied jobs (dropdown populated from `applications` table)
2. Calendar date picker + time slot selector
3. Interview type selector (Video / Phone / In-person / Assessment)
4. Optional message textarea
5. Submit → creates interview with `status: 'requested'`, `requested_by: 'candidate'`

**Confirmation Flow:**
- When employer schedules an interview, candidate sees "Confirm / Reschedule / Decline" buttons
- Confirming sets `confirmed_by_candidate = true`, status → `confirmed`

**Stats row:** Upcoming / Pending / Completed / Cancelled counts

---

### 3. Employer Side — Upgrade `InterviewScheduler` Component

Enhance existing component with:

**New Tab: "Requests"**
- Shows candidate-initiated interview requests
- Each card has: Accept / Reject / Reschedule buttons
- Accept → sets date/time, adds meeting link, status → `confirmed`

**Enhanced Schedule Dialog:**
- Add internal notes field
- Add "Online Assessment" interview type option
- Show conflict warning if time slot already has an interview

**Confirmation tracking:**
- After employer schedules, show `confirmed_by_candidate` status
- Badge: "Awaiting Candidate Confirmation" / "Confirmed"

**Reschedule flow:**
- Creates new interview linked via `rescheduled_from`
- Original marked as `rescheduled`

---

### 4. Notification Integration

Create notifications for interview events using existing `notifications` table:

| Event | Recipient | Message |
|-------|-----------|---------|
| Interview requested | Employer | "Candidate X requested an interview for Job Y" |
| Interview scheduled | Candidate | "Employer scheduled an interview for Job Y" |
| Interview confirmed | Both | "Interview confirmed for Date/Time" |
| Interview rejected | Requester | "Interview request was declined" |
| Interview rescheduled | Other party | "Interview has been rescheduled" |
| Interview cancelled | Other party | "Interview was cancelled" |

Also trigger email notifications via existing `send-notification-email` edge function.

---

### 5. Dashboard Integration

- **Candidate Dashboard:** Replace `InterviewCalendar` usage with new `CandidateInterviewManager`
- **Employer Dashboard:** Upgrade `InterviewScheduler` in-place with request management tab
- Both get real-time updates via Supabase Realtime on `interviews` table

---

### Technical Details

**Files to create:**
- `src/components/candidate/CandidateInterviewManager.tsx` — Full candidate interview UI with tabs, request form, confirmation flow

**Files to modify:**
- `src/components/employer/InterviewScheduler.tsx` — Add requests tab, reschedule, conflict detection, confirmation tracking
- `src/components/candidate/InterviewCalendar.tsx` — Keep as sub-component for calendar view within new manager
- `src/pages/CandidateDashboard.tsx` — Wire up new component
- `src/pages/EmployerDashboard.tsx` — No route changes needed, InterviewScheduler upgrade is in-place

**Migration:** One SQL migration for schema changes + RLS + anti-spam trigger + realtime

**Estimated scope:** ~4 tasks, significant but modular implementation

