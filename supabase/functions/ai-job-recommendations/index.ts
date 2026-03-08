import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate user
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get candidate profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, latitude, longitude")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: candidate } = await supabase
      .from("candidates")
      .select("id, job_title, skills, experience_years, preferred_locations, preferred_job_types, expected_salary, remote_preference, industry_preference")
      .eq("profile_id", profile.id)
      .single();

    if (!candidate) {
      return new Response(JSON.stringify({ recommendations: [], reason: "No candidate profile" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get behavioral signals
    const [appliedRes, viewedRes, savedRes] = await Promise.all([
      supabase
        .from("applications")
        .select("job_id, jobs(title, job_type, employers(industry))")
        .eq("candidate_id", candidate.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("job_views")
        .select("job_id, jobs(title, job_type)")
        .eq("viewer_id", user.id)
        .order("viewed_at", { ascending: false })
        .limit(30),
      supabase
        .from("saved_jobs")
        .select("job_id, jobs(title, job_type, employers(industry))")
        .eq("candidate_id", candidate.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    // Extract behavioral patterns
    const appliedJobs = appliedRes.data || [];
    const viewedJobs = viewedRes.data || [];
    const savedJobs = savedRes.data || [];
    const appliedJobIds = new Set(appliedJobs.map((a: any) => a.job_id));

    // Infer preferences from behavior
    const behaviorJobTypes: Record<string, number> = {};
    const behaviorIndustries: Record<string, number> = {};
    const behaviorTitleWords: Record<string, number> = {};

    [...appliedJobs, ...savedJobs, ...viewedJobs].forEach((item: any) => {
      const job = item.jobs;
      if (!job) return;
      if (job.job_type) behaviorJobTypes[job.job_type] = (behaviorJobTypes[job.job_type] || 0) + 1;
      if (job.employers?.industry) behaviorIndustries[job.employers.industry] = (behaviorIndustries[job.employers.industry] || 0) + 1;
      if (job.title) {
        job.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3).forEach((w: string) => {
          behaviorTitleWords[w] = (behaviorTitleWords[w] || 0) + 1;
        });
      }
    });

    const topJobTypes = Object.entries(behaviorJobTypes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
    const topIndustries = Object.entries(behaviorIndustries).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
    const topTitleWords = Object.entries(behaviorTitleWords).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0]);

    // Fetch active jobs not already applied to
    const { data: activeJobs } = await supabase
      .from("jobs")
      .select("id, title, description, job_type, salary_range, job_address, location_country, location_state, location_city, latitude, longitude, created_at, skills_required, work_mode, employers!inner(company_name, industry, slug, profile_id, profiles!inner(avatar_url))")
      .eq("status", "open")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!activeJobs || activeJobs.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Score each job
    const scored = activeJobs
      .filter((j: any) => !appliedJobIds.has(j.id))
      .map((job: any) => {
        let score = 0;
        const reasons: string[] = [];

        // 1. Skill match (40% weight)
        const candidateSkills = (candidate.skills || []).map((s: string) => s.toLowerCase());
        const jobDesc = (job.description || "").toLowerCase();
        const jobSkills = (job.skills_required || []).map((s: string) => s.toLowerCase());
        let skillMatches = 0;

        candidateSkills.forEach((skill: string) => {
          if (jobSkills.includes(skill) || jobDesc.includes(skill)) skillMatches++;
        });

        if (candidateSkills.length > 0) {
          const skillScore = Math.min((skillMatches / Math.max(candidateSkills.length, 1)) * 40, 40);
          score += skillScore;
          if (skillMatches >= 3) reasons.push(`${skillMatches} skill matches`);
        }

        // 2. Title relevance (20% weight)
        const jobTitleLower = job.title.toLowerCase();
        const candidateTitle = (candidate.job_title || "").toLowerCase();
        if (candidateTitle && jobTitleLower.includes(candidateTitle)) {
          score += 20;
          reasons.push("Title match");
        } else {
          const titleOverlap = topTitleWords.filter(w => jobTitleLower.includes(w)).length;
          score += Math.min(titleOverlap * 4, 15);
          if (titleOverlap >= 2) reasons.push("Related role");
        }

        // 3. Job type preference (10%)
        const prefTypes = candidate.preferred_job_types || topJobTypes;
        if (prefTypes.length > 0 && prefTypes.includes(job.job_type)) {
          score += 10;
          reasons.push(`${job.job_type} preferred`);
        }

        // 4. Industry match (10%)
        const prefIndustries = candidate.industry_preference || topIndustries;
        if (prefIndustries.length > 0 && job.employers?.industry && prefIndustries.some((ind: string) => ind.toLowerCase() === job.employers.industry.toLowerCase())) {
          score += 10;
          reasons.push("Industry match");
        }

        // 5. Location proximity (10%)
        if (profile.latitude && profile.longitude && job.latitude && job.longitude) {
          const dist = Math.sqrt(
            Math.pow((job.latitude - profile.latitude) * 111, 2) +
            Math.pow((job.longitude - profile.longitude) * 111 * Math.cos(profile.latitude * Math.PI / 180), 2)
          );
          if (dist < 10) { score += 10; reasons.push("Very close"); }
          else if (dist < 25) { score += 7; reasons.push("Nearby"); }
          else if (dist < 50) { score += 4; }
        }

        // 6. Remote preference (5%)
        if (candidate.remote_preference === "remote" && job.work_mode === "remote") {
          score += 5;
          reasons.push("Remote");
        }

        // 7. Recency bonus (5%)
        const daysOld = (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24);
        if (daysOld < 3) { score += 5; reasons.push("New listing"); }
        else if (daysOld < 7) { score += 3; }

        // 8. Behavioral boost — saved/viewed similar
        const isSaved = savedJobs.some((s: any) => s.job_id === job.id);
        if (isSaved) { score += 8; reasons.push("Saved"); }

        return {
          id: job.id,
          title: job.title,
          description: job.description?.slice(0, 200),
          job_type: job.job_type,
          salary_range: job.salary_range,
          job_address: job.job_address,
          location_country: job.location_country,
          location_state: job.location_state,
          location_city: job.location_city,
          created_at: job.created_at,
          work_mode: job.work_mode,
          company_name: job.employers?.company_name,
          industry: job.employers?.industry,
          company_slug: job.employers?.slug,
          avatar_url: job.employers?.profiles?.avatar_url,
          score: Math.round(score),
          reasons: reasons.slice(0, 3),
          is_saved: isSaved,
        };
      });

    // Sort by score, return top 25
    scored.sort((a: any, b: any) => b.score - a.score);
    const recommendations = scored.slice(0, 25);

    // Use AI to generate a personalized insight summary
    let aiInsight = "";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (LOVABLE_API_KEY && recommendations.length > 0) {
      try {
        const topJobs = recommendations.slice(0, 5).map((j: any) => `${j.title} at ${j.company_name} (score: ${j.score})`).join(", ");
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: "You generate a single brief, encouraging personalized insight (max 2 sentences) about a job seeker's top matches. Be specific about what makes these matches strong. No markdown, no lists.",
              },
              {
                role: "user",
                content: `Candidate: ${candidate.job_title}, Skills: ${(candidate.skills || []).join(", ")}, Experience: ${candidate.experience_years || 0} years. Top matches: ${topJobs}. Generate a brief personalized insight.`,
              },
            ],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          aiInsight = aiData.choices?.[0]?.message?.content?.trim() || "";
        }
      } catch (e) {
        console.error("AI insight error:", e);
        // Non-critical, continue without insight
      }
    }

    return new Response(
      JSON.stringify({
        recommendations,
        insight: aiInsight,
        profile_summary: {
          skills_count: (candidate.skills || []).length,
          applied_count: appliedJobs.length,
          viewed_count: viewedJobs.length,
          saved_count: savedJobs.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Recommendation error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
