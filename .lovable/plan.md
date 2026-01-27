
# Implementation Plan: Production-Ready AI-Powered Hiring & Career Platform

## Overview

This plan outlines the implementation of an enhanced hiring platform with **Government Job System**, **Advanced AI Features**, **Video Interviews**, **Freelance Mode**, and comprehensive analytics. The existing codebase already has solid foundations including authentication, candidate/employer dashboards, messaging, and map-based job discovery.

---

## Current State Analysis

### Already Implemented
- Authentication with email/password and email verification
- Candidate and Employer dashboards with role-based routing
- Job posting with multi-step wizard and AI description generation
- AI Resume Builder with PDF export and scoring
- Real-time messaging with attachments and reactions
- Map view with geospatial job/candidate search
- Admin dashboard with moderation capabilities
- Employer verification and subscription plans
- Application tracking with status management

### Needs Implementation
- Government Job System with domain verification
- Extended candidate/employer profile fields
- AI matching with embeddings and scoring
- Audio resume (text-to-speech)
- Video interviews with scheduling
- Skill assessments and verified badges
- Freelance mode with milestones
- Advanced analytics and intelligence
- Multilingual UI and accessibility mode

---

## Phase 1: Government Job System

### Database Changes

Add columns to support government employer classification:

```text
employers table:
  + is_government BOOLEAN DEFAULT false
  + government_domain_verified BOOLEAN DEFAULT false
  + government_email_domain TEXT

jobs table:
  + job_category TEXT DEFAULT 'private' CHECK (job_category IN ('private', 'government'))

government_domains table (new):
  - id UUID PRIMARY KEY
  - domain TEXT UNIQUE (e.g., 'gov.in', 'nic.in', 'state.gov')
  - country TEXT
  - is_active BOOLEAN DEFAULT true
```

### Implementation Steps

1. **Signup Flow Enhancement**
   - During employer signup, extract email domain
   - Check against `government_domains` table
   - Auto-mark `is_government = true` if domain matches
   - Add "Government Employer" badge to verified accounts

2. **Job Posting Restrictions**
   - In `PostJob.tsx`, add job_category selector
   - Non-government employers can only select "Private"
   - Government employers can select either

3. **Map & UI Updates**
   - Add pin colors: Red for private, Blue/Green for government
   - Add map legend component
   - Add filter buttons: All / Government Only / Private Only
   - Display "Government Job" badge on job cards

4. **Public Job Page**
   - Show "Official Government Job" header
   - Display "Verified Government Employer" badge

---

## Phase 2: Enhanced Profile System

### Candidate Profile Extensions

New columns for `candidates` table:

```text
+ phone_number TEXT
+ linkedin_url TEXT
+ github_url TEXT
+ languages JSONB DEFAULT '[]'
+ projects JSONB DEFAULT '[]'
+ certifications JSONB DEFAULT '[]'
+ availability TEXT (immediate, 2_weeks, 1_month, 3_months)
+ work_authorization TEXT
+ remote_preference TEXT (onsite, remote, hybrid)
+ notice_period TEXT
+ audio_resume_url TEXT
+ is_profile_public BOOLEAN DEFAULT true
+ verified_skills TEXT[] DEFAULT '{}'
```

### Employer Profile Extensions

New columns for `employers` table:

```text
+ company_size TEXT
+ founded_year INTEGER
+ headquarters_location TEXT
+ social_links JSONB DEFAULT '{}'
```

### Implementation Steps

1. **Profile Setup Wizard** - Expand `ProfileSetup.tsx` with multi-section form
2. **Profile Edit Pages** - Create comprehensive edit interfaces
3. **Profile Completion Meter** - Already exists, extend calculation
4. **Public Profile Pages** - `/candidate/{id}` with toggle for public/private

---

## Phase 3: AI-Powered Matching System

### Database Schema

```text
applications table:
  + ai_score FLOAT
  + ai_match_explanation JSONB

candidate_embeddings table (new):
  - candidate_id UUID PRIMARY KEY REFERENCES candidates(id)
  - embedding VECTOR(1536)
  - updated_at TIMESTAMPTZ

job_embeddings table (new):
  - job_id UUID PRIMARY KEY REFERENCES jobs(id)
  - embedding VECTOR(1536)
  - updated_at TIMESTAMPTZ
```

### New Edge Functions

1. **`generate-embeddings`** - Generate vector embeddings for job/candidate profiles using Lovable AI
2. **`calculate-match-score`** - Compute similarity scores on application
3. **`explain-match`** - Generate "Why this match?" explanations

### Implementation Flow

```text
Candidate applies to job
       |
       v
Edge function: calculate-match-score
       |
       +-- Fetch candidate embedding
       +-- Fetch job embedding  
       +-- Compute cosine similarity
       +-- Generate explanation via AI
       +-- Store ai_score + explanation
       |
       v
Employer sees ranked applicants
```

---

## Phase 4: Audio Resume Feature

### Edge Function: `generate-audio-resume`

```text
Input: Resume text content, voice preference, language
Process:
  1. Extract/clean text from resume
  2. Call Lovable AI for text-to-speech
  3. Upload MP3 to Supabase storage
  4. Return URL
Output: audio_url saved to candidate profile
```

### UI Components

1. **Generate Audio Resume Button** in candidate dashboard
2. **Voice/Tone Selection Modal** (Male/Female, Professional/Neutral)
3. **Audio Player** on candidate profile and employer application view
4. **Visibility Toggle** (Public / Employers Only)

---

## Phase 5: Skill Assessments & Verification

### Database Schema

```text
assessments table:
  - id UUID PRIMARY KEY
  - job_id UUID REFERENCES jobs(id) NULLABLE
  - title TEXT
  - type TEXT (mcq, coding, mixed)
  - questions JSONB
  - passing_score INTEGER
  - time_limit_minutes INTEGER
  - created_at TIMESTAMPTZ

assessment_attempts table:
  - id UUID PRIMARY KEY
  - assessment_id UUID REFERENCES assessments(id)
  - candidate_id UUID REFERENCES candidates(id)
  - answers JSONB
  - score INTEGER
  - passed BOOLEAN
  - completed_at TIMESTAMPTZ
```

### Implementation

1. **Edge Function: `generate-assessment`** - AI creates MCQ/coding questions
2. **Assessment Taking UI** - Timer, question navigation, auto-submit
3. **Results & Badge System** - Award "Verified Skills" badges
4. **Employer Integration** - Attach assessments to job postings

---

## Phase 6: Video Interviews

### Database Schema

```text
interviews table:
  - id UUID PRIMARY KEY
  - application_id UUID REFERENCES applications(id)
  - scheduled_at TIMESTAMPTZ
  - meeting_link TEXT
  - status TEXT (scheduled, in_progress, completed, cancelled)
  - notes JSONB
  - recording_url TEXT
```

### Implementation

1. **Scheduling UI** - Calendar picker in employer application view
2. **Notifications** - Email + in-app notification to candidate
3. **Meeting Room** - Integrate with external provider (Daily.co/Jitsi)
4. **Countdown Timer** - Show before interview starts
5. **Calendar Sync** - Generate .ics files for download

---

## Phase 7: Freelance Mode

### Database Schema

```text
jobs table:
  + work_mode TEXT (fulltime, parttime, contract, freelance)
  + project_budget NUMERIC
  + estimated_duration TEXT

milestones table:
  - id UUID PRIMARY KEY
  - job_id UUID REFERENCES jobs(id)
  - title TEXT
  - description TEXT
  - amount NUMERIC
  - due_date DATE
  - status TEXT (pending, in_progress, completed, paid)

invoices table:
  - id UUID PRIMARY KEY
  - milestone_id UUID REFERENCES milestones(id)
  - candidate_id UUID REFERENCES candidates(id)
  - employer_id UUID REFERENCES employers(id)
  - amount NUMERIC
  - status TEXT (draft, sent, paid)
  - created_at TIMESTAMPTZ
```

### Features

1. **Freelance Job Posting** - Add work_mode selector to PostJob
2. **Milestone Management** - Employer creates milestones
3. **Progress Tracking** - Candidate marks completion
4. **Invoice Generation** - AI-powered PDF invoices

---

## Phase 8: Analytics & Intelligence

### Database Views/Functions

```sql
-- Hiring analytics
CREATE VIEW hiring_analytics AS
SELECT 
  employer_id,
  AVG(EXTRACT(days FROM hired_at - applied_at)) as avg_time_to_hire,
  COUNT(CASE WHEN status = 'hired' THEN 1 END) as total_hires,
  -- ... more metrics
FROM applications
GROUP BY employer_id;
```

### Dashboard Components

1. **Time-to-Hire Chart**
2. **Application Funnel Visualization**
3. **Skill Gap Analysis**
4. **Talent Heatmap** (using map integration)
5. **Salary Intelligence** by role/location
6. **"Best Time to Apply"** AI suggestions

---

## Phase 9: Multilingual & Accessibility

### Implementation

1. **i18n Setup** - Add react-i18next library
2. **Language Switcher** - Header dropdown
3. **Translation Files** - en.json, hi.json, etc.
4. **Accessibility Mode Toggle**
   - High contrast theme
   - Larger fonts
   - Screen reader optimizations
   - Keyboard navigation enhancements

---

## File Structure for New Components

```text
src/
├── components/
│   ├── government/
│   │   ├── GovernmentJobBadge.tsx
│   │   ├── GovernmentEmployerBadge.tsx
│   │   └── JobCategoryFilter.tsx
│   ├── assessments/
│   │   ├── AssessmentCard.tsx
│   │   ├── AssessmentTaker.tsx
│   │   └── VerifiedSkillBadge.tsx
│   ├── interviews/
│   │   ├── ScheduleInterviewModal.tsx
│   │   ├── InterviewRoom.tsx
│   │   └── InterviewCountdown.tsx
│   ├── freelance/
│   │   ├── MilestoneTracker.tsx
│   │   └── InvoiceGenerator.tsx
│   └── analytics/
│       ├── HiringFunnel.tsx
│       ├── TimeToHireChart.tsx
│       └── TalentHeatmap.tsx
├── pages/
│   ├── PublicCandidateProfile.tsx
│   ├── AssessmentPage.tsx
│   ├── InterviewRoom.tsx
│   └── FreelanceHub.tsx
└── hooks/
    ├── useAssessments.ts
    ├── useInterviews.ts
    └── useAnalytics.ts

supabase/functions/
├── generate-embeddings/
├── calculate-match-score/
├── generate-audio-resume/
├── generate-assessment/
├── generate-cover-letter/
└── generate-invoice/
```

---

## Implementation Priority

### Sprint 1 (Week 1-2): Government Job System
- Database migrations for government features
- Domain verification logic
- Map pin colors and filtering
- Government badges

### Sprint 2 (Week 3-4): Enhanced Profiles
- Extended profile fields
- Multi-section profile editor
- Public profile pages
- Profile completion improvements

### Sprint 3 (Week 5-6): AI Matching
- Embedding generation functions
- Match score calculation
- Match explanation generation
- Ranked applicant view

### Sprint 4 (Week 7-8): Audio Resume & Assessments
- Text-to-speech integration
- Audio player components
- Assessment generator
- Assessment taking UI

### Sprint 5 (Week 9-10): Video Interviews
- Scheduling system
- Video room integration
- Notifications
- Calendar sync

### Sprint 6 (Week 11-12): Freelance & Analytics
- Milestone tracking
- Invoice generation
- Analytics dashboards
- Salary intelligence

### Sprint 7 (Week 13-14): Polish & i18n
- Multilingual support
- Accessibility mode
- Performance optimization
- Testing and bug fixes

---

## Technical Considerations

1. **AI Rate Limits** - Implement queuing for batch embedding generation
2. **Storage** - Use Supabase storage for audio files and documents
3. **Real-time** - Extend existing real-time setup for interview notifications
4. **RLS Policies** - Ensure proper access control for all new tables
5. **Mobile Responsiveness** - All new components must work on mobile

This plan transforms the existing hiring platform into a comprehensive, AI-powered ecosystem with government job support, advanced matching, and enterprise-ready features.
