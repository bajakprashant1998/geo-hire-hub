
Goal: sort out the hosting/login failure seen on both preview and published.

What I found
- The failure is happening at the browser transport layer, not at the role-check logic:
  - `POST /auth/v1/token?grant_type=password` fails with `TypeError: Failed to fetch`
  - unrelated reads like `jobs`, `profiles`, `admin_settings` also fail the same way
- The console stack shows a Chrome extension wrapping `window.fetch` before the app request runs. That is a strong sign of browser/network interference, and it explains why both candidate and employer login fail the same way.
- The app currently makes the situation worse:
  1. login/signup pages fire extra background requests on load (`liveStats`, `google_oauth` settings)
  2. React Query retries failed network calls
  3. auth session restore keeps attempting refresh-token calls
  4. the service worker caches any response, even non-OK ones, which can preserve a bad hosting state
  5. Google OAuth is using `supabase.auth.signInWithOAuth(...)` instead of the managed `lovable.auth.signInWithOAuth(...)`

Do I know what the issue is?
- Mostly yes: the backend/browser connection is failing before the request completes, and the current app compounds that failure with retries, background queries, and overly aggressive caching.

Implementation plan
1. Add a small backend-health layer
- Create a reusable hook like `useBackendHealth` or `useConnectionStatus`
- Detect transport failures once, classify them as:
  - network/hosting unavailable
  - browser-extension/interceptor issue
  - normal auth error
- Expose a simple state so auth pages can react gracefully instead of continuing to spam requests

2. Harden auth and login flows
- Update `src/pages/Login.tsx`:
  - detect network/hosting failures separately from bad credentials
  - show a clear “service temporarily unavailable” message
  - stop role/profile follow-up queries when the initial login request itself failed
- Update `src/hooks/useAuth.tsx`:
  - reduce or stop retry loops for fetch/network failures
  - avoid repeated profile/session bootstrap work when backend health is down
- Apply the same handling to `Signup` and `AuthCallback`

3. Remove non-essential requests from the critical auth path
- In `Login.tsx`, do not fetch stats until backend health is confirmed
- In `useGoogleOAuthSettings.ts`, wrap the query in a real `try/catch` and disable retry for transport failures
- Optionally set conservative React Query defaults in `src/App.tsx` so `Failed to fetch` does not retry across the whole app

4. Fix hosted OAuth integration
- Replace direct `supabase.auth.signInWithOAuth(...)` calls with `lovable.auth.signInWithOAuth(...)` in:
  - `src/pages/Login.tsx`
  - `src/pages/Signup.tsx`
  - `src/components/GoogleSignInPrompt.tsx`
- Keep `prompt: select_account`, but route it through the managed auth integration so hosted redirects are correct

5. Fix service worker caching behavior
- Update `public/sw.js` so it only caches successful responses (`response.ok`)
- Do not cache auth-sensitive routes/pages such as:
  - `/login`
  - `/signup`
  - `/verify-email`
  - `/auth/callback`
  - `/update-password`
- Bump cache version names to flush any previously cached bad responses
- This is important because the current worker can cache broken hosting responses and keep the app in a bad state after recovery

Files I would touch
- `src/pages/Login.tsx`
- `src/pages/Signup.tsx`
- `src/components/GoogleSignInPrompt.tsx`
- `src/hooks/useGoogleOAuthSettings.ts`
- `src/hooks/useAuth.tsx`
- `src/App.tsx`
- `public/sw.js`
- likely one new hook, e.g. `src/hooks/useBackendHealth.ts`

Technical notes
- No database schema changes are needed
- The real root cause appears external to business logic, so code changes should focus on resilience, correct hosted auth integration, and cache/retry control
- If the backend host itself is actively down, code cannot “repair” that outage, but these changes will stop the app from amplifying it and will prevent stale hosting failures from sticking in cache

Validation plan
```text
1. Clear old service worker/cache
2. Open /login on preview
3. Confirm no background request storm before user action
4. Test candidate email login
5. Test employer email login
6. Test Google login
7. Repeat on published URL
8. Confirm offline/hosting outage now shows a clear message instead of generic login failure
```
