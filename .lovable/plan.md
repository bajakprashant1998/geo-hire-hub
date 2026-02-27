

## Plan: Automated Email Notification System

### Current State
- `email_templates` table exists with 5 templates (welcome, password_reset, application_received, application_status, interview_scheduled)
- `send-notification-email` edge function exists but uses a hardcoded HTML template instead of the DB templates
- `notification_preferences` table exists with `email_notifications_enabled` toggle
- DB triggers already create in-app notifications (`notify_interview_event`, `notify_application_status_change`) but don't trigger emails
- Admin email templates page exists at `/admin/email-templates`
- No `email_logs` table exists for tracking sent emails
- RESEND_API_KEY secret is configured

### What We'll Build

**1. Database: Add email_logs table + new templates**
- Create `email_logs` table (id, template_key, recipient_email, recipient_user_id, subject, status, error_message, metadata, created_at)
- RLS: admins can read all, users can read their own
- Add missing templates: `job_application_submitted`, `new_message`, `employer_welcome`, `interview_request`, `job_post_approved`

**2. Rewrite `send-notification-email` edge function**
- Fetch the matching template from `email_templates` by `template_key`
- Replace `{{variables}}` with provided data
- Wrap in a branded HTML shell (logo, primary color #4285F4, footer with unsubscribe link)
- Log every send attempt to `email_logs` (success or failure)
- Respect `notification_preferences` (existing logic)
- Accept: `{ user_id, template_key, variables: Record<string, string> }`

**3. Create `notify-by-email` DB trigger function**
A new PL/pgSQL function + triggers that call the edge function via `pg_net` to send emails on key events:
- **Application inserted** → email employer (`application_received`) + email candidate (`job_application_submitted`)
- **Application status updated** → email candidate (`application_status`)
- **Interview inserted** → email candidate (`interview_scheduled`) or employer (`interview_request`)
- **Message inserted** → email recipient (`new_message`) — debounced by checking if last email for this conversation was <5min ago

Since `pg_net` may not be available, we'll instead use a simpler approach: call the edge function from the existing DB trigger functions (`notify_application_status_change`, `notify_interview_event`) by extending the in-app notification inserts — and add a separate lightweight trigger on the `notifications` table that invokes the edge function.

**4. Add notification-triggered email dispatch**
- Create a DB trigger on `notifications` INSERT that calls `send-notification-email` via `net.http_post`
- This means every in-app notification automatically gets an email (if user has emails enabled)
- The trigger maps notification `type` → `template_key` and passes relevant variables

**5. Enhance admin email templates page**
- Add "Email Logs" tab showing recent sends from `email_logs` with status, recipient, template, timestamp
- Add "Send Test Email" button per template
- Add template creation for missing notification types

**6. Add candidate/employer-specific templates with branded HTML**

All templates will use a consistent branded wrapper:
- Header: blue bar (#4285F4) with "Hire for Job" logo
- Body: clean white card with content
- CTA button: blue rounded button with contextual action text
- Footer: "Manage notification preferences" link + unsubscribe

### Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create `email_logs` table, insert new templates, create trigger on `notifications` |
| `supabase/functions/send-notification-email/index.ts` | Rewrite to use DB templates, log to `email_logs` |
| `src/pages/admin/AdminEmailTemplates.tsx` | Add Email Logs tab, Send Test button |

### Technical Details

**send-notification-email flow:**
```text
Request { user_id, template_key, variables }
  → Check notification_preferences
  → Fetch email_templates by template_key
  → Replace {{var}} placeholders
  → Wrap in branded HTML shell
  → Send via Resend API
  → Log to email_logs (success/error)
  → Return result
```

**Notification → Email trigger:**
```text
INSERT INTO notifications
  → AFTER INSERT trigger
  → Maps type to template_key
  → Calls net.http_post to send-notification-email
  → Passes user_id + inferred variables from notification data
```

**Template key mapping:**
- `application_update` → `application_status` template
- `interview_scheduled` / `interview_confirmed` → `interview_scheduled` template
- `interview_request` → `interview_request` template
- `new_message` → `new_message` template
- Registration → called directly from signup edge function

