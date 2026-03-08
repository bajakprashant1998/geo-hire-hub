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
    // Get all active saved searches
    const { data: searches, error: searchErr } = await supabase
      .from('employer_saved_searches')
      .select('*, employers!inner(profile_id, profiles!inner(user_id, full_name))')
      .eq('is_active', true);

    if (searchErr || !searches?.length) {
      return new Response(JSON.stringify({ processed: 0, reason: searchErr?.message || 'No active searches' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalNotified = 0;

    for (const search of searches) {
      const filters = search.filters as any;
      const employerUserId = (search.employers as any)?.profiles?.user_id;
      const employerName = (search.employers as any)?.profiles?.full_name;

      if (!employerUserId) continue;

      // Build candidate query based on saved filters
      let query = supabase
        .from('candidates')
        .select('id, job_title, skills, experience_years, profile_id, city, country, preferred_job_types, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      // Only check candidates created since last notification (or last 7 days)
      const sinceDate = search.last_notified_at || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', sinceDate);

      // Apply filters
      if (filters.skills?.length > 0) {
        query = query.overlaps('skills', filters.skills);
      }
      if (filters.location) {
        query = query.or(`city.ilike.%${filters.location}%,country.ilike.%${filters.location}%`);
      }
      if (filters.experienceRange && filters.experienceRange[0] > 0) {
        query = query.gte('experience_years', filters.experienceRange[0]);
      }
      if (filters.experienceRange && filters.experienceRange[1] < 30) {
        query = query.lte('experience_years', filters.experienceRange[1]);
      }
      if (filters.workType) {
        query = query.contains('preferred_job_types', [filters.workType]);
      }

      const { data: candidates } = await query;
      if (!candidates?.length) continue;

      // Filter out already-notified candidates
      const candidateIds = candidates.map(c => c.id);
      const { data: alreadyNotified } = await supabase
        .from('saved_search_notifications')
        .select('candidate_id')
        .eq('search_id', search.id)
        .in('candidate_id', candidateIds);

      const notifiedSet = new Set(alreadyNotified?.map(n => n.candidate_id) || []);
      const newCandidates = candidates.filter(c => !notifiedSet.has(c.id));

      if (newCandidates.length === 0) continue;

      // Also apply keyword search filter client-side
      let matched = newCandidates;
      if (filters.search) {
        const kw = filters.search.toLowerCase();
        matched = matched.filter(c =>
          c.job_title?.toLowerCase().includes(kw) ||
          c.skills?.some((s: string) => s.toLowerCase().includes(kw))
        );
      }

      if (matched.length === 0) continue;

      // Create in-app notification
      const candidateNames = matched.slice(0, 3).map(c => c.job_title).join(', ');
      const moreCount = matched.length > 3 ? ` and ${matched.length - 3} more` : '';

      await supabase.from('notifications').insert({
        user_id: employerUserId,
        type: 'saved_search_match',
        title: `${matched.length} new candidate${matched.length > 1 ? 's' : ''} match "${search.name}"`,
        message: `New profiles: ${candidateNames}${moreCount}`,
        link: '/employer-dashboard?tab=candidates',
      });

      // Send push notification
      if (search.notify_push) {
        try {
          await fetch(`${BASE_URL}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              user_id: employerUserId,
              title: `🔍 ${matched.length} new match${matched.length > 1 ? 'es' : ''} for "${search.name}"`,
              body: `New profiles: ${candidateNames}${moreCount}`,
              url: '/employer-dashboard?tab=candidates',
              tag: `saved-search-${search.id}`,
            }),
          });
        } catch { /* best-effort */ }
      }

      // Send email notification
      if (search.notify_email) {
        try {
          await fetch(`${BASE_URL}/functions/v1/send-notification-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              user_id: employerUserId,
              title: `New candidates match your saved search "${search.name}"`,
              message: `Hi ${employerName || 'there'},\n\n${matched.length} new candidate${matched.length > 1 ? 's' : ''} match your saved search criteria.\n\nProfiles: ${candidateNames}${moreCount}\n\nSign in to review them now.`,
            }),
          });
        } catch { /* best-effort */ }
      }

      // Record notifications to avoid duplicates
      const notifications = matched.map(c => ({
        search_id: search.id,
        candidate_id: c.id,
      }));
      await supabase.from('saved_search_notifications').insert(notifications);

      // Update search metadata
      await supabase
        .from('employer_saved_searches')
        .update({
          last_notified_at: new Date().toISOString(),
          matched_count: (search.matched_count || 0) + matched.length,
        })
        .eq('id', search.id);

      totalNotified += matched.length;
    }

    return new Response(JSON.stringify({ processed: searches.length, notified: totalNotified }), {
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
