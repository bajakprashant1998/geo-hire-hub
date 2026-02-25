

# Job Radar -- Career Compass AI

## Overview
A new "Job Radar" tab inside the Candidate Dashboard that provides an intelligent, AI-ranked job discovery experience with real-time filters, geo-distance calculations, match scoring, and saved filter presets. This replaces the need to scroll through hundreds of listings by surfacing the most relevant jobs first.

---

## Architecture

```text
┌──────────────────────────────────────────────────────────┐
│  CandidateDashboard.tsx                                  │
│  ├─ sidebar: adds "Job Radar" item (Radar icon)          │
│  └─ renderSectionContent: case 'job-radar' →             │
│       <JobRadar candidateId={...} candidate={...}        │
│                 profile={...} />                         │
└──────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  src/components/candidate/JobRadar.tsx  (~900 lines)     │
│                                                          │
│  ┌─────────────┐  ┌──────────────────────────────────┐   │
│  │ FilterPanel  │  │  Results Area                    │   │
│  │ (collapsible │  │  ┌──────────────────────────┐    │   │
│  │  on mobile)  │  │  │ Sort bar + result count  │    │   │
│  │             │  │  ├──────────────────────────┤    │   │
│  │ • Search    │  │  │ Job Card (match %, dist) │    │   │
│  │ • Location  │  │  │ Job Card                 │    │   │
│  │ • Salary    │  │  │ Job Card                 │    │   │
│  │ • Experience│  │  │ ...infinite scroll       │    │   │
│  │ • Job Type  │  │  └──────────────────────────┘    │   │
│  │ • Match %   │  │                                  │   │
│  │ • Freshness │  │  Skill Gap Alerts (inline)       │   │
│  └─────────────┘  └──────────────────────────────────┘   │
│                                                          │
│  useJobRadar hook (data fetching + scoring engine)       │
└──────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────┐
│  src/hooks/useJobRadar.ts                                │
│  - Fetches open/active jobs from Supabase                │
│  - Client-side weighted match scoring:                   │
│    Skill 40% | Experience 25% | Salary 15%              │
│    Location 10% | Company Quality 10%                   │
│  - Haversine distance calculation                        │
│  - Applies all filters client-side for instant updates   │
│  - Pagination (load more batches)                        │
└──────────────────────────────────────────────────────────┘
```

---

## Technical Details

### 1. New Files

**`src/hooks/useJobRadar.ts`**
- Fetches jobs from `jobs` table (status=open, is_active=true) with joined `employers` data
- Loads candidate profile data (skills, experience, salary, location) for scoring
- Implements **weighted match scoring engine**:
  - **Skill Match (40%)**: Compares candidate `skills[]` against job `skills[]` and `description` keyword overlap
  - **Experience Match (25%)**: Checks candidate `experience_years` against job `min_experience`/`max_experience`
  - **Salary Compatibility (15%)**: Parses `salary_range` strings and compares with candidate `expected_salary`
  - **Location Proximity (10%)**: Haversine distance from candidate lat/lng to job lat/lng, scored inversely
  - **Company Quality (10%)**: Based on employer `verification_status`, `profile_completeness`, `work_life_balance_rating`
- Returns `{ jobs, loading, hasMore, loadMore, totalCount }` with all filters applied client-side for instant reactivity
- Fetches saved_jobs to mark already-saved jobs
- Manages save/unsave toggle

**`src/components/candidate/JobRadar.tsx`**
- Main component, split into FilterPanel (left/top) and Results (right/main)
- **Filter Panel** (collapsible sheet on mobile, sticky sidebar on desktop):
  - Keyword search (debounced, searches title/skills/company)
  - Location: city input, distance radius slider (5/10/25/50/100 km), Remote toggle, Hybrid toggle
  - Salary: min salary slider, "Hide undisclosed" toggle
  - Experience: chip buttons (Fresher, 1-3y, 3-5y, 5+)
  - Job Type: multi-select chips (Full-time, Part-time, Internship, Contract, Freelance)
  - Match Score: minimum % slider (default 0)
  - Freshness: Today, 3 days, 1 week, All
  - Hiring Urgency: "Actively hiring" toggle (filters by `hiring_urgency`)
  - Company: Verified only toggle
  - **Saved Filters**: save current filter combo with custom name, load presets from localStorage
- **Results Area**:
  - Sort dropdown: Highest Match %, Nearest First, Highest Salary, Most Recent
  - Result count badge
  - Job cards with: match % circle, distance badge, salary, company, skills tags, Apply + Save buttons
  - Skill gap alert inline on each card (missing skills highlighted)
  - Salary insight tooltip ("This role pays 20% above your current")
  - Load more button / infinite scroll
- **Mobile**: Filter panel becomes a bottom sheet triggered by a floating filter FAB; results are full-width cards

**`src/components/candidate/JobRadarCard.tsx`**
- Individual job card component used inside JobRadar
- Shows: company name, match % badge (color-coded), salary range, distance in KM, required skills vs matched skills, job type badge, posted date
- Action buttons: Apply (links to job detail), Save/Unsave, Hide
- Skill gap alert strip at bottom when missing skills detected
- Salary insight strip when salary comparison available

### 2. Modified Files

**`src/pages/CandidateDashboard.tsx`**
- Import `JobRadar` component (lazy loaded)
- Add to `sidebarItems` array: `{ icon: Radar, label: 'Job Radar', value: 'job-radar' }`
- Add case in `renderSectionContent`: `case 'job-radar': return <JobRadar candidateId={candidate.id} candidate={candidate} profile={profile} />`

**`src/components/dashboard/DashboardSidebar.tsx`**
- Add `'job-radar'` to the `ACTIVITY_ITEMS` array so it appears in the Activity group

### 3. No Database Changes Required
- All scoring and filtering is done client-side using existing tables (`jobs`, `employers`, `candidates`, `profiles`, `saved_jobs`, `applications`)
- Saved filter presets stored in `localStorage` (no new table needed)
- The existing `job_matches` table can optionally be used but the radar does its own real-time scoring

### 4. UI/UX Design
- Follows the existing glassmorphism aesthetic: `bg-card/70 backdrop-blur-xl`, `rounded-2xl`, `border-border/40`
- Match score circles use the existing Google color palette (green 85%+, blue 70%+, amber 50%+, gray below)
- Filter panel uses `framer-motion` for smooth expand/collapse animations
- Cards use `hover:scale-[1.01]` and `hover:shadow-lg` transitions
- Mobile-first: filter sheet slides up from bottom, cards stack vertically with compact layout
- Saved filters appear as horizontal scroll chips above the results

### 5. Key Features Summary
| Feature | Implementation |
|---------|---------------|
| Keyword search | Client-side filter on title, skills, company_name |
| Location/distance | Haversine formula, radius slider |
| Salary filter | Parse salary_range, compare with slider |
| Experience filter | Chip groups mapped to min/max_experience |
| AI Match ranking | Weighted scoring (skill 40%, exp 25%, salary 15%, location 10%, quality 10%) |
| Saved filters | localStorage with named presets |
| Skill gap alerts | Compare candidate.skills with job.skills, highlight missing |
| Salary insights | Compare candidate.expected_salary with job.salary_range |
| Sort options | Match %, distance, salary, recency |
| Save/Apply actions | Existing saved_jobs table + link to job detail |
| Infinite scroll | Paginated fetch with "load more" |
| Mobile responsive | Bottom sheet filters, stacked cards |

