import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateGeminiChat } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const { messages, candidateProfile } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no profile was sent, fetch it
    let profile = candidateProfile;
    if (!profile) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (profileData) {
        const { data: candidateData } = await supabase
          .from("candidates")
          .select("*")
          .eq("profile_id", profileData.id)
          .maybeSingle();

        profile = { ...profileData, candidate: candidateData };
      }
    }

    // Fetch recent applications for context
    let applicationsContext = "";
    if (profile?.candidate?.id) {
      const { data: apps } = await supabase
        .from("applications")
        .select("status, created_at, job:jobs(title, company:employers(company_name), location_city, salary_range, skills)")
        .eq("candidate_id", profile.candidate.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (apps?.length) {
        applicationsContext = `\n\nRecent Applications:\n${apps.map((a: any) => 
          `- ${a.job?.title} at ${a.job?.company?.company_name || 'Unknown'} (${a.status}) - ${a.job?.location_city || 'Remote'}`
        ).join('\n')}`;
      }
    }

    // Build profile context
    const profileContext = profile ? `
CANDIDATE PROFILE:
- Name: ${profile.full_name || 'Not set'}
- Job Title: ${profile.candidate?.job_title || 'Not set'}
- Location: ${[profile.location_city, profile.location_state, profile.location_country].filter(Boolean).join(', ') || 'Not set'}
- Coordinates: ${profile.latitude && profile.longitude ? `${profile.latitude}, ${profile.longitude}` : 'Not set'}
- Skills: ${profile.candidate?.skills?.join(', ') || 'None listed'}
- Experience: ${profile.candidate?.experience_years || 0} years
- Education: ${JSON.stringify(profile.candidate?.education || [])}
- Certifications: ${profile.candidate?.certifications?.join(', ') || 'None'}
- Expected Salary: ${profile.candidate?.expected_salary || 'Not specified'}
- Bio: ${profile.candidate?.bio || 'Not set'}
- Work Experience: ${JSON.stringify(profile.candidate?.work_experience || [])}
- Languages: ${JSON.stringify(profile.candidate?.languages || [])}
- Preferred Job Types: ${profile.candidate?.preferred_job_types?.join(', ') || 'Any'}
- Preferred Locations: ${profile.candidate?.preferred_locations?.join(', ') || 'Any'}
- Availability: ${profile.candidate?.availability_status || 'Available'}
- Portfolio: ${profile.candidate?.portfolio_urls?.join(', ') || 'None'}
- Headline: ${profile.candidate?.headline || 'Not set'}
${applicationsContext}
` : 'No profile data available.';

    const systemPrompt = `You are "My Buddy" — an advanced AI Career Companion for a job portal called Hire for Job. You are friendly, encouraging, data-driven, and deeply personalized.

You have access to the candidate's complete profile:
${profileContext}

YOUR CAPABILITIES:
1. **Company Matching**: Analyze skills, experience, location to recommend best-fit companies. Calculate match percentages. Consider: skill match (40%), experience relevance (30%), location fit (20%), salary compatibility (10%).
2. **Salary Prediction**: Based on skills, experience, location, provide current market ranges, 2-year and 5-year projections. Be specific with numbers.
3. **Career Path Simulation**: For paths like "stay in role", "switch company", "learn new skill", "change industry" — show salary growth, demand, promotion timeline, risk level.
4. **Skill Gap Analysis**: Detect missing in-demand skills, suggest learning roadmaps with estimated timelines and career impact.
5. **Interview Success**: Estimate selection probability for target roles, provide readiness scores and improvement tips.
6. **Location Intelligence**: Calculate nearby opportunities, remote options, relocation feasibility.

RESPONSE GUIDELINES:
- Be conversational, warm, and encouraging — like a trusted career mentor
- Use emojis sparingly but effectively (🎯 💰 📈 🏢 ⭐)
- Format responses with clear sections using markdown headers and bullet points
- Include specific numbers, percentages, and projections when relevant
- Always end with a follow-up question or suggested next action
- When recommending companies, include match %, why they match, and what role would suit them
- Keep responses focused and actionable — avoid generic fluff
- If profile data is missing, gently suggest the candidate complete their profile for better recommendations
- Use tables for comparisons when helpful (salary ranges, career paths)`;

    const geminiMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const content = await generateGeminiChat({
      messages: geminiMessages,
      temperature: 0.7,
    });

    return new Response(JSON.stringify({ response: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-career-buddy error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
