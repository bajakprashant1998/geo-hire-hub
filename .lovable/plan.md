

# Plan: Four Gap Fixes

## 1. Employer "New Applications" Realtime Filter

**Problem**: The employer listener subscribes to ALL application inserts, then queries the DB to check ownership -- wasteful.

**Approach**: Add an `employer_id` denormalized column to the `applications` table (populated via trigger from `jobs.employer_id` on insert). Then the realtime subscription can use a Postgres filter: `filter: employer_id=eq.${employerId}`, eliminating the extra query.

- **Migration**: Add `employer_id uuid` column to `applications` with FK to `employers(id)`. Create a trigger `set_application_employer_id` that copies `jobs.employer_id` into the new column on INSERT. Backfill existing rows.
- **Code change**: In `useRealtimeDashboard.ts`, replace the unfiltered `applications` INSERT listener + async DB check with a filtered subscription: `filter: employer_id=eq.${employerId}`. Remove the `async` callback and DB query.

## 2. Job View Count Sync

**Problem**: `jobs.view_count` is never updated from `job_views` table entries, causing stale display.

**Approach**: Create a trigger on `job_views` INSERT that increments `jobs.view_count`.

- **Migration**: Create function `increment_job_view_count()` that does `UPDATE jobs SET view_count = view_count + 1 WHERE id = NEW.job_id`. Attach as AFTER INSERT trigger on `job_views`. Backfill existing counts with `UPDATE jobs SET view_count = (SELECT COUNT(*) FROM job_views WHERE job_views.job_id = jobs.id)`.

## 3. Notification Sound

**Problem**: `useMessageNotifications.ts` plays `/notification.mp3` which doesn't exist.

**Approach**: Generate a simple notification sound using the Web Audio API as a fallback, since we can't add binary files. Replace the `new Audio('/notification.mp3')` call with an inline Web Audio API beep (short sine wave tone). This is self-contained, requires no external file, and works across browsers.

- **Code change**: In `useMessageNotifications.ts`, replace the `try { new Audio(...) }` block with a Web Audio API helper that plays a brief 440Hz tone at 0.3 volume.

## 4. Employer Profile Views on BrowseJobs

**Problem**: Employer "Profile Views" stat undercounts because browsing job cards doesn't record a view.

**Approach**: This is intentionally NOT a profile view -- viewing a job card is a job impression, not a profile visit. Recording profile_views here would inflate the metric and mislead employers. Instead, we'll record `job_views` (impressions) when cards enter the viewport on BrowseJobs, and surface a separate "Job Impressions" count on the employer dashboard.

Actually, the simpler and more accurate fix: add a "Job Impressions" stat derived from `job_views` count on the employer dashboard, which already partially exists. The profile_views metric should stay scoped to actual profile page visits.

**Revised approach**: Skip this -- the current behavior is correct. Profile views should only count actual profile page visits. The employer dashboard already shows job view data via analytics. No code change needed here.

---

## Summary of Changes

| # | File(s) | What |
|---|---------|------|
| 1 | Migration + `useRealtimeDashboard.ts` | Add `employer_id` to applications, filter realtime |
| 2 | Migration | Trigger to sync `job_views` → `jobs.view_count` |
| 3 | `useMessageNotifications.ts` | Replace missing MP3 with Web Audio API beep |
| 4 | None | No change -- current behavior is correct |

