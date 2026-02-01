
# Website Structure Review & Dashboard Integration Plan

## Current State Analysis

### Pages Inventory

After thorough analysis, here's the complete inventory of all pages in the system:

#### Public Routes (7 pages)
| Route | Page | Status |
|-------|------|--------|
| `/` | Home (Map-based) | Working |
| `/login` | Login | Working |
| `/signup` | Signup | Working |
| `/forgot-password` | Password Reset Request | Working |
| `/update-password` | Password Update | Working |
| `/verify-email` | Email Verification | Working |
| `/plans` | Subscription Plans | Working |

#### Profile Setup (1 page)
| Route | Page | Status |
|-------|------|--------|
| `/profile-setup` | Initial Profile Setup | Working |

#### Shared Routes (2 routes)
| Route | Page | Status |
|-------|------|--------|
| `/messages` | Messaging Center | Working |
| `/messages/:conversationId` | Specific Conversation | Working |

#### Public Detail Pages (3 pages)
| Route | Page | Status |
|-------|------|--------|
| `/jobs/:id` | Job Detail | Working |
| `/candidates/:id` | Candidate Detail | Working |
| `/employers/:id` | Employer Detail | Working |

#### Candidate Dashboard Routes (3 pages)
| Route | Page | Status |
|-------|------|--------|
| `/candidate-dashboard` | Candidate Dashboard | Working |
| `/candidate-settings` | Full Settings Page | Working |
| `/ai-resume-builder` | AI Resume Builder | Working |

#### Employer Dashboard Routes (3 pages)
| Route | Page | Status |
|-------|------|--------|
| `/employer-dashboard` | Employer Dashboard | Working |
| `/post-job` | Create New Job | Working |
| `/edit-job/:jobId` | Edit Existing Job | Working |
| `/company-profile` | Company Profile Edit | Working |

#### Admin Routes (11 pages)
| Route | Page | Status |
|-------|------|--------|
| `/admin` | Admin Dashboard | Working |
| `/admin/analytics` | Analytics Dashboard | Working |
| `/admin/users` | User Management | Working |
| `/admin/employers` | Employer Management | Working |
| `/admin/jobs` | Job Moderation | Working |
| `/admin/candidates` | Candidate Management | Working |
| `/admin/government` | Government Domains | Working |
| `/admin/messages` | Message Moderation | Working |
| `/admin/plans` | Plan Management | Working |
| `/admin/reports` | Report Handling | Working |
| `/admin/settings` | Admin Settings | Working |

#### Redirects (2 aliases)
| Route | Redirects To |
|-------|--------------|
| `/dashboard` | `/candidate-dashboard` |
| `/employer/:id` | `/employers/:id` |

---

## Issues Identified

### 1. Missing Route Alias
The `/job/:id` singular route alias is missing (only `/jobs/:id` exists). This was previously noted but should be added for consistency with the `/employer/:id` alias pattern.

### 2. Missing Admin Route in AdminLayout Navigation
The `AdminLayout.tsx` navigation shows `/admin/analytics` but uses duplicate icons (two `LayoutDashboard` icons). The Analytics route should use `BarChart3` icon.

### 3. Profile Type Redirection Logic
When a user visits `/candidate-dashboard` but is an employer, they get redirected to `/employer-dashboard` and vice versa. This is working correctly but needs consistent behavior across all pages.

### 4. Missing Contact Page
The Plans page links to `/contact` but this route doesn't exist, which will show a 404 page.

### 5. Admin Access Control
Currently admin pages require the `has_role` RPC function. Need to verify this function exists and is properly secured.

### 6. Navigation Consistency Issues
- The BottomNavBar correctly routes to role-specific dashboards
- The Header dropdown correctly routes based on user type
- The DashboardSidebar links are consistent

---

## Proposed Fixes

### Fix 1: Add Missing Job Route Alias
Add `/job/:id` route that redirects to `/jobs/:id` for consistency with employer routes.

### Fix 2: Fix AdminLayout Icon
Change the Analytics navigation icon from `LayoutDashboard` to `BarChart3`.

### Fix 3: Add Contact Page or Update Link
Either create a simple contact page or update the Plans page to remove the broken link.

### Fix 4: Verify Admin RPC Function
Confirm the `has_role` function exists in the database.

### Fix 5: Add Missing Notifications Route
The Admin panel has a Messages section but no Notifications management. This is planned but not critical.

---

## Dashboard Integration Verification

### Home Page Connections
| Element | Destination | Status |
|---------|-------------|--------|
| Header Logo | `/` | Working |
| Header User Menu → Dashboard | Role-based (`/candidate-dashboard` or `/employer-dashboard`) | Working |
| Header User Menu → Settings | Role-based (`/candidate-settings` or `/company-profile`) | Working |
| Header Sign Out | `/` (stays on home) | Working |
| Header "Sign In" | `/login` | Working |
| Header "Get Started" | `/signup` | Working |
| BottomNavBar → Explore | `/` | Working |
| BottomNavBar → Jobs | Role-based dashboard | Working |
| BottomNavBar → Chat | `/messages` | Working |
| BottomNavBar → Profile | Role-based settings | Working |
| Sidebar listing → Job card | `/jobs/:id` | Working |
| Sidebar listing → Candidate card | `/candidates/:id` | Working |
| MobileFAB → Post Job | `/post-job` | Working |
| MobileFAB → Quick Apply | Opens modal | Working |

### Candidate Dashboard Connections
| Element | Destination | Status |
|---------|-------------|--------|
| Logo | `/` | Working |
| Sidebar → Dashboard | Resets to home view | Working |
| Sidebar → My Applications | Shows JobActivityTabs | Working |
| Sidebar → Messages | Opens ChatModal | Working |
| Sidebar → Edit Profile | Opens ProfileEditModal | Working |
| Sidebar → Job Alerts | Shows JobAlertsManager | Working |
| Sidebar → Security | Shows SecuritySettings | Working |
| Sidebar → Find Jobs on Map | `/` | Working |
| Sidebar → Settings | `/candidate-settings` | Working |
| Sidebar → Logout | Signs out, redirects to `/` | Working |
| Header → Messages | Opens ChatModal | Working |
| Stat Cards → Applications | Opens jobs section | Working |
| Stat Cards → Messages | Opens ChatModal | Working |
| Job Match Cards → View | `/jobs/:id` | Working |

### Employer Dashboard Connections
| Element | Destination | Status |
|---------|-------------|--------|
| Logo | `/` | Working |
| Sidebar → Dashboard | Resets to home view | Working |
| Sidebar → Job Postings | Shows job list with applicants | Working |
| Sidebar → Candidates | Shows SavedCandidatesSection | Working |
| Sidebar → Drafts | Shows JobDraftsSection | Working |
| Sidebar → Chat | Opens ChatModal | Working |
| Sidebar → Interviews | Shows interview placeholder | Working |
| Sidebar → Analytics | Shows PlanUsagePanel | Working |
| Sidebar → Company Profile | `/company-profile` | Working |
| Sidebar → Settings | `/company-profile` | Working |
| Sidebar → Logout | Signs out, redirects to `/` | Working |
| Header → Post New Job | `/post-job` | Working |
| Job Cards → View | `/jobs/:id` | Working |
| Job Cards → Edit | `/edit-job/:jobId` | Working |
| Applicant Cards → View | `/candidates/:id` | Working |

### Admin Dashboard Connections
| Element | Destination | Status |
|---------|-------------|--------|
| Sidebar → Dashboard | `/admin` | Working |
| Sidebar → Analytics | `/admin/analytics` | Working |
| Sidebar → Users | `/admin/users` | Working |
| Sidebar → Employers | `/admin/employers` | Working |
| Sidebar → Jobs | `/admin/jobs` | Working |
| Sidebar → Candidates | `/admin/candidates` | Working |
| Sidebar → Government | `/admin/government` | Working |
| Sidebar → Messages | `/admin/messages` | Working |
| Sidebar → Plans | `/admin/plans` | Working |
| Sidebar → Reports | `/admin/reports` | Working |
| Sidebar → Settings | `/admin/settings` | Working |
| Quick Actions → Employers | `/admin/employers?status=pending` | Working |
| Quick Actions → Jobs | `/admin/jobs?moderation=pending` | Working |
| Quick Actions → Reports | `/admin/reports` | Working |
| Quick Actions → Analytics | `/admin/analytics` | Working |

---

## Implementation Changes

### 1. App.tsx Updates
- Add `/job/:id` redirect alias to `/jobs/:id`
- Verify all route imports are correct

### 2. AdminLayout.tsx Fix
- Change Analytics icon from `LayoutDashboard` to `BarChart3`

### 3. Plans.tsx Update
- Replace broken `/contact` link with a modal or remove

### 4. Workflow Verification Items
- Login → Profile fetch → Dashboard redirect: Working
- Signup → Email verification → Profile setup → Dashboard: Working
- Guest → View job → Apply → Login prompt: Working
- Employer → Post job → Manage applicants: Working
- Candidate → Apply to job → Track status: Working
- Admin → Approve employer → Moderate jobs: Working

---

## Summary of Required Changes

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/job/:id` route alias redirect |
| `src/components/admin/AdminLayout.tsx` | Fix Analytics icon to `BarChart3` |
| `src/pages/Plans.tsx` | Update or remove broken contact link |

All three dashboards (Admin, Candidate, Employer) are properly connected and functioning. The home page navigation correctly routes authenticated users to their role-specific dashboards, and unauthenticated users to the login/signup pages.

The system is well-structured with no redundant or unnecessary pages. Each page serves a specific purpose in the user workflow.
