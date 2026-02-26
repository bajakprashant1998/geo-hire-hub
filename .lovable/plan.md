

## Full Platform Audit Report — Job Portal SaaS

---

### CRITICAL BUGS (P0 — Fix Immediately)

| # | Area | Issue | Impact |
|---|------|-------|--------|
| 1 | **Login Page** | Google Sign-In button appears **twice** — once above the form (line 257) and once below inside the form (line 360). Duplicate OAuth trigger. | UX confusion, possible double-click race condition |
| 2 | **Security — XSS** | `dangerouslySetInnerHTML` used in `CareerBuddyChat.tsx` (line 433) with AI-generated content passed through a custom `formatMarkdown()` function — no DOMPurify sanitization. AI responses could contain malicious HTML. | **XSS attack vector** via prompt injection |
| 3 | **Security — XSS** | `AdminEmailTemplates.tsx` uses `dangerouslySetInnerHTML` (lines 230, 260) for admin-authored HTML email templates. Even admin input should be sanitized. | Stored XSS if admin account is compromised |
| 4 | **Security — RLS** | Security scan found **4 ERROR-level** findings: `profiles`, `candidates`, `employers`, and `jobs` tables expose sensitive PII (GPS coords, tax IDs, salaries, phone numbers) to unauthenticated users via overly permissive SELECT policies. | **Mass data scraping** of personal information |
| 5 | **Security — RLS** | `profile_views` table has `WITH CHECK (true)` INSERT policy — anyone (even unauthenticated) can insert arbitrary profile view records. | Data pollution, fake view counts |
| 6 | **Auth** | Leaked password protection is **disabled** in the auth configuration. Users can sign up with known-breached passwords. | Account compromise risk |

---

### HIGH PRIORITY (P1)

| # | Area | Issue |
|---|------|-------|
| 7 | **Candidate Dashboard** | Interview count (line 124) uses `status === 'shortlisted'` from applications — doesn't query the `interviews` table at all. Mismatch with the two-way interview system that uses statuses like `requested`, `confirmed`, `scheduled`. |
| 8 | **Employer Dashboard** | Interview count queries `status = 'scheduled'` (line 163) but the new interview system uses `confirmed` as the confirmed status. Count will always be 0 for new interviews. |
| 9 | **Candidate Messages** | Unread messages query (line 121) filters by `.neq('sender_id', profile.id)` but uses `profile.id` instead of `user.id`. Messages use `user_id` as sender_id, not profile_id — this will return incorrect unread counts. |
| 10 | **Signup** | No password strength validation on client side — only checks password match. Users can set `a` as password. Minimum length should be enforced. |
| 11 | **Signup** | Phone number field has no format validation. Any text is accepted. |
| 12 | **Input Validation** | Job posting form (PostJob.tsx) has no server-side input length validation. Title, description, and other fields accept unlimited text. |
| 13 | **Employer Dashboard** | `TaskManager` component causes React warning: "Function components cannot be given refs" with AnimatePresence (visible in console logs). |

---

### MEDIUM PRIORITY (P2)

| # | Area | Issue |
|---|------|-------|
| 14 | **Admin** | No rate limiting on admin login attempts. Brute force possible since admin check is client-side RPC after successful auth. |
| 15 | **Auto Apply** | Edge function uses `SUPABASE_SERVICE_ROLE_KEY` (admin client) for all operations — bypasses RLS entirely. If the function has a bug, it could access/modify any data. |
| 16 | **AI System** | Gemini API calls in edge functions have no input sanitization. User-provided content (job titles, skills, messages) is concatenated directly into prompts — prompt injection risk. |
| 17 | **AI System** | Career Buddy sends full candidate profile data (salary, address, skills) to external Gemini API. Privacy concern — sensitive PII leaves the platform. |
| 18 | **Performance** | Employer dashboard `fetchEmployerData()` makes 7+ sequential database calls (employer, jobs, applications per job, interviews, profile views, notifications, subscriptions). N+1 query problem with application counts per job. |
| 19 | **Performance** | Candidate dashboard makes 5+ sequential queries on load. No query batching or caching. |
| 20 | **File Upload** | Resume upload (ResumeUpload.tsx) validates extension but not MIME type. Users can rename malicious files to .pdf and upload. |

---

### LOW PRIORITY (P3)

| # | Area | Issue |
|---|------|-------|
| 21 | **UX** | Salary parsing in PostJob edit mode (line 287) only matches `₹` symbol — breaks for USD, EUR, or other currencies. |
| 22 | **UX** | Job drafts auto-save only saves the most recent draft. Multiple draft support exists in `JobDraftsSection` but auto-save overwrites the first found draft. |
| 23 | **Admin** | Admin audit trail (`admin_action_logs`) has no external oversight mechanism as noted by security scan. |
| 24 | **Notifications** | Interview notification trigger creates notifications but email delivery depends on the `send-notification-email` edge function which isn't called from the trigger. |
| 25 | **SEO** | Canonical URLs in Login/Signup hardcode `hireforjob.com` but the actual published URL is `hireforjob1.lovable.app`. |

---

### SECURITY RISK SUMMARY

| Risk | Severity | Status |
|------|----------|--------|
| XSS via dangerouslySetInnerHTML (AI chat + email templates) | **Critical** | Unmitigated |
| PII exposure via permissive RLS (profiles, candidates, employers, jobs) | **Critical** | Unmitigated |
| Leaked password protection disabled | **High** | Disabled |
| No client-side password strength enforcement | **High** | Missing |
| Prompt injection in AI edge functions | **Medium** | Unmitigated |
| Service role key usage in auto-apply bypasses RLS | **Medium** | By design but risky |
| No rate limiting on auth endpoints | **Medium** | Missing |
| MIME type validation missing on file uploads | **Low** | Missing |

---

### AI ACCURACY ISSUES

| System | Issue |
|--------|-------|
| **Job Match** | Gemini-based scoring is non-deterministic. Same candidate-job pair can get different scores on retry. No caching of scores. |
| **Career Buddy** | No DOMPurify on AI output. Custom markdown parser could be bypassed with crafted HTML in AI response. |
| **Auto Apply** | Match threshold comparison works correctly but salary comparison (line ~156 in edge function) strips all non-numeric chars — could misparse ranges like "50,000 - 70,000". |
| **Salary Insights** | Relies entirely on Gemini with no ground-truth data validation. Predictions are unverifiable. |

---

### PERFORMANCE BOTTLENECKS

| Area | Issue | Fix |
|------|-------|-----|
| Employer dashboard load | 7+ sequential DB calls, N+1 for app counts | Use single RPC or parallel Promise.all |
| Candidate dashboard load | 5+ sequential queries | Batch into fewer calls |
| Job posting wizard | Auto-save fires every 30s with full draft payload | Debounce on change instead |
| Interview scheduling | Each status change triggers full data refetch | Use optimistic updates |

---

### PRODUCTION READINESS SCORE

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Core Functionality | 75/100 | 25% | 18.75 |
| Security | 40/100 | 30% | 12.00 |
| UI/UX Polish | 80/100 | 15% | 12.00 |
| Performance | 55/100 | 15% | 8.25 |
| AI Accuracy | 60/100 | 10% | 6.00 |
| Data Integrity | 65/100 | 5% | 3.25 |
| **Total** | | | **60/100** |

---

### RECOMMENDED FIX PRIORITY

1. **Immediate**: Add DOMPurify to all `dangerouslySetInnerHTML` usage
2. **Immediate**: Tighten RLS on profiles/candidates/employers/jobs to hide PII from anon users
3. **Immediate**: Enable leaked password protection
4. **Day 1**: Fix interview status count mismatches (candidate: shortlisted→confirmed, employer: scheduled→confirmed)
5. **Day 1**: Fix unread messages query (profile.id → user.id)
6. **Day 1**: Remove duplicate Google Sign-In button from Login page
7. **Week 1**: Add password strength validation, phone format validation
8. **Week 1**: Add input length limits to job posting fields
9. **Week 1**: Optimize dashboard queries (batch/parallel)
10. **Week 2**: Add rate limiting, prompt injection guards, MIME validation

