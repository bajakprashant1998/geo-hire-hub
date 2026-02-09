

# Enhanced Map Cards, Candidate Visibility Controls, and Navigation Audit

## Overview

This plan covers three areas: (1) visual polish of map popup cards and the marker preview sheet, (2) restricting candidate profile details to authenticated employer accounts, and (3) auditing and fixing cross-page navigation links.

---

## 1. Enhanced Map Popup Cards (Visual Polish)

### Current State
The map popup cards (`createJobPopupContent` and `createCandidatePopupContent` in `MapContainer.tsx`) use raw inline HTML strings. They already have a decent structure but need refinement for clarity and consistency.

### Changes

**Job Popup Cards** (in `MapContainer.tsx` - `createJobPopupContent`):
- Add a colored header bar (red for private, emerald for government) with job title and company
- Show a "NEW" badge for jobs posted within 24 hours
- Add distance tag alongside job type and salary
- Add posted date in meta section
- Improve button styling with more prominent "View Details" CTA

**Candidate Popup Cards** (in `MapContainer.tsx` - `createCandidatePopupContent`):
- For unauthenticated users: show only name and job title, hide skills/experience details, replace "Contact" with "Sign In to View"
- For authenticated non-employer users: show name, job title, basic stats, but replace "Contact" with "Register as Employer"
- For authenticated employers: show full card (current behavior)

**MarkerPreviewSheet** (bottom sheet on mobile):
- Apply same auth-gating logic for candidate previews
- Add a subtle gradient header matching the card type
- Add "posted X days ago" for jobs
- Improve spacing and typography consistency

---

## 2. Candidate Profile Access Control

### Current State
`CandidateDetail.tsx` shows ALL candidate information (bio, skills, experience, salary, education, work history, contact info, resume) to anyone -- even unauthenticated visitors.

### Changes to `CandidateDetail.tsx`
- **Public view (no login)**: Show only name, job title, avatar, availability status, and member since date. Show a prominent CTA: "Sign in as an employer to view full profile"
- **Logged-in candidate**: Same limited view with message: "Only employers can view full candidate profiles"
- **Logged-in employer**: Full profile access (current behavior)
- Use `useAuth()` hook (already imported in many places) to check `user` and `profile.user_type`

### Changes to Map Cards for Candidates
- **Popup cards** (`createCandidatePopupContent`): Accept an `isEmployer` flag. If false, hide skills count, experience years, and swap "Contact" button for "Sign In to View Full Profile"
- **MarkerPreviewSheet** (`renderCandidatePreview`): Same gating -- show limited info for non-employers
- **Sidebar** candidate list items: Show name and job title only for non-employers; hide experience badge

---

## 3. Navigation and Link Audit

### Issues Found

1. **`/employer/:id` vs `/employers/:id`**: Both routes exist. `JobDetail.tsx` links to `/employer/${id}` (line 470) while admin tables link to `/employers/:id`. Both work (one is an alias), but should be consistent.

2. **Candidate popup "Contact" button** navigates to `/messages?candidate=${id}` -- this passes candidate table ID, but the Messages page expects a user_id for conversation lookup. This is a mismatch that could cause silent failures.

3. **Candidate popup "View" button** correctly navigates to `/candidates/${id}`.

4. **Job popup "Apply" button** navigates to `/jobs/${id}?action=apply` but `JobDetail.tsx` does not read the `action=apply` query param to auto-open the apply dialog.

5. **MarkerPreviewSheet** navigates to `/candidates/${item.id}` and `/jobs/${item.id}` -- correct.

### Fixes

- **Fix #1**: Standardize all employer links to `/employers/:id` (update `JobDetail.tsx` link)
- **Fix #2**: Update candidate contact flow in popup to navigate to `/candidates/${id}` with a query param `?action=contact` instead of broken `/messages?candidate=${id}`. In `CandidateDetail.tsx`, read the query param and auto-trigger the contact flow.
- **Fix #4**: In `JobDetail.tsx`, read `?action=apply` query param and auto-open the apply dialog on mount.

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/map/MapContainer.tsx` | Update `createJobPopupContent` and `createCandidatePopupContent` with enhanced visuals, auth-gating for candidate cards, pass auth state to popup generators |
| `src/components/map/MarkerPreviewSheet.tsx` | Add auth-gating for candidate preview, improve visual design with gradient headers and better spacing, add time-ago for jobs |
| `src/components/map/Sidebar.tsx` | Limit candidate info shown to non-employers in list view |
| `src/pages/CandidateDetail.tsx` | Add auth gate: show limited public profile for non-employers, full profile for employers. Handle `?action=contact` query param |
| `src/pages/JobDetail.tsx` | Fix employer link path (`/employer/` to `/employers/`). Handle `?action=apply` query param to auto-open apply dialog |
| `src/pages/Index.tsx` | Pass auth state down to MapContainer for popup generation |

### Auth Flow for Candidate Cards

```text
User visits map (/)
  |
  +--> Clicks candidate marker
        |
        +--> Is user logged in?
        |     |
        |     +--> NO: Show name + job title only
        |     |         CTA: "Sign In to View Profile"
        |     |
        |     +--> YES: Is user_type === 'employer'?
        |           |
        |           +--> YES: Show full card + Contact button
        |           |
        |           +--> NO: Show name + job title only
        |                     Message: "Employer account required"
```

### No Database Changes Required
All changes are frontend-only. The existing RLS policies and data queries remain unchanged.

