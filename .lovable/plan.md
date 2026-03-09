

## Plan: Complete All Pending Tasks and Fixes

### 7 Tasks to Implement

---

#### 1. Fix Nominatim Geocoding CORS Error (High Priority)

The `LocationBadge.tsx` and `AIResumeBuilder.tsx` make direct browser calls to `nominatim.openstreetmap.org` which fails with CORS/network errors on every page load.

**Fix**: Replace direct Nominatim calls with Google Maps Geocoder (already available via the Google Maps API key). For `LocationBadge`, use the existing Google Maps Geocoding REST API through a simple edge function proxy. As a simpler alternative, silently catch errors and use coordinate-based fallback text.

**Files**: `src/components/map/LocationBadge.tsx`, `src/pages/AIResumeBuilder.tsx`
- Wrap fetch in try/catch, on failure show "Near you" instead of logging error
- Add `AbortController` with 5s timeout to prevent hanging requests

---

#### 2. Add 10s Loading Timeout to Dashboards (Medium Priority)

Both dashboards already have try/catch and `setDataLoading(false)` in finally blocks. Missing: a timeout that forces loading to stop if API hangs.

**Files**: `src/pages/CandidateDashboard.tsx`, `src/pages/EmployerDashboard.tsx`
- Add a 10s `setTimeout` in the `fetchCandidate`/`fetchEmployerData` that sets `dataLoading = false` and shows a toast if still loading
- Add `toast.error` in the catch blocks (currently only `console.error`)

---

#### 3. Add PWA Offline Fallback Page (Medium Priority)

`public/sw.js` exists but returns nothing when offline and no cached page matches.

**Files**: `public/offline.html` (new), `public/sw.js`
- Create a simple offline HTML page with branding
- Update service worker to cache `offline.html` and serve it as fallback for navigation requests

---

#### 4. Add Email Verification Reminder on Dashboard (Medium Priority)

`EmailVerificationBanner` exists in `App.tsx` but an inline dashboard prompt would be more visible.

**Files**: `src/pages/CandidateDashboard.tsx`, `src/pages/EmployerDashboard.tsx`
- Add a dismissible card in the dashboard home view when `!isEmailVerified` with resend button
- Reuse logic from existing `EmailVerificationBanner`

---

#### 5. Add Skeleton Loading to ProfileSetup (Medium Priority)

Currently shows nothing while auth resolves.

**Files**: `src/pages/ProfileSetup.tsx`
- Show a skeleton card layout while `authLoading || profileLoading` instead of blank screen

---

#### 6. Add Global Unhandled Rejection Handler (Medium Priority)

The Google Maps `AdvancedMarker` crash (`getRootNode` error) triggers ErrorBoundary. A global handler can catch async errors gracefully.

**Files**: `src/App.tsx`
- Add `useEffect` with `window.addEventListener('unhandledrejection', ...)` that logs and shows toast
- Prevents white-screen crashes from async Google Maps errors

---

#### 7. Fix Google Maps AdvancedMarker Crash (High Priority)

The console shows `Cannot read properties of undefined (reading 'getRootNode')` from `AdvancedMarker` cleanup. This crashes the entire app via ErrorBoundary.

**Files**: `src/components/map/GoogleMapContainer.tsx`
- Wrap the map rendering in its own error boundary so map crashes don't take down the whole app
- Add null checks before rendering `AdvancedMarker` components
- Ensure markers are only rendered when the map instance is ready

---

### Files Summary

| File | Change |
|------|--------|
| `src/components/map/LocationBadge.tsx` | Silent error handling, timeout |
| `src/pages/AIResumeBuilder.tsx` | Silent error handling for Nominatim |
| `src/pages/CandidateDashboard.tsx` | 10s timeout + toast error + email verify card |
| `src/pages/EmployerDashboard.tsx` | 10s timeout + toast error + email verify card |
| `public/offline.html` | **New** - offline fallback page |
| `public/sw.js` | Cache offline.html, serve as fallback |
| `src/pages/ProfileSetup.tsx` | Skeleton loading state |
| `src/App.tsx` | Global unhandled rejection handler |
| `src/components/map/GoogleMapContainer.tsx` | Map-specific error boundary, marker null checks |

