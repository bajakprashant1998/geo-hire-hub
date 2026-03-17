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
    const rlResult = checkRateLimit(rlKey, { maxRequests: 10, windowMs: 60_000 });
    const rlResponse = rateLimitResponse(rlResult, corsHeaders);
    if (rlResponse) return rlResponse;
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

    const { messages, candidateProfile, siteUrl, stream: wantStream } = await req.json();

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

    // ---- Fetch REAL jobs and employers from the platform ----
    const baseUrl = siteUrl || "https://hireforjob1.lovable.app";

    const { data: platformJobs } = await supabase
      .from("jobs")
      .select(`
        id, title, slug, job_type, salary_range, salary_currency, skills,
        location_city, location_state, location_country, latitude, longitude,
        category, description, openings, created_at,
        employers!inner(id, company_name, slug, industry, team_size, location_city, location_country, is_government, verification_status)
      `)
      .eq("status", "open")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(100);

    let jobsContext = "";
    if (platformJobs?.length) {
      const candidateLat = profile?.latitude;
      const candidateLng = profile?.longitude;

      const jobsWithDistance = platformJobs.map((j: any) => {
        let distanceKm: number | null = null;
        if (candidateLat && candidateLng && j.latitude && j.longitude) {
          const R = 6371;
          const dLat = ((j.latitude - candidateLat) * Math.PI) / 180;
          const dLon = ((j.longitude - candidateLng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((candidateLat * Math.PI) / 180) *
            Math.cos((j.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distanceKm = Math.round(R * c);
        }

        const pathParts = ['/jobs'];
        if (j.location_country) pathParts.push(j.location_country.toLowerCase().replace(/\s+/g, '-'));
        if (j.location_state) pathParts.push(j.location_state.toLowerCase().replace(/\s+/g, '-'));
        if (j.location_city) pathParts.push(j.location_city.toLowerCase().replace(/\s+/g, '-'));
        pathParts.push(j.slug || j.id);
        const jobUrl = `${baseUrl}${pathParts.join('/')}`;

        return { ...j, distanceKm, jobUrl };
      });

      jobsWithDistance.sort((a: any, b: any) => {
        if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
        if (a.distanceKm !== null) return -1;
        return 1;
      });

      jobsContext = `\n\nAVAILABLE JOBS ON THE PLATFORM (${jobsWithDistance.length} active jobs):\n${jobsWithDistance.map((j: any) => {
        const emp = j.employers as any;
        const distance = j.distanceKm !== null ? `${j.distanceKm} km away` : 'Distance unknown';
        return `- **${j.title}** at **${emp.company_name}** | ${j.location_city || 'Remote'}, ${j.location_country || ''} | ${j.job_type || 'Full-time'} | Salary: ${j.salary_range || 'Not specified'} | Skills: ${j.skills?.join(', ') || 'Not specified'} | Distance: ${distance} | [Apply Here](${j.jobUrl})`;
      }).join('\n')}`;
    }

    const { data: platformEmployers } = await supabase
      .from("employers")
      .select("id, company_name, slug, industry, description, team_size, location_city, location_state, location_country, is_government, verification_status, benefits, specializations, website_url")
      .eq("verification_status", "approved")
      .limit(100);

    let employersContext = "";
    if (platformEmployers?.length) {
      employersContext = `\n\nCOMPANIES ON THE PLATFORM (${platformEmployers.length} verified companies):\n${platformEmployers.map((e: any) => {
        const pathParts = ['/companies'];
        if (e.location_country) pathParts.push(e.location_country.toLowerCase().replace(/\s+/g, '-'));
        if (e.location_state) pathParts.push(e.location_state.toLowerCase().replace(/\s+/g, '-'));
        if (e.location_city) pathParts.push(e.location_city.toLowerCase().replace(/\s+/g, '-'));
        pathParts.push(e.slug || e.id);
        const companyUrl = `${baseUrl}${pathParts.join('/')}`;
        return `- **${e.company_name}** | ${e.industry || 'Various'} | ${e.location_city || ''}, ${e.location_country || ''} | Team: ${e.team_size || 'N/A'} | ${e.is_government ? 'Government' : 'Private'} | [View Company](${companyUrl})`;
      }).join('\n')}`;
    }

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

You also have access to REAL jobs and companies available on the Hire for Job platform:
${jobsContext}
${employersContext}

YOUR CAPABILITIES:
1. **Company Matching**: When the candidate asks for best companies or where to apply, ONLY recommend companies and jobs that are ACTUALLY AVAILABLE on the platform (listed above). Calculate match percentages based on: skill match (40%), experience relevance (30%), location fit (20%), salary compatibility (10%). Always include the direct link to apply.
2. **Nearby Jobs**: When asked about nearby jobs, filter the available jobs by distance from the candidate's location. Show the closest ones first with distance in km. Always include the direct apply link.
3. **Salary Prediction**: Based on skills, experience, location, provide current market ranges, 2-year and 5-year projections. Be specific with numbers.
4. **Career Path Simulation**: For paths like "stay in role", "switch company", "learn new skill", "change industry" — show salary growth, demand, promotion timeline, risk level.
5. **Skill Gap Analysis**: Detect missing in-demand skills, suggest learning roadmaps with estimated timelines and career impact.
6. **Interview Success**: Estimate selection probability for target roles, provide readiness scores and improvement tips.
7. **Location Intelligence**: Calculate nearby opportunities, remote options, relocation feasibility.

CRITICAL RULES:
- When recommending jobs or companies, ONLY use the real data provided above from the platform. Do NOT invent or hallucinate company names or job listings.
- ALWAYS include clickable links in markdown format: [Apply Here](url) or [View Company](url)
- When showing job recommendations, format them clearly with: Job Title, Company, Location, Distance, Match %, Salary, and Apply Link.
- If no matching jobs/companies are found on the platform, tell the candidate honestly and suggest they check back later or broaden their search criteria.
- Sort nearby jobs by distance (closest first) and best-match jobs by match percentage (highest first).

RESPONSE GUIDELINES:
- Be conversational, warm, and encouraging — like a trusted career mentor
- Use emojis sparingly but effectively (🎯 💰 📈 🏢 ⭐ 📍)
- Format responses with clear sections using markdown headers and bullet points
- Include specific numbers, percentages, and projections when relevant
- Always end with a follow-up question or suggested next action
- When recommending companies, include match %, why they match, distance, and a direct link
- Keep responses focused and actionable — avoid generic fluff
- If profile data is missing, gently suggest the candidate complete their profile for better recommendations
- Use tables for comparisons when helpful (salary ranges, career paths)
- For job/company links, use markdown link syntax: [Company Name](url) or [Apply Now](url)`;

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    // Build Gemini request
    const systemMessages = [systemPrompt];
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    if (contents.length === 0) {
      contents.push({ role: "user", parts: [{ text: "Hello" }] });
    }

    const payload: Record<string, unknown> = {
      contents,
      generationConfig: { temperature: 0.7 },
    };

    if (systemMessages.length > 0) {
      payload.systemInstruction = {
        parts: [{ text: systemMessages.join("\n\n") }],
      };
    }

    // ---- STREAMING MODE ----
    if (wantStream) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        console.error("Gemini stream error:", geminiResponse.status, errText);
        return new Response(JSON.stringify({ error: "AI service error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Pipe Gemini SSE stream, transforming to OpenAI-compatible format
      const reader = geminiResponse.body!.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              break;
            }
            buffer += decoder.decode(value, { stream: true });

            let newlineIdx;
            while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
              let line = buffer.slice(0, newlineIdx);
              buffer = buffer.slice(newlineIdx + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);

              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  // Emit OpenAI-compatible SSE chunk
                  const chunk = JSON.stringify({
                    choices: [{ delta: { content: text } }],
                  });
                  controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                }
              } catch {
                // skip malformed lines
              }
            }
          }
        },
      });

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      });
    }

    // ---- NON-STREAMING (legacy) ----
    const { generateGeminiChat } = await import("../_shared/gemini.ts");
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
