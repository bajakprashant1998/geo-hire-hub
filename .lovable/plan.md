

# Pending Tasks Cleanup + Video Call Interview Integration

## Pending Items Found

After auditing the full codebase, the previous plan's tasks are **mostly complete**:

**Already Done:**
- Pagination on ALL admin tables (AdminUsers, AdminEmployers, AdminJobs, AdminCandidates, AdminMessages, AdminApplications, AdminModeration)
- ExternalLink/View Profile links on all admin tables
- PlatformNotificationBanner on Employer Dashboard
- JobAnalyticsDashboard component created and wired into Employer analytics section
- AdminDashboard moderation queue quick action link added
- Real stats on Candidate Dashboard (no Math.random for profile views)
- Real stats on Employer Dashboard (real view_count aggregation)

**Still Pending (Bugs/Cleanup):**

1. **Math.random() still used in 5 places:**
   - `InterviewScheduler.tsx` line 209: Video Calls count uses `Math.random()`
   - `EmployerInterviewsCard.tsx` lines 59-64: Random interview types, dates, times
   - `InterviewCalendar.tsx` line 84: Random interview type (video vs in-person)
   - `CandidateDetail.tsx` lines 522, 527, 609: Profile views and messages use random numbers
   - `EmployerDetail.tsx` line 390: Views use random number

2. **No proper `interviews` table** - The platform uses `applications.status = 'shortlisted'` as a proxy for interviews. There is no actual interviews table to store date, time, type, meeting link, or notes.

3. **"Join Call" / "Start Call" buttons are non-functional** - They exist in EmployerInterviewsCard and InterviewScheduler but do nothing.

---

## New Feature: Video Call Interview System

Since there is no backend video infrastructure (WebRTC server, TURN/STUN), the most practical approach is to generate unique meeting room links using a free, embeddable service pattern. We will create a lightweight video call page using a unique room ID derived from the interview ID, allowing both parties to join the same room.

### Approach
- Create an `interviews` database table to store scheduled interview details (date, time, type, meeting link, notes)
- Create a `/video-call/:interviewId` page that embeds a peer-to-peer video call using the browser's built-in `getUserMedia` API with a simple "waiting room" UI
- Since true multi-party WebRTC requires a signaling server, we will generate a Jitsi Meet link (free, no account needed) as the meeting URL for each interview
- Update "Join Call" / "Start Call" buttons to navigate to the video call or open the meeting link

---

## Implementation Steps

### Step 1: Create `interviews` Table
```sql
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id),
  employer_id UUID NOT NULL REFERENCES employers(id),
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT NOT NULL,
  interview_type TEXT NOT NULL DEFAULT 'video',
  meeting_link TEXT,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```
- Add RLS policies for employer (create/read/update) and candidate (read own)
- Add a validation trigger for status values
- Auto-generate a Jitsi meeting link on insert

### Step 2: Update InterviewScheduler
- On "Schedule Interview", insert into the `interviews` table (not just update application status)
- Auto-generate a meeting link: `https://meet.jit.si/hireforjob-{interviewId}`
- Show real scheduled date/time from the interviews table instead of mock data
- Fix Video Calls stat count (remove Math.random)
- Make "Start Call" button open the meeting link

### Step 3: Update InterviewCalendar (Candidate Side)
- Query from `interviews` table instead of inferring from shortlisted applications
- Show real date, time, type from the database
- Remove Math.random for interview type
- Make "Join" button open the meeting link

### Step 4: Update EmployerInterviewsCard
- Query from `interviews` table for real upcoming interviews
- Remove all Math.random for types, dates, times
- Make "Join Call" button open the meeting link

### Step 5: Create Video Call Page
- New page: `src/pages/VideoCall.tsx`
- Route: `/video-call/:interviewId`
- Fetches interview details from the database
- Shows interview info (candidate name, job title, scheduled time)
- Provides a prominent "Join Meeting" button that opens the Jitsi link
- Shows a pre-call checklist (camera, microphone permissions)
- Both employer and candidate can access this page

### Step 6: Fix Remaining Math.random() Usage
- `CandidateDetail.tsx`: Replace random views/messages with real counts from `job_views` and `messages` tables
- `EmployerDetail.tsx`: Replace random views with real count from `job_views`

### Step 7: Add Route
- Add `/video-call/:interviewId` route to App.tsx

---

## Technical Details

### Database Table
- `interviews` with foreign keys to applications, jobs, candidates, employers
- RLS: employers can CRUD their own interviews; candidates can read interviews where they are the candidate
- Meeting link auto-generated as `https://meet.jit.si/hireforjob-{uuid}`

### Files to Create
- `src/pages/VideoCall.tsx` - Pre-call lobby + Jitsi redirect

### Files to Modify
- `src/components/employer/InterviewScheduler.tsx` - Use interviews table, fix Math.random, wire meeting links
- `src/components/candidate/InterviewCalendar.tsx` - Query interviews table, fix Math.random, add join link
- `src/components/dashboard/EmployerInterviewsCard.tsx` - Query interviews table, remove all Math.random
- `src/pages/CandidateDetail.tsx` - Replace Math.random stats with real data
- `src/pages/EmployerDetail.tsx` - Replace Math.random stats with real data
- `src/App.tsx` - Add video call route

