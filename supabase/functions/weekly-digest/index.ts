import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let sentCount = 0;
  let errorCount = 0;

  try {
    // ─── CANDIDATE DIGESTS ───
    const { data: candidates } = await supabase
      .from('candidates')
      .select('id, profile_id, job_title, skills, preferred_locations, profiles!candidates_profile_id_fkey(user_id, full_name)')
      .limit(500);

    if (candidates) {
      for (const candidate of candidates) {
        try {
          const profile = (candidate as any).profiles;
          if (!profile?.user_id) continue;

          // Check email prefs
          const { data: prefs } = await supabase
            .from('notification_preferences')
            .select('email_notifications_enabled')
            .eq('user_id', profile.user_id)
            .maybeSingle();
          if (prefs?.email_notifications_enabled === false) continue;

          // Get user email
          const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
          const email = userData?.user?.email;
          if (!email) continue;

          // New matching jobs this week
          const { data: newJobs } = await supabase
            .from('jobs')
            .select('id, title, salary_range, location_city, employer_id, employers!jobs_employer_id_fkey(company_name)')
            .eq('is_active', true)
            .eq('status', 'open')
            .gte('created_at', oneWeekAgo)
            .limit(10);

          // Application updates this week
          const { data: appUpdates } = await supabase
            .from('applications')
            .select('id, status, updated_at, jobs!applications_job_id_fkey(title)')
            .eq('candidate_id', candidate.id)
            .gte('updated_at', oneWeekAgo)
            .limit(10);

          // Unread notifications count
          const { count: unreadCount } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.user_id)
            .eq('is_read', false);

          if (!newJobs?.length && !appUpdates?.length && !unreadCount) continue;

          const jobListHtml = (newJobs || []).slice(0, 5).map((j: any) =>
            `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
              <strong style="color:#111827;">${j.title}</strong>
              <br/><span style="color:#6b7280;font-size:13px;">${(j.employers as any)?.company_name || 'Company'} • ${j.location_city || 'Remote'} • ${j.salary_range || 'Competitive'}</span>
            </td></tr>`
          ).join('');

          const appListHtml = (appUpdates || []).map((a: any) =>
            `<tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;">
              <span style="color:#111827;">${(a.jobs as any)?.title || 'Job'}</span> — 
              <span style="color:#4285F4;font-weight:600;">${a.status}</span>
            </td></tr>`
          ).join('');

          const html = buildDigestEmail(
            profile.full_name || 'there',
            jobListHtml,
            appListHtml,
            newJobs?.length || 0,
            appUpdates?.length || 0,
            unreadCount || 0,
            'candidate'
          );

          await sendEmail(RESEND_API_KEY, email, `Your Weekly Job Digest — ${newJobs?.length || 0} new opportunities`, html);
          sentCount++;
        } catch {
          errorCount++;
        }
      }
    }

    // ─── EMPLOYER DIGESTS ───
    const { data: employers } = await supabase
      .from('employers')
      .select('id, company_name, profile_id, profiles!employers_profile_id_fkey(user_id, full_name)')
      .limit(500);

    if (employers) {
      for (const employer of employers) {
        try {
          const profile = (employer as any).profiles;
          if (!profile?.user_id) continue;

          const { data: prefs } = await supabase
            .from('notification_preferences')
            .select('email_notifications_enabled')
            .eq('user_id', profile.user_id)
            .maybeSingle();
          if (prefs?.email_notifications_enabled === false) continue;

          const { data: userData } = await supabase.auth.admin.getUserById(profile.user_id);
          const email = userData?.user?.email;
          if (!email) continue;

          // New applications this week
          const { data: newApps } = await supabase
            .from('applications')
            .select('id, status, created_at, candidates!applications_candidate_id_fkey(job_title), jobs!applications_job_id_fkey(title)')
            .in('job_id', 
              (await supabase.from('jobs').select('id').eq('employer_id', employer.id)).data?.map((j: any) => j.id) || []
            )
            .gte('created_at', oneWeekAgo)
            .limit(10);

          // Active job stats
          const { count: activeJobs } = await supabase
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .eq('employer_id', employer.id)
            .eq('is_active', true);

          if (!newApps?.length) continue;

          const appListHtml = (newApps || []).map((a: any) =>
            `<tr><td style="padding:6px 0;border-bottom:1px solid #f0f0f0;">
              <strong style="color:#111827;">${(a.candidates as any)?.job_title || 'Candidate'}</strong>
              applied for <em>${(a.jobs as any)?.title || 'a position'}</em>
            </td></tr>`
          ).join('');

          const html = buildDigestEmail(
            profile.full_name || employer.company_name,
            '',
            appListHtml,
            0,
            newApps?.length || 0,
            activeJobs || 0,
            'employer'
          );

          await sendEmail(RESEND_API_KEY, email, `Weekly Hiring Update — ${newApps?.length || 0} new applicants`, html);
          sentCount++;
        } catch {
          errorCount++;
        }
      }
    }

    return new Response(JSON.stringify({ sent: sentCount, errors: errorCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'Hire for Job <noreply@hireforjob.com>',
      to: [to],
      subject,
      html,
    }),
  });
}

function buildDigestEmail(
  name: string,
  jobListHtml: string,
  appListHtml: string,
  newJobsCount: number,
  appCount: number,
  extraCount: number,
  userType: 'candidate' | 'employer'
): string {
  const greeting = `Hi ${name},`;
  const isCand = userType === 'candidate';

  const statsHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        ${isCand ? `
        <td style="text-align:center;padding:12px;background:#EFF6FF;border-radius:8px;width:33%;">
          <div style="font-size:24px;font-weight:700;color:#2563EB;">${newJobsCount}</div>
          <div style="font-size:12px;color:#6b7280;">New Jobs</div>
        </td>
        <td width="8"></td>
        ` : ''}
        <td style="text-align:center;padding:12px;background:#F0FDF4;border-radius:8px;width:33%;">
          <div style="font-size:24px;font-weight:700;color:#16A34A;">${appCount}</div>
          <div style="font-size:12px;color:#6b7280;">${isCand ? 'App Updates' : 'New Applicants'}</div>
        </td>
        <td width="8"></td>
        <td style="text-align:center;padding:12px;background:#FEF3C7;border-radius:8px;width:33%;">
          <div style="font-size:24px;font-weight:700;color:#D97706;">${extraCount}</div>
          <div style="font-size:12px;color:#6b7280;">${isCand ? 'Unread' : 'Active Jobs'}</div>
        </td>
      </tr>
    </table>`;

  const jobsSection = jobListHtml ? `
    <h3 style="color:#111827;margin:20px 0 8px;font-size:16px;">🔥 New Jobs This Week</h3>
    <table width="100%" cellpadding="0" cellspacing="0">${jobListHtml}</table>
    <a href="https://hireforjob1.lovable.app" style="display:inline-block;margin:12px 0;color:#2563EB;font-weight:600;font-size:14px;">View all jobs →</a>
  ` : '';

  const appsSection = appListHtml ? `
    <h3 style="color:#111827;margin:20px 0 8px;font-size:16px;">${isCand ? '📋 Application Updates' : '👥 New Applicants'}</h3>
    <table width="100%" cellpadding="0" cellspacing="0">${appListHtml}</table>
    <a href="https://hireforjob1.lovable.app/${isCand ? 'candidate' : 'employer'}-dashboard" style="display:inline-block;margin:12px 0;color:#2563EB;font-weight:600;font-size:14px;">Go to dashboard →</a>
  ` : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:#4285F4;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">📬 Your Weekly Digest</h1>
        </td></tr>
        <tr><td style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
          <p style="color:#111827;font-size:16px;margin:0 0 4px;">${greeting}</p>
          <p style="color:#6b7280;font-size:14px;margin:0 0 16px;">Here's what happened on Hire for Job this week:</p>
          ${statsHtml}
          ${jobsSection}
          ${appsSection}
        </td></tr>
        <tr><td style="padding:20px 32px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            You're receiving this weekly digest from Hire for Job.<br/>
            <a href="https://hireforjob1.lovable.app/candidate-settings" style="color:#6b7280;">Manage preferences</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
