

## Suggested Admin Features

Based on the existing admin modules (Dashboard, Analytics, Users, Employers, Candidates, Jobs, Applications, Moderation, Reports, Messages, Notifications, Plans, Categories, Content/SEO, Email Templates, Auto Apply, Government, System Health, Settings), here are high-value features that are currently missing:

### 1. Admin Bulk Email / Announcements
- Send platform-wide announcements to all users, or filtered segments (candidates only, employers only, verified employers, etc.)
- Template-based email blasts using the existing email templates system
- Schedule emails for future delivery
- Track open/delivery stats

### 2. Employer Revenue & Subscription Dashboard
- Detailed per-employer revenue breakdown (plan type, billing history, upgrades/downgrades)
- Churn tracking — employers who cancelled or downgraded
- Revenue forecasting chart based on active subscriptions
- Overdue payment alerts

### 3. Advanced Fraud Detection & IP Logging
- Track login IP addresses and flag suspicious activity (multiple accounts from same IP, rapid-fire job posts)
- Auto-flag employers with duplicate tax IDs or company names
- Suspicious application pattern detection (bot-like auto-apply abuse)
- Admin alert banner for flagged accounts

### 4. Admin Role Management UI
- Visual interface to assign/remove admin and moderator roles (currently only in AdminUsers but limited)
- Activity-based permission scoping (e.g., moderators can only access Moderation + Reports, not Settings or Plans)
- Audit trail per role change

### 5. Scheduled Jobs & Cron Monitor
- Dashboard showing all scheduled/automated tasks (job expiry cleanup, old message cleanup, auto-apply runs)
- Last run status, next run time, error logs
- Manual trigger button for each task
- Alert if a scheduled task hasn't run in expected window

### 6. Platform Feedback & Surveys
- In-app feedback collection from candidates and employers
- Admin-created micro-surveys (1-3 questions) triggered after key actions (e.g., after posting a job, after applying)
- Aggregate results with charts in admin analytics

### 7. Admin Activity Heatmap
- Visual calendar heatmap showing admin action volume per day
- Identify peak moderation periods
- Per-admin breakdown of actions taken

### 8. Data Export Center
- Centralized export hub for all entities (users, jobs, applications, employers, candidates)
- Scheduled/recurring exports (e.g., weekly CSV of new registrations)
- Export history log

### Implementation Priority

| Priority | Feature | Effort |
|----------|---------|--------|
| High | Employer Revenue Dashboard | Medium |
| High | Fraud Detection & IP Logging | Medium-High |
| High | Admin Role Management UI | Low-Medium |
| Medium | Bulk Email / Announcements | Medium |
| Medium | Scheduled Jobs Monitor | Medium |
| Low | Platform Feedback & Surveys | Medium |
| Low | Admin Activity Heatmap | Low |
| Low | Data Export Center | Low-Medium |

