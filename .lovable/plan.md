
# Candidate Dashboard Responsiveness, Task Feature, and Profile Page Redesigns

## Overview

This plan covers four areas: (1) fixing mobile responsiveness on the candidate dashboard, (2) adding a task assignment feature for employers and candidates, (3) redesigning the company profile page, and (4) redesigning the candidate profile page.

---

## 1. Candidate Dashboard Mobile Responsiveness

### Issues
- Welcome message and subtitle text too large on small screens
- Section content card padding (`p-6`) too generous on mobile
- Jobs section grid (`lg:grid-cols-3`) doesn't stack well on mobile
- Employer dashboard job detail card header buttons overflow on mobile (View, Edit, Delete all inline)
- `EmployerHeader` "Post New Job" button takes too much space on small screens

### Fixes

**CandidateDashboard.tsx:**
- Welcome heading: `text-xl sm:text-2xl lg:text-3xl`
- Reduce main padding to `p-3 sm:p-4 lg:p-6`

**EmployerDashboard.tsx:**
- Section content card padding: `p-3 sm:p-4 md:p-6`
- Job detail header: Stack buttons vertically on mobile (wrap with `flex-wrap`)
- Welcome heading responsive sizing
- Job list/detail grid: add `md:grid-cols-1 lg:grid-cols-3` so it stacks on tablet

**EmployerHeader.tsx:**
- "Post New Job" button: icon-only on mobile (already has `hidden sm:inline` on text -- verify)
- Add compact mobile layout

---

## 2. Task Assignment Feature (Employer to Candidate)

### Database Changes
Create a new `tasks` table:
- `id` (uuid, primary key)
- `employer_id` (uuid, references employers.id)
- `candidate_id` (uuid, references candidates.id)
- `job_id` (uuid, references jobs.id, nullable -- optional link to a job)
- `title` (text, not null)
- `description` (text)
- `status` (text, default 'pending' -- values: pending, in_progress, completed, rejected)
- `priority` (text, default 'medium' -- values: low, medium, high)
- `due_date` (timestamptz, nullable)
- `completed_at` (timestamptz, nullable)
- `candidate_notes` (text, nullable -- candidate's response/notes)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

RLS policies:
- Employers can SELECT, INSERT, UPDATE, DELETE their own tasks
- Candidates can SELECT tasks assigned to them, and UPDATE status/candidate_notes on their own tasks

### New Components

**`src/components/employer/TaskManager.tsx`** -- Employer-side task management:
- List all tasks grouped by candidate
- Create new task form (title, description, priority, due date, select candidate from applicants)
- View task status and candidate responses
- Filter by status (all, pending, in_progress, completed)

**`src/components/candidate/TaskList.tsx`** -- Candidate-side task view:
- List all tasks assigned to them
- View task details (title, description, due date, priority)
- Update status (mark as in_progress, completed)
- Add notes/response to task
- Filter by status

### Integration Points

**EmployerDashboard.tsx:**
- The existing "Tasks" sidebar item (value: `drafts`) currently shows `JobDraftsSection`
- Change: Rename sidebar item to "Tasks" and add a tabbed view with "Job Drafts" and "Candidate Tasks" tabs
- Or: Add a separate "Assign Tasks" sidebar item

**CandidateDashboard.tsx:**
- Add a new sidebar item: "Tasks" with a task count badge
- Add `tasks` case in `renderSectionContent()` showing `TaskList`

### Realtime (optional enhancement)
- Enable realtime on the `tasks` table so candidates see new tasks instantly

---

## 3. Redesign Company Profile Page (EmployerDetail.tsx)

### Current State
The `EmployerDetail.tsx` page has a good structure but uses a generic stock photo hero, hardcoded stats ("50-200 employees", "4.3 stars"), and the contact form is basic.

### Redesign Goals
- Modern card-based layout with the company's actual logo prominently displayed
- Remove hardcoded/fake data (star ratings, employee count) -- show only real data
- Better visual hierarchy with icon-accented section headers
- Responsive grid: single column on mobile, two columns on desktop
- Show real job listings with clickable cards
- Improve the contact section with a cleaner CTA
- Add benefits and culture sections if data exists (from employer table's `benefits`, `culture_description` fields)
- Better mobile spacing and typography

### Key Layout Changes
- Hero: Use a gradient background with the company logo overlaid (no stock photo)
- Stats bar: Only show real metrics (jobs count, member since)
- Add "Why Work Here" section showing benefits if available
- Add "Our Culture" section if culture_description exists
- Job listings as horizontal scrollable cards on mobile
- Cleaner contact CTA at the bottom

---

## 4. Redesign Candidate Profile Page (CandidateDetail.tsx)

### Current State
The page is 1175 lines, well-structured with Google-colored sections. The auth gate restricts full details to employers. The layout works but is visually dense.

### Redesign Goals
- Cleaner, more modern card layout
- Better mobile responsiveness (stats bar overflows on small screens)
- Consolidate info pills to avoid wrapping issues
- Improve the "restricted access" card for non-employers
- Better visual hierarchy for work experience timeline
- Skills section: use a more compact chip layout
- Social links: move into the header card instead of a separate sidebar section
- Remove hardcoded fake data (star ratings, "95% response rate")
- Responsive improvements: stack all sections vertically on mobile

### Key Layout Changes
- Header card: Reduce avatar size on mobile, stack info vertically
- Stats bar: Use `grid grid-cols-2 sm:grid-cols-3` instead of flex with dividers (which break on mobile)
- Skills: Smaller badges with no icon for compact display
- Work experience: Cleaner timeline with less padding
- Education: Compact card layout
- Sidebar (certifications, languages, social links): Move above or integrate into main flow on mobile
- Remove star rating display (no real rating system exists)

---

## Technical Details

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/employer/TaskManager.tsx` | Employer task creation and management UI |
| `src/components/candidate/TaskList.tsx` | Candidate task viewing and status update UI |

### Files to Modify
| File | Changes |
|------|---------|
| Database migration | Create `tasks` table with RLS policies |
| `src/pages/CandidateDashboard.tsx` | Add Tasks sidebar item, responsive fixes |
| `src/pages/EmployerDashboard.tsx` | Wire tasks section, responsive padding/layout fixes |
| `src/pages/CandidateDetail.tsx` | Redesign with cleaner layout, remove fake data, fix mobile |
| `src/pages/EmployerDetail.tsx` | Redesign with real data only, improve mobile layout |
| `src/components/dashboard/EmployerHeader.tsx` | Minor mobile tweaks |

### Database Migration SQL (Summary)
```sql
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.employers(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  due_date timestamptz,
  completed_at timestamptz,
  candidate_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Employer policies (CRUD on own tasks)
-- Candidate policies (SELECT + UPDATE status/notes on assigned tasks)
```

### Task Flow

```text
Employer Dashboard > Tasks Section
  |
  +--> "Assign Task" button
  |     |
  |     +--> Select candidate (from applicants)
  |     +--> Enter title, description, priority, due date
  |     +--> Submit -> inserts into tasks table
  |
  +--> View all tasks with status filters
        +--> See candidate responses/notes

Candidate Dashboard > Tasks Section
  |
  +--> View assigned tasks list
  |     +--> Task card: title, employer name, priority badge, due date
  |     +--> Click to expand: full description
  |     +--> "Start Task" / "Mark Complete" buttons
  |     +--> Add notes/response text
  |
  +--> Filter: All | Pending | In Progress | Completed
```
