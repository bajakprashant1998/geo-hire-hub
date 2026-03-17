import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GeminiError, generateGeminiChat, extractJSON } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MatchRequest {
  candidateId: string;
  jobId?: string; // If provided, match single job; otherwise match all relevant jobs
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateId, jobId } = await req.json() as MatchRequest;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch candidate data
    const { data: candidate, error: candError } = await supabase
      .from("candidates")
      .select(`
        *,
        profiles!inner(full_name, latitude, longitude)
      `)
      .eq("id", candidateId)
      .single();

    if (candError || !candidate) {
      throw new Error("Candidate not found");
    }

    // Fetch jobs to match against
    let jobsQuery = supabase
      .from("jobs")
      .select(`
        *,
        employers!inner(company_name)
      `)
      .eq("status", "open")
      .eq("is_active", true);

    if (jobId) {
      jobsQuery = jobsQuery.eq("id", jobId);
    } else {
      jobsQuery = jobsQuery.limit(20);
    }

    const { data: jobs, error: jobsError } = await jobsQuery;

    if (jobsError || !jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ success: true, matches: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matches = [];

    for (const job of jobs) {
      // Build context for AI matching
      const candidateProfile = {
        name: candidate.profiles.full_name,
        title: candidate.job_title,
        skills: candidate.skills || [],
        experience_years: candidate.experience_years || 0,
        education: candidate.education || [],
        certifications: candidate.certifications || [],
        preferred_job_types: candidate.preferred_job_types || [],
        expected_salary: candidate.expected_salary,
        bio: candidate.bio,
        location: { lat: candidate.profiles.latitude, lng: candidate.profiles.longitude },
      };

      const jobProfile = {
        title: job.title,
        company: job.employers.company_name,
        description: job.description,
        required_skills: job.skills || [],
        job_type: job.job_type,
        salary_range: job.salary_range,
        experience_required: { min: job.min_experience, max: job.max_experience },
        education: job.education,
        location: { lat: job.latitude, lng: job.longitude, address: job.job_address },
      };

      const prompt = `Analyze the compatibility between this candidate and job posting. Return a JSON object with:
- score: number 0-100 representing match percentage
- reasons: array of 3-5 short reasons explaining the match (each under 50 characters)
- skill_overlap: array of skills the candidate has that match the job
- missing_skills: array of required skills the candidate lacks
- location_match: boolean if candidate is within reasonable distance
- experience_match: boolean if experience level aligns
- salary_match: boolean if salary expectations align (if known)

CANDIDATE:
${JSON.stringify(candidateProfile, null, 2)}

JOB:
${JSON.stringify(jobProfile, null, 2)}

Be realistic and objective. Consider skill relevance, experience level, location proximity, and job type preferences.`;

      let content = "";
      try {
        content = await generateGeminiChat({
          model: "gemini-2.5-flash",
          temperature: 0.3,
          messages: [
            { role: "system", content: "You are a professional job matching AI. Analyze candidate-job compatibility objectively. Return only valid JSON." },
            { role: "user", content: prompt },
          ],
        });
      } catch (error) {
        if (error instanceof GeminiError && error.status === 429) {
          console.error("Rate limited, skipping remaining jobs");
          break;
        }
        if (error instanceof GeminiError) {
          console.error("Gemini API error for job", job.id, error.status, error.body);
        } else {
          console.error("AI error for job", job.id, error);
        }
        continue;
      }

      let matchData: any;
      try {
        matchData = extractJSON(content);
      } catch {
        // Fallback to basic matching
        const skillOverlap = (candidate.skills || []).filter((s: string) =>
          (job.skills || []).some((js: string) =>
            js.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(js.toLowerCase())
          )
        );

        matchData = {
          score: Math.min(100, skillOverlap.length * 15 + 30),
          reasons: ["Skill-based match", "Location considered"],
          skill_overlap: skillOverlap,
          missing_skills: [],
          location_match: true,
          experience_match: true,
          salary_match: true,
        };
      }

      // Upsert match into database
      const { error: upsertError } = await supabase
        .from("job_matches")
        .upsert({
          candidate_id: candidateId,
          job_id: job.id,
          match_score: Math.min(100, Math.max(0, matchData.score)),
          match_reasons: matchData.reasons || [],
          skill_overlap: matchData.skill_overlap || [],
          missing_skills: matchData.missing_skills || [],
          location_match: matchData.location_match ?? true,
          experience_match: matchData.experience_match ?? true,
          salary_match: matchData.salary_match ?? true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "candidate_id,job_id",
        });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
      }

      matches.push({
        job_id: job.id,
        job_title: job.title,
        company_name: job.employers.company_name,
        ...matchData,
      });
    }

    return new Response(JSON.stringify({ success: true, matches }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
