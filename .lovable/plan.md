

## Plan: Improve User Experience and Eliminate Errors

### Problem Summary
1. **Six build errors** in edge functions (TypeScript strict issues) blocking deployment
2. **LocationGate blocks the entire app** — users who deny location can't access anything (login, signup, browse jobs)
3. **No global error boundary** — unhandled React errors crash the entire app with a white screen
4. **Missing error handling** in key user flows (dashboard data fetching, profile setup)
5. **NotFound page is minimal** — no navigation back to useful places

---

### Implementation Plan

#### 1. Fix All Build Errors (Edge Functions)

- **`ai-candidate-screening/index.ts`** (line 27): Add null check for `profile` before accessing `.id`
- **`check-reverification/index.ts`** (line 77): Cast `error` to `Error` type — `(error as Error).message`
- **`send-whatsapp-notification/index.ts`** (line 92): Cast `err` to `Error` — `(err as Error).message`
- **`verify-employer/index.ts`** (lines 123, 127, 135): Change helper function signatures to use `client: any` instead of `ReturnType<typeof createClient>` to fix the generic mismatch

#### 2. Remove LocationGate Blocking Behavior

The `LocationGate` component wraps ALL routes and blocks the entire app if location is denied. This is a critical UX issue — users can't even log in or sign up.

**Change**: Make LocationGate non-blocking. Instead of blocking the entire UI, it should:
- Still request location permission
- If denied, pass `null` coordinates and let the app render normally
- Location-dependent features (map, nearby jobs) can show a prompt inline instead

#### 3. Add Global Error Boundary

Create `src/components/ErrorBoundary.tsx` — a React class component that catches render errors and shows a friendly fallback UI with a "Reload" button, preventing white-screen crashes.

Wrap the app's `<Routes>` in this boundary in `App.tsx`.

#### 4. Improve Dashboard Error Resilience

In both `CandidateDashboard.tsx` and `EmployerDashboard.tsx`:
- Wrap `fetchCandidate`/`fetchEmployerData` calls in try/catch with `toast.error` feedback
- Show graceful empty states instead of blank screens when data fails to load
- Add loading timeouts (10s) to prevent infinite loading spinners

#### 5. Enhance NotFound Page

Upgrade `NotFound.tsx` with:
- Better visual design (illustration, proper layout)
- Links to dashboard, login, browse jobs, and homepage
- "Go Back" button using `navigate(-1)`

#### 6. Add Defensive Guards in Profile Setup

In `ProfileSetup.tsx`:
- Redirect to login if `!user` after auth loads (currently silently fails)
- Show a loading state while auth is resolving
- Validate all form fields before submission with user-friendly messages

---

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/ai-candidate-screening/index.ts` | Null check for profile |
| `supabase/functions/check-reverification/index.ts` | Type cast error |
| `supabase/functions/send-whatsapp-notification/index.ts` | Type cast err |
| `supabase/functions/verify-employer/index.ts` | Fix helper function param types |
| `src/components/LocationGate.tsx` | Make non-blocking |
| `src/components/ErrorBoundary.tsx` | **New** — global error boundary |
| `src/App.tsx` | Wrap routes in ErrorBoundary |
| `src/pages/NotFound.tsx` | Enhanced 404 page |
| `src/pages/CandidateDashboard.tsx` | Add try/catch + timeout |
| `src/pages/EmployerDashboard.tsx` | Add try/catch + timeout |
| `src/pages/ProfileSetup.tsx` | Auth guard + validation |

