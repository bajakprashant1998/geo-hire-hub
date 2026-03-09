import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateGeminiChat } from "../_shared/gemini.ts";
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
    const { candidates, jobTitle } = await req.json();

    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ insights: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a summary of top candidates for AI analysis
    const candidateSummaries = candidates.slice(0, 15).map((c: any, i: number) => 
      `${i + 1}. ${c.fullName} — ${c.jobTitle}, ${c.experienceYears}y exp, skills: [${(c.skills || []).slice(0, 6).join(', ')}], match: ${c.matchScore}%, location: ${c.locationCity || 'N/A'}, status: ${c.applicationStatus}`
    ).join('\n');

    const content = await generateGeminiChat({
      messages: [
        {
          role: "system",
          content: `You are an AI hiring assistant. Analyze the candidate pool and provide actionable insights for the employer. Respond ONLY with a JSON object in this format:
{
  "topPick": { "name": "string", "reason": "one sentence why they're the best fit" },
  "poolSummary": "one sentence summarizing the talent pool quality",
  "actionTip": "one actionable hiring tip based on the data",
  "skillGap": "one sentence about missing skills in the candidate pool or null"
}`
        },
        {
          role: "user",
          content: `Job context: ${jobTitle || 'Various positions'}\n\nCandidate pool:\n${candidateSummaries}`
        }
      ],
      temperature: 0.3,
    });

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-candidate-insights error:", e);
    return new Response(JSON.stringify({ insights: null, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
