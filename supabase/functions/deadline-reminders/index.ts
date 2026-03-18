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

  const BASE_URL = Deno.env.get('SUPABASE_URL')!;

  try {
    const now = new Date();
    const in1Day = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find active jobs expiring within 1 day or 3 days
    const { data: expiringJobs } = await supabase
      .from('jobs')
      .select('id, title, expires_at, employer_id')
      .eq('is_active', true)
      .eq('status', 'open')
      .not('expires_at', 'is', null)
      .gte('expires_at', now.toISOString())
      .lte('expires_at', in3Days.toISOString());

    if (!expiringJobs?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'No expiring jobs found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalSent = 0;

    for (const job of expiringJobs) {
      const expiresAt = new Date(job.expires_at);
      const hoursLeft = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      const reminderType = hoursLeft <= 24 ? '1_day' : '3_day';

      // Get candidates who saved this job OR applied (status pending/reviewing)
      const { data: savedCandidates } = await supabase
        .from('saved_jobs')
        .select('candidate_id')
        .eq('job_id', job.id);

      const { data: appliedCandidates } = await supabase
        .from('applications')
        .select('candidate_id')
        .eq('job_id', job.id)
        .in('status', ['pending', 'reviewing']);

      // Merge unique candidate IDs (saved but not yet applied get urgency reminder,
      // applied candidates get deadline awareness)
      const candidateIds = new Set<string>();
      savedCandidates?.forEach(s => candidateIds.add(s.candidate_id));
      appliedCandidates?.forEach(a => candidateIds.add(a.candidate_id));

      if (candidateIds.size === 0) continue;

      for (const candidateId of candidateIds) {
        // Check if already sent
        const { data: existing } = await supabase
          .from('deadline_reminders_sent')
          .select('id')
          .eq('candidate_id', candidateId)
          .eq('job_id', job.id)
          .eq('reminder_type', reminderType)
          .maybeSingle();

        if (existing) continue;

        // Get candidate's user_id
        const { data: candidate } = await supabase
          .from('candidates')
          .select('profile_id')
          .eq('id', candidateId)
          .single();

        if (!candidate) continue;

        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('id', candidate.profile_id)
          .single();

        if (!profile) continue;

        const urgency = reminderType === '1_day' ? '⚠️ Last day' : '📅 3 days left';
        const deadlineDate = expiresAt.toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
        });

        // Create in-app notification
        await supabase.from('notifications').insert({
          user_id: profile.user_id,
          type: 'deadline_reminder',
          title: `${urgency} to apply: ${job.title}`,
          message: `The application deadline for "${job.title}" is ${deadlineDate}. Don't miss out!`,
          link: `/jobs/${job.id}`,
        });

        // Send push notification
        try {
          await fetch(`${BASE_URL}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              user_id: profile.user_id,
              title: `${urgency} to apply!`,
              body: `"${job.title}" closes ${deadlineDate}`,
              url: `/jobs/${job.id}`,
              tag: `deadline-${job.id}`,
            }),
          });
        } catch { /* push is best-effort */ }

        // Send email notification
        try {
          await fetch(`${BASE_URL}/functions/v1/send-notification-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              user_id: profile.user_id,
              title: `${urgency} — "${job.title}" closing ${deadlineDate}`,
              message: `Hi ${profile.full_name || 'there'},\n\nThe application deadline for "${job.title}" is approaching (${deadlineDate}). ${
                reminderType === '1_day'
                  ? "This is your last chance to apply — don't miss out!"
                  : "Make sure to submit your application before it closes."
              }`,
            }),
          });
        } catch { /* email is best-effort */ }

        // Record that reminder was sent
        await supabase.from('deadline_reminders_sent').insert({
          candidate_id: candidateId,
          job_id: job.id,
          reminder_type: reminderType,
        });

        totalSent++;
      }
    }

    return new Response(JSON.stringify({ sent: totalSent, jobs_checked: expiringJobs.length }), {
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
