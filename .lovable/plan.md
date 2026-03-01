

## Remaining Feature Implementation Plan

### 4 Tasks to Complete

---

### Task 1: AI Screening Job Selector in Employer Dashboard

**Problem**: The AI Screening section currently renders `<AIScreeningPanel jobId="" jobTitle="Select a job" />` with an empty jobId — it's unusable. Also, `ai-candidate-screening` is missing from `supabase/config.toml`.

**Fix**:
- Add `ai-candidate-screening` to `supabase/config.toml` with `verify_jwt = false`
- Update the `ai-screening` case in `EmployerDashboard.tsx` (line 788-789) to render a job selector dropdown above the `AIScreeningPanel`, populated from the employer's `jobs` array
- When a job is selected, pass its `id` and `title` to `AIScreeningPanel`
- Show a placeholder prompt when no job is selected

---

### Task 2: Candidate-Facing Assessment Test-Taking UI

**Problem**: Employers can create assessments via `SkillAssessmentManager`, and `assessment_results` table exists, but there is no UI for candidates to actually take a test.

**Build**:
- Create `src/components/candidate/TakeAssessment.tsx` — a timed test UI that:
  - Loads questions from `assessment_questions` for a given `assessment_id`
  - Shows a countdown timer based on `time_limit_minutes`
  - Renders multiple-choice questions one at a time or all at once
  - On submit, calculates score, compares to `passing_score`, and inserts result into `assessment_results`
  - Shows pass/fail result with score breakdown
- Add a route or entry point: link from job detail page when the job has an `assessment_id`, and/or add an "Assessments" section in candidate dashboard sidebar
- Add "Take Assessment" button on `JobDetail.tsx` when the job has a linked assessment and the candidate hasn't already taken it

---

### Task 3: Salary Transparency Badges on Job Listings

**Problem**: Job cards on BrowseJobs and JobRadar show salary as plain text. No visual indicator of how competitive the salary is.

**Build**:
- Create a small `SalaryBadge` component that shows a color-coded badge based on the salary range:
  - Green "Competitive" for higher ranges
  - Amber "Market Rate" for average
  - Simple display with currency symbol for all
- Add this badge to:
  - `BrowseJobs.tsx` job cards (line ~176, where `salary_range` badge already exists — enhance it)
  - `JobDetail.tsx` salary pill (line ~558-562 — add a "Competitive" / "Market Rate" indicator next to the salary)
  - `JobRadarCard.tsx` salary section
- Since we already have the `salary-insights` edge function, we can use simple heuristic thresholds client-side (e.g., salary > 25000 = competitive) rather than calling AI for every listing

---

### Task 4: WhatsApp/SMS Notifications

**Problem**: Currently only email notifications exist. Users want WhatsApp/SMS alerts for interviews and application updates.

**Build**:
- Create `supabase/functions/send-whatsapp-notification/index.ts` edge function that:
  - Accepts `{ phone_number, message, template_name }` 
  - Calls the WhatsApp Business API (or Twilio) to send messages
  - This requires a third-party API key (Twilio or WhatsApp Business API)
- Add notification preference toggles in `SecuritySettings.tsx`:
  - "WhatsApp notifications" toggle (stored in `notification_preferences`)
  - "SMS notifications" toggle
- Add `whatsapp_notifications_enabled` and `sms_notifications_enabled` columns to `notification_preferences` table
- Wire the existing `notify_interview_event` and `notify_application_status_change` triggers to optionally call the WhatsApp function when enabled
- **API Key Required**: Will need to set up a Twilio or WhatsApp Business API connector. Will prompt for API key setup before proceeding.

---

### Technical Details

**Database changes needed**:
- Add columns to `notification_preferences`: `whatsapp_notifications_enabled boolean default false`, `sms_notifications_enabled boolean default false`
- Add `assessment_id` column to `jobs` table if not already present (to link assessments to jobs)

**Config changes**:
- Add `[functions.ai-candidate-screening]` and `[functions.send-whatsapp-notification]` to `supabase/config.toml`

**New files**:
- `src/components/candidate/TakeAssessment.tsx` — test-taking UI
- `src/components/SalaryBadge.tsx` — reusable salary indicator
- `supabase/functions/send-whatsapp-notification/index.ts` — WhatsApp/SMS sender

**Modified files**:
- `supabase/config.toml` — register new edge functions
- `src/pages/EmployerDashboard.tsx` — job selector for AI screening
- `src/pages/JobDetail.tsx` — salary badge + assessment link
- `src/pages/BrowseJobs.tsx` — salary badge
- `src/pages/CandidateDashboard.tsx` — assessment section in sidebar
- `src/components/candidate/JobRadarCard.tsx` — salary badge
- `src/components/candidate/SecuritySettings.tsx` — WhatsApp/SMS toggles

