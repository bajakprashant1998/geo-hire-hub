

## Pending Tasks Across the Website — Completion Plan

### Issues Found

1. **CandidateSettings: "Job Alerts" tab shows blank content** — The `TabsTrigger` for "alerts" exists but there is no `TabsContent value="alerts"`. The `JobAlertsManager` is incorrectly nested inside the "privacy" tab. Clicking "Job Alerts" tab renders nothing.

2. **SEO wrapper pages not used in routing** — `SEOJobDetail`, `SEOEmployerDetail`, `SEOCandidateDetail` exist but `App.tsx` routes directly to `JobDetail`, `CandidateDetail`, `EmployerDetail`, bypassing slug resolution and canonical URL redirects.

3. **2FA toggle is a placeholder** — SecuritySettings shows a 2FA toggle that just shows `toast.info('2FA setup coming soon')`. Since Supabase MFA (TOTP) is available, this should either be implemented or the section should clearly indicate it's planned with a proper "Coming Soon" badge instead of a functional-looking toggle.

4. **Payment integration placeholder** — Plans page shows `toast.info('Payment integration coming soon!')` when selecting a paid plan. This is expected for now but should be clearly marked.

5. **EmployerSettings page still exists as dead code** — It redirects to dashboard but the 67-line file is unnecessary weight.

### Implementation Plan

#### Task 1: Fix CandidateSettings Job Alerts tab
**File**: `src/pages/CandidateSettings.tsx`
- Move `JobAlertsManager` from inside `TabsContent value="privacy"` to its own `TabsContent value="alerts"` block
- This is a simple structural fix — the component already works, it's just in the wrong tab

#### Task 2: Wire SEO wrapper pages into App.tsx routing
**File**: `src/App.tsx`
- Import `SEOJobDetail`, `SEOEmployerDetail`, `SEOCandidateDetail`
- Replace `JobDetail` with `SEOJobDetail` on SEO-friendly slug routes (`/jobs/:country/:slug`, etc.)
- Replace `EmployerDetail` with `SEOEmployerDetail` on company slug routes
- Replace `CandidateDetail` with `SEOCandidateDetail` on candidate slug routes
- Keep UUID routes (`/jobs/:id`, `/candidates/:id`, `/employers/:id`) pointing to the original components for backward compatibility

#### Task 3: Fix 2FA section to be honest UI
**File**: `src/components/candidate/SecuritySettings.tsx`
- Replace the functional-looking Switch toggle with a clear "Coming Soon" badge
- Remove the misleading toggle that pretends to enable/disable 2FA
- Add a brief note: "Two-factor authentication will be available soon"

#### Task 4: Clean up dead EmployerSettings page
**File**: `src/pages/EmployerSettings.tsx`
- The route already redirects in App.tsx; the standalone page is unused dead code
- Remove the file or keep it minimal (it's only 67 lines and already redirects, so low priority)

### Technical Details

**Task 1 — CandidateSettings fix**: Lines 432-433 have `JobAlertsManager` inside `TabsContent value="privacy"`. Need to add a new `TabsContent value="alerts">` block after the security tab content with the `JobAlertsManager` inside it, and remove it from the privacy tab.

**Task 2 — SEO routing**: The SEO wrappers use `useSlugResolver` to resolve slugs and redirect UUIDs to canonical paths. Currently all routes bypass this. The fix maps:
- `/jobs/:country/:slug` → `SEOJobDetail` (instead of `JobDetail`)
- `/companies/:country/:slug` → `SEOEmployerDetail` (instead of `EmployerDetail`)
- `/candidates/:country/:slug` → `SEOCandidateDetail` (instead of `CandidateDetail`)

**Task 3 — 2FA**: Replace the `Switch` + `Badge` combo with a static "Coming Soon" indicator using a disabled badge, removing the false interactivity.

