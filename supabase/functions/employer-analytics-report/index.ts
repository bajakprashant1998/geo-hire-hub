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

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No auth');

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error('Invalid token');

    const { employer_id } = await req.json();
    if (!employer_id) throw new Error('employer_id required');

    // Verify ownership
    const { data: employer } = await supabase
      .from('employers')
      .select('id, company_name, profile_id, profiles!employers_profile_id_fkey(user_id)')
      .eq('id', employer_id)
      .single();

    if (!employer || (employer as any).profiles?.user_id !== user.id) {
      throw new Error('Access denied');
    }

    // Fetch analytics
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, title, view_count')
      .eq('employer_id', employer_id)
      .limit(50);

    const jobRows = await Promise.all(
      (jobs || []).map(async (job) => {
        const [{ count: apps }, { count: interviews }] = await Promise.all([
          supabase.from('applications').select('*', { count: 'exact', head: true }).eq('job_id', job.id),
          supabase.from('interviews').select('*', { count: 'exact', head: true }).eq('job_id', job.id),
        ]);
        const { count: hired } = await supabase
          .from('applications').select('*', { count: 'exact', head: true })
          .eq('job_id', job.id).eq('status', 'hired');
        return { title: job.title, views: job.view_count || 0, apps: apps || 0, interviews: interviews || 0, hired: hired || 0 };
      })
    );

    const totals = jobRows.reduce((a, j) => ({
      views: a.views + j.views, apps: a.apps + j.apps,
      interviews: a.interviews + j.interviews, hired: a.hired + j.hired,
    }), { views: 0, apps: 0, interviews: 0, hired: 0 });

    const convRate = totals.views > 0 ? ((totals.apps / totals.views) * 100).toFixed(1) : '0';
    const intRate = totals.apps > 0 ? ((totals.interviews / totals.apps) * 100).toFixed(1) : '0';
    const hireRate = totals.interviews > 0 ? ((totals.hired / totals.interviews) * 100).toFixed(1) : '0';
    const overallRate = totals.views > 0 ? ((totals.hired / totals.views) * 100).toFixed(2) : '0';

    const weekStart = new Date(Date.now() - 7 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEnd = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Build job rows HTML
    const jobTableRows = jobRows
      .sort((a, b) => b.apps - a.apps)
      .slice(0, 15)
      .map((j, i) => {
        const conv = j.views > 0 ? ((j.apps / j.views) * 100).toFixed(1) + '%' : '—';
        const bg = i % 2 === 0 ? '#f9fafb' : '#ffffff';
        return `<tr style="background:${bg};">
          <td style="padding:8px 12px;font-size:13px;color:#111827;">${j.title.length > 30 ? j.title.slice(0, 30) + '…' : j.title}</td>
          <td style="padding:8px 12px;text-align:center;font-size:13px;">${j.views}</td>
          <td style="padding:8px 12px;text-align:center;font-size:13px;">${j.apps}</td>
          <td style="padding:8px 12px;text-align:center;font-size:13px;">${j.interviews}</td>
          <td style="padding:8px 12px;text-align:center;font-size:13px;font-weight:600;color:#16a34a;">${j.hired}</td>
          <td style="padding:8px 12px;text-align:center;font-size:13px;color:#4285F4;">${conv}</td>
        </tr>`;
      }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
        <tr><td style="background:#4285F4;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">📊 Hiring Analytics Report</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${employer.company_name} • ${weekStart} – ${weekEnd}</p>
        </td></tr>
        <tr><td style="background:#fff;padding:28px 32px;border:1px solid #e5e7eb;border-top:none;">
          <h2 style="color:#111827;font-size:16px;margin:0 0 16px;">Hiring Funnel</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td style="text-align:center;padding:14px 8px;background:#EFF6FF;border-radius:8px;">
                <div style="font-size:28px;font-weight:700;color:#2563EB;">${totals.views}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px;">Views</div>
              </td>
              <td width="6"></td>
              <td style="text-align:center;padding:14px 8px;background:#F0FDF4;border-radius:8px;">
                <div style="font-size:28px;font-weight:700;color:#16A34A;">${totals.apps}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px;">Applications</div>
                <div style="font-size:10px;color:#4285F4;margin-top:2px;">${convRate}% conv</div>
              </td>
              <td width="6"></td>
              <td style="text-align:center;padding:14px 8px;background:#FEF3C7;border-radius:8px;">
                <div style="font-size:28px;font-weight:700;color:#D97706;">${totals.interviews}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px;">Interviews</div>
                <div style="font-size:10px;color:#4285F4;margin-top:2px;">${intRate}% conv</div>
              </td>
              <td width="6"></td>
              <td style="text-align:center;padding:14px 8px;background:#F0FDF4;border-radius:8px;">
                <div style="font-size:28px;font-weight:700;color:#16A34A;">${totals.hired}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px;">Hired</div>
                <div style="font-size:10px;color:#4285F4;margin-top:2px;">${hireRate}% conv</div>
              </td>
            </tr>
          </table>
          <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
            <span style="font-size:12px;color:#6b7280;">Overall Funnel Efficiency (Views → Hired):</span>
            <span style="font-size:16px;font-weight:700;color:#2563EB;margin-left:8px;">${overallRate}%</span>
          </div>
          ${jobRows.length > 0 ? `
          <h2 style="color:#111827;font-size:16px;margin:0 0 12px;">Job Performance</h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <tr style="background:#f3f4f6;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;">Job</th>
              <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;">Views</th>
              <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;">Apps</th>
              <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;">Interviews</th>
              <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;">Hired</th>
              <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;">Conv%</th>
            </tr>
            ${jobTableRows}
          </table>` : '<p style="color:#6b7280;font-size:13px;">No jobs posted yet.</p>'}
          <div style="margin-top:24px;text-align:center;">
            <a href="https://hireforjob1.lovable.app/employer-dashboard" style="display:inline-block;background:#4285F4;color:#fff;padding:10px 28px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">View Full Dashboard →</a>
          </div>
        </td></tr>
        <tr><td style="padding:20px 32px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">Hire for Job Analytics Report<br/>
            <a href="https://hireforjob1.lovable.app/employer-dashboard" style="color:#6b7280;">Manage reports</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    // Send email
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: 'Hire for Job <noreply@hireforjob.com>',
        to: [user.email],
        subject: `📊 Hiring Report — ${employer.company_name} (${weekStart} – ${weekEnd})`,
        html,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
