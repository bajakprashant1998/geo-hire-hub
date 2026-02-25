

# Auto Apply Job Feature - Implementation Plan

## Overview

This feature adds an AI-powered automatic job application system to the Candidate Dashboard. Candidates configure preferences and a match threshold, and the system automatically applies to matching jobs via a backend function triggered on-demand (with future cron capability). It leverages the existing Gemini-based `calculate-job-match` edge function and `job_matches` table.

---

## Architecture

```text
┌─────────────────────────────────────────────────┐
│  Candidate Dashboard                            │
│  ┌───────────────────────────────────────────┐  │
│  │  AutoApplyManager (new component)         │  │
│  │  - Enable/Disable toggle                  │  │
│  │  - Preferences form                       │  │
│  │  - Match threshold slider (50-95%)        │  │
│  │  - Daily limit selector                   │  │
│  │  - AI cover letter toggle                 │  │
│  │  - Application history panel              │  │
│  └───────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │ invoke
          ┌────────────▼────────────────┐
          │  Edge Function:             │
          │  auto-apply-jobs            │
          │  - Fetch candidate prefs    │
          │  - Scan open jobs           │
          │  - AI match scoring         │
          │  - Filter by threshold      │
          │  - Apply + AI cover letter  │
          │  - Notify candidate         │
          └─────────────────────────────┘
```

---

## Technical Details

### 1. Database Migration

**New table: `auto_apply_preferences`**
- `id` UUID PK
- `candidate_id` UUID FK → candidates(id), UNIQUE
- `is_enabled` boolean DEFAULT false
- `match_threshold` integer DEFAULT 70 (50-95)
- `preferred_titles` text[] DEFAULT '{}'
- `focus_skills` text[] DEFAULT '{}'
- `preferred_locations` text[] DEFAULT '{}'
- `remote_only` boolean DEFAULT false
- `min_salary` text
- `salary_currency` text DEFAULT 'INR'
- `company_size_preference` text[] DEFAULT '{}'
- `industry_preference` text[] DEFAULT '{}'
- `experience_level` text
- `daily_limit` integer DEFAULT 5
- `generate_cover_letter` boolean DEFAULT true
- `location_radius` text DEFAULT 'city' (values: '10km', 'city', 'remote_only', 'relocate')
- `excluded_companies` text[] DEFAULT '{}'
- `created_at`, `updated_at` timestamps

**New table: `auto_apply_logs`**
- `id` UUID PK
- `candidate_id` UUID FK → candidates(id)
- `job_id` UUID FK → jobs(id)
- `match_score` integer
- `cover_letter` text
- `application_id` UUID FK → applications(id)
- `status` text DEFAULT 'applied' (applied, skipped, failed, undone)
- `skip_reason` text
- `created_at` timestamp

**RLS policies:**
- Both tables: candidates can CRUD only their own rows (matching `candidate_id` via `get_current_user_candidate_id()`)

### 2. Edge Function: `auto-apply-jobs`

**Location:** `supabase/functions/auto-apply-jobs/index.ts`

**Logic flow:**
1. Receive `candidateId` from request body
2. Fetch candidate's `auto_apply_preferences` — if not enabled, return early
3. Fetch candidate profile data (skills, experience, location, resume)
4. Query open jobs not already applied to, not in excluded companies
5. For each job (up to daily limit minus today's auto-applies):
   - Use existing `generateGeminiChat` to calculate match score
   - If score >= threshold:
     - Optionally generate AI cover letter via Gemini
     - Insert into `applications` table
     - Log to `auto_apply_logs`
     - Create notification for candidate
6. Return summary of applications made

**Safety controls:**
- Daily limit check (count today's auto_apply_logs)
- Skip already-applied jobs
- Skip excluded/blacklisted companies
- Salary floor enforcement

### 3. Frontend Component: `AutoApplyManager`

**Location:** `src/components/candidate/AutoApplyManager.tsx`

**Sections:**
- **Header:** Toggle switch (Enable/Disable Auto Apply) with status indicator
- **Preferences Form:** Job titles (tag input), skills focus, locations, remote toggle, min salary, company size, industry, experience level
- **Controls:** Match threshold slider (50-95%), daily limit selector (1-10), AI cover letter toggle, location radius select
- **Run Now Button:** Manually trigger the auto-apply edge function
- **Application History:** Table/list of auto-applied jobs with match score, company, date, status, and undo button (within 5 min)

### 4. Dashboard Integration

- Add sidebar item: `{ icon: Zap, label: 'Auto Apply', value: 'auto-apply' }`
- Add case in `renderSectionContent`: `case 'auto-apply': return candidate && <AutoApplyManager candidateId={candidate.id} />`

### 5. Config Update

Add to `supabase/config.toml`:
```toml
[functions.auto-apply-jobs]
verify_jwt = false
```

---

## Files to Create/Edit

| File | Action |
|------|--------|
| `supabase/migrations/xxx.sql` | Create `auto_apply_preferences` + `auto_apply_logs` tables with RLS |
| `supabase/functions/auto-apply-jobs/index.ts` | New edge function |
| `src/components/candidate/AutoApplyManager.tsx` | New UI component |
| `src/pages/CandidateDashboard.tsx` | Add sidebar item + render case |
| `supabase/config.toml` | Add function config (auto-updated) |

---

## Safety and Anti-Spam Measures

- Hard daily limit (configurable 1-10, default 5)
- Exclude already-applied jobs via `applications` table check
- Exclude companies in `excluded_companies` array
- Minimum salary enforcement
- 5-minute undo window (sets `auto_apply_logs.status = 'undone'` and deletes the application)
- Candidate must have a resume uploaded to enable auto-apply

