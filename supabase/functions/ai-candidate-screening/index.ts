import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rlKey = getRateLimitKey(req);
    const rlResult = checkRateLimit(rlKey, { maxRequests: 5, windowMs: 60_000 });
    const rlResponse = rateLimitResponse(rlResult, corsHeaders);
    if (rlResponse) return rlResponse;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiKey = Deno.env.get("GEMINI_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is an employer
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user || userError) throw new Error("Not authenticated");

    const { data: profile, error: profileError } = await supabase.from("profiles").select("id").eq("user_id", user.id).single();
    if (!profile || profileError) throw new Error("Profile not found. Please complete your profile setup.");
    
    const { data: employer, error: employerError } = await supabase.from("employers").select("id").eq("profile_id", profile.id).single();
    if (!employer || employerError) throw new Error("Employer account not found. Only employers can use AI screening.");

    const { job_id } = await req.json();
    if (!job_id) throw new Error("job_id required");

    // Verify job belongs to employer
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, title, description, skills_required, experience_min, experience_max, salary_range, job_type")
      .eq("id", job_id)
      .eq("employer_id", employer.id)
      .single();

    if (!job || jobError) {
      console.error("Job lookup failed:", { job_id, employer_id: employer.id, error: jobError });
      throw new Error("Job not found or you don't have access to this job. Make sure the job belongs to your account.");
    }

    // Get applicants
    const { data: applications } = await supabase
      .from("applications")
      .select("id, candidate_id, candidates(id, job_title, skills, experience_years, bio, education, work_experience, profiles(full_name))")
      .eq("job_id", job_id)
      .limit(50);

    if (!applications || applications.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidatesSummary = applications.map((app: any) => ({
      candidate_id: app.candidate_id,
      name: app.candidates?.profiles?.full_name || "Unknown",
      title: app.candidates?.job_title || "",
      skills: app.candidates?.skills || [],
      experience: app.candidates?.experience_years || 0,
      bio: app.candidates?.bio || "",
    }));

    // AI screening via Gemini
    const prompt = `You are an AI recruiter screening candidates for the following job:
Title: ${job.title}
Description: ${job.description || "N/A"}
Required Skills: ${job.skills_required?.join(", ") || "N/A"}
Experience: ${job.experience_min || 0}-${job.experience_max || 10} years

Candidates:
${candidatesSummary.map((c: any, i: number) => `${i + 1}. ${c.name} - ${c.title}, Skills: ${c.skills?.join(", ") || "None"}, Experience: ${c.experience} years`).join("\n")}

For each candidate, provide a JSON array with:
- candidate_id (string)
- ai_screening_score (0-100)
- recommendation ("strong_match", "good_match", "potential", "not_recommended")
- screening_summary (1-2 sentences)
- skill_gaps (array of missing skills)
- skill_overlap (array of matching skills)

Return ONLY the JSON array.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

    // Parse AI response
    let screeningResults;
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      screeningResults = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      screeningResults = [];
    }

    // Enrich with candidate names and save to job_matches
    const results = screeningResults.map((result: any, i: number) => {
      const candidate = candidatesSummary[i] || candidatesSummary.find((c: any) => c.candidate_id === result.candidate_id);
      return {
        ...result,
        candidate_id: candidate?.candidate_id || result.candidate_id,
        candidate_name: candidate?.name || "Unknown",
        match_score: result.ai_screening_score || 0,
      };
    });

    // Upsert screening results into job_matches
    for (const result of results) {
      await supabase.from("job_matches").upsert({
        job_id,
        candidate_id: result.candidate_id,
        match_score: result.match_score,
        ai_screening_score: result.ai_screening_score,
        screening_summary: result.screening_summary,
        skill_gaps: result.skill_gaps,
        recommendation: result.recommendation,
        skill_overlap: result.skill_overlap,
      }, { onConflict: "job_id,candidate_id" });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("AI Screening error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
