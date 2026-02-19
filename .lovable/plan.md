

# Public Profile Tab for Candidate and Employer Dashboards

## Overview

Add a "Public Profile" sidebar item to both dashboards. When clicked, it renders the user's own public profile page inline (within the dashboard layout), so they can see exactly how others view their profile.

---

## Changes

### 1. CandidateDashboard.tsx

**Sidebar item** -- Add a new entry to the `sidebarItems` array:
```
{ icon: Eye, label: 'Public Profile', value: 'public-profile' }
```
Place it after "Edit Profile" so users can toggle between editing and previewing.

**Section rendering** -- Add a `case 'public-profile'` in `renderSectionContent()` that imports and renders the existing `CandidateDetail` page component, passing the candidate's own ID. This reuses the already-redesigned profile page so the user sees exactly what employers see.

### 2. EmployerDashboard.tsx

**Sidebar item** -- Add a new entry to `sidebarItems`:
```
{ icon: Eye, label: 'Public Profile', value: 'public-profile' }
```
Place it near "Company Profile" for logical grouping.

**Section rendering** -- Add a `case 'public-profile'` in `renderSectionContent()` that imports and renders the existing `EmployerDetail` page component, passing the employer's own ID. This reuses the redesigned company profile page.

### 3. Minor Adjustments to CandidateDetail.tsx and EmployerDetail.tsx

Both profile pages currently use `useParams()` to get the ID from the URL. To support embedding inside dashboards, add an optional `id` prop that takes priority over `useParams()`. This is a small change at the top of each component:

```tsx
// Before
const { id } = useParams();

// After
const { id: paramId } = useParams();
const id = props.id || paramId;
```

No other changes needed -- the full profile rendering logic stays the same.

---

## Technical Details

| File | Change |
|------|--------|
| `src/pages/CandidateDashboard.tsx` | Add `Eye` import, add sidebar item, add `public-profile` case rendering `<CandidateDetail id={candidate.id} />` |
| `src/pages/EmployerDashboard.tsx` | Add `Eye` import, add sidebar item, add `public-profile` case rendering `<EmployerDetail id={employer.id} />` |
| `src/pages/CandidateDetail.tsx` | Accept optional `id` prop, fallback to `useParams()` |
| `src/pages/EmployerDetail.tsx` | Accept optional `id` prop, fallback to `useParams()` |

No database changes or new components required -- this fully reuses existing profile pages.

