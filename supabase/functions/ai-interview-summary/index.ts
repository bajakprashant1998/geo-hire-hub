import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rlKey = getRateLimitKey(req);
    const rlResult = checkRateLimit(rlKey, { maxRequests: 10, windowMs: 60_000 });
    const rlResponse = rateLimitResponse(rlResult, corsHeaders);
    if (rlResponse) return rlResponse;
    const { notes, candidateName, jobTitle, companyName } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const prompt = `You are an HR assistant. Based on these interview notes, generate a structured summary.

Interview Details:
- Candidate: ${candidateName || 'Unknown'}
- Position: ${jobTitle || 'Unknown'}
- Company: ${companyName || 'Unknown'}

Notes: ${notes}

Return a JSON object with these fields:
- overallImpression: string (2-3 sentences)
- strengths: string[] (3-5 bullet points)
- concerns: string[] (1-3 bullet points, or empty array if none)
- recommendation: "strong_hire" | "hire" | "maybe" | "no_hire"
- followUpQuestions: string[] (2-3 suggested follow-up questions)
- keyTakeaways: string (1-2 sentence summary)

Return ONLY valid JSON, no markdown.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
        }),
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
