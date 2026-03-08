import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateGeminiChat } from "../_shared/gemini.ts";

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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Fetch job, candidate, and profile in parallel
    const profilePromise = adminClient
      .from("profiles")
      .select("id, full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const jobPromise = adminClient
      .from("jobs")
      .select("title, description, skills, job_type, location_city, employers(company_name, industry)")
      .eq("id", jobId)
      .maybeSingle();

    const [{ data: profile }, { data: job }] = await Promise.all([profilePromise, jobPromise]);

    if (!profile || !job) {
      return new Response(JSON.stringify({ error: "Profile or job not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: candidate } = await adminClient
      .from("candidates")
      .select("job_title, skills, experience_years, bio, work_experience, education")
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!candidate) {
      return new Response(JSON.stringify({ error: "Candidate profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyName = (job as any).employers?.company_name || "the company";
    const industry = (job as any).employers?.industry || "";

    const prompt = `Write a professional, personalized cover letter (150-200 words) for this candidate applying to this job. Be genuine, specific, and enthusiastic. Do NOT use placeholder brackets. Start with "Dear Hiring Manager,".

CANDIDATE:
- Name: ${profile.full_name}
- Current Title: ${candidate.job_title}
- Skills: ${(candidate.skills || []).join(", ") || "Not specified"}
- Experience: ${candidate.experience_years || 0} years
- Bio: ${(candidate.bio || "").substring(0, 300)}

JOB:
- Title: ${job.title}
- Company: ${companyName}
- Industry: ${industry}
- Required Skills: ${(job.skills || []).join(", ") || "Not specified"}
- Type: ${job.job_type || "Not specified"}
- Location: ${job.location_city || "Not specified"}
- Description: ${(job.description || "").substring(0, 500)}

Write naturally and concisely. Highlight relevant skill overlaps. End with a professional closing.`;

    const coverLetter = await generateGeminiChat({
      messages: [
        { role: "system", content: "You write concise, genuine cover letters. No fluff, no placeholders, no markdown formatting. Plain text only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    return new Response(
      JSON.stringify({ coverLetter: coverLetter.trim() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cover letter generation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate cover letter" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
