import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateGeminiChat, extractJSON } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    // Fetch candidate data
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, latitude, longitude")
      .eq("user_id", user.id)
      .single();

    if (!profile) throw new Error("Profile not found");

    const { data: candidate } = await supabase
      .from("candidates")
      .select("id, job_title, skills, experience_years, certifications, education, work_experience, expected_salary, salary_currency, city, country, availability_status, preferred_job_types, languages, headline")
      .eq("profile_id", profile.id)
      .single();

    if (!candidate) throw new Error("Candidate profile not found");

    // Fetch market demand data: count active jobs matching candidate's skills
    const { count: totalActiveJobs } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("status", "open");

    // Fetch jobs that match candidate's title
    const { count: matchingTitleJobs } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("status", "open")
      .ilike("title", `%${candidate.job_title?.split(" ")[0] || ""}%`);

    // Count how many candidates have similar titles (competition)
    const { count: competitorCount } = await supabase
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .ilike("job_title", `%${candidate.job_title?.split(" ")[0] || ""}%`);

    // Application success rate
    const { data: applications } = await supabase
      .from("applications")
      .select("status")
      .eq("candidate_id", candidate.id);

    const totalApps = applications?.length || 0;
    const shortlisted = applications?.filter((a) => ["shortlisted", "interviewed", "hired"].includes(a.status || "")).length || 0;
    const successRate = totalApps > 0 ? ((shortlisted / totalApps) * 100).toFixed(0) : "N/A";

    // Profile views
    const { count: profileViews } = await supabase
      .from("profile_views")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profile.id);

    const candidateData = {
      job_title: candidate.job_title,
      skills: candidate.skills || [],
      experience_years: candidate.experience_years || 0,
      certifications: candidate.certifications || [],
      education: candidate.education || [],
      work_experience: candidate.work_experience || [],
      expected_salary: candidate.expected_salary,
      salary_currency: candidate.salary_currency || "INR",
      city: candidate.city,
      country: candidate.country,
      availability: candidate.availability_status,
      preferred_job_types: candidate.preferred_job_types || [],
      languages: candidate.languages || [],
      headline: candidate.headline,
    };

    const marketContext = {
      total_active_jobs: totalActiveJobs || 0,
      matching_title_jobs: matchingTitleJobs || 0,
      competitor_count: competitorCount || 0,
      application_success_rate: successRate,
      profile_views: profileViews || 0,
      total_applications: totalApps,
    };

    const prompt = `You are a professional career analyst. Analyze this candidate's market value and return a JSON response.

CANDIDATE PROFILE:
${JSON.stringify(candidateData, null, 2)}

MARKET DATA:
${JSON.stringify(marketContext, null, 2)}

Return ONLY valid JSON with this exact structure:
{
  "overall_score": <number 0-100>,
  "grade": "<S/A/B/C/D>",
  "summary": "<2-3 sentence personalized market value summary>",
  "dimensions": {
    "skills_demand": { "score": <0-100>, "label": "Skills Demand", "insight": "<brief insight>" },
    "experience_value": { "score": <0-100>, "label": "Experience Value", "insight": "<brief insight>" },
    "market_fit": { "score": <0-100>, "label": "Market Fit", "insight": "<brief insight>" },
    "competition": { "score": <0-100>, "label": "Competition Edge", "insight": "<brief insight>" },
    "growth_potential": { "score": <0-100>, "label": "Growth Potential", "insight": "<brief insight>" }
  },
  "salary_estimate": {
    "min": <number>,
    "max": <number>,
    "median": <number>,
    "currency": "<currency code>"
  },
  "top_strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvement_areas": ["<area 1>", "<area 2>"],
  "trending_skills": ["<skill the candidate should learn>", "<skill 2>"],
  "demand_trend": "<rising/stable/declining>"
}

Score guidelines:
- 90-100 (S): Exceptional, top-tier talent in high demand
- 75-89 (A): Strong market position, well-rounded
- 60-74 (B): Good potential, some gaps to fill
- 40-59 (C): Average, needs improvement in key areas
- 0-39 (D): Below market expectations

Consider: skill rarity, years of experience vs. role expectations, market demand (${matchingTitleJobs} open jobs for this role), competition (${competitorCount} similar candidates), and application success rate (${successRate}%).`;

    const result = await generateGeminiChat({
      messages: [
        { role: "system", content: "You are a career market analyst. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    });

    const parsed = extractJSON(result);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Market value error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to calculate market value" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
