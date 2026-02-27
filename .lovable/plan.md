

## AI-Driven Employer Verification & Auto-Approval System

This is a large, multi-layered feature. I recommend building it in phases to ship value incrementally. Here is the full plan:

---

### Phase 1: Database Schema (Migration)

**New table: `employer_verification_checks`** - Stores each verification check result per employer.

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid PK | |
| employer_id | uuid FK | Link to employer |
| check_type | text | `document_ocr`, `domain_email`, `google_business`, `fraud_detection` |
| status | text | `passed`, `failed`, `pending`, `skipped` |
| score | integer | Points earned (0-40) |
| details | jsonb | AI output, extracted data, match results |
| created_at | timestamptz | |

**New table: `employer_blacklist`** - Blocked domains, phone numbers, IPs.

| Column | Type |
|--------|------|
| id | uuid PK |
| type | text (`domain`, `phone`, `ip`, `document_hash`) |
| value | text |
| reason | text |
| created_by | uuid |
| created_at | timestamptz |

**Alter `employers` table** - Add columns:

- `trust_score` integer DEFAULT 0
- `verification_method` text (null, `ai_auto`, `manual`)
- `google_business_url` text
- `google_business_verified` boolean DEFAULT false
- `company_registration_url` text (document upload)
- `gst_license_url` text (document upload)
- `pan_url` text (document upload)
- `last_verification_at` timestamptz
- `next_reverification_at` timestamptz

**Add new `admin_settings` row**: `ai_verification` with value `{ auto_approval_enabled: true, google_business_mandatory: false, documents_mandatory: true, min_auto_approve_score: 80 }`

**Add new `feature_flags` row**: `ai_employer_verification` (enabled: true)

**RLS**: `employer_verification_checks` readable by admins and the employer's own user. `employer_blacklist` admin-only.

---

### Phase 2: Edge Function - `verify-employer`

A single backend function that orchestrates verification when triggered (after employer submits documents). Steps:

1. **Document AI Verification** (uses Gemini via Lovable AI)
   - Receive document URLs from storage
   - Send to Gemini vision model to extract: company name, registration number, address
   - Cross-match with employer form data
   - Check for duplicate document hashes in `employer_blacklist`
   - Score: up to +40

2. **Domain & Email Validation**
   - Parse employer's `hr_contact_email` domain
   - Compare with `website_url` domain
   - Check against temporary email domain list (hardcoded list of ~50 disposable domains)
   - Check domain against `employer_blacklist`
   - Score: up to +20

3. **Google Business Verification**
   - If `google_business_url` provided, fetch the page via the URL
   - Use Gemini to extract business name, address, phone from the page content
   - Match against employer data
   - Score: up to +30

4. **Fraud Detection Layer**
   - Check for duplicate company names in DB
   - Check phone/email against `employer_blacklist`
   - Check for same-day multiple registrations from similar data
   - Score: up to -50 penalty

5. **Final Decision**
   - Sum all scores → `trust_score`
   - 80+ → auto-approve (`verification_status = 'approved'`, `verification_method = 'ai_auto'`)
   - 50-79 → limited access (keep `pending`, add note)
   - Below 50 → flag for manual review, create `fraud_flags` entry
   - Set `next_reverification_at` to 6 months from now
   - Insert notification for admin with decision summary

---

### Phase 3: Employer-Facing UI Changes

**Company Profile Section** (`CompanyProfileSection.tsx`):
- Add upload fields for: Company Registration Certificate, GST/Business License, PAN (optional)
- Add Google Business Profile URL input
- Add "Submit for Verification" button that calls `verify-employer` edge function
- Show verification progress: "Verification in Progress" → "AI Verified" / "Under Review"

**Verification Badge** (`VerificationBadge.tsx`):
- Add new statuses: `ai_verified`, `under_review`, `verification_in_progress`
- Show "AI Verified Employer" + "Google Business Verified" sub-badges
- Display on company profile, job postings, and candidate-facing views

---

### Phase 4: Admin Dashboard - AI Verification Panel

**New admin page or tab in AdminEmployers**: `AI Verification Dashboard`

- **Trust Score column** in employer table with color-coded score badge
- **AI Decision Log**: expandable per-employer showing each `employer_verification_checks` entry with extracted data, match results, and scores
- **Override controls**: Admin can manually approve/reject regardless of AI score
- **Blacklist management**: Add/remove domains, phones, IPs to `employer_blacklist`
- **Settings toggles** (in AdminSettings): AI Auto Approval ON/OFF, Google Business mandatory, Documents mandatory, minimum auto-approve score slider

---

### Phase 5: Re-verification System

- Database function or cron job to flag employers where `next_reverification_at < now()`
- Send notification to employer to re-submit documents
- Admin dashboard shows "Re-verification Due" count

---

### Implementation Order

1. Database migration (schema + seed settings)
2. `verify-employer` edge function (core AI logic)
3. Employer UI (document uploads + submit for verification)
4. Admin UI (trust score display, decision logs, blacklist, settings)
5. VerificationBadge updates (AI verified states)
6. Re-verification cron setup

### Technical Notes

- Document AI uses Gemini vision (`google/gemini-2.5-flash`) via Lovable AI gateway - no additional API keys needed
- Documents stored in existing `employer-documents` storage bucket (private)
- Google Business verification does a lightweight URL fetch + AI extraction rather than requiring Google API keys
- All verification actions logged to `admin_action_logs` for audit trail
- Temporary email domain blocking uses a hardcoded list (~50 common disposable domains)

