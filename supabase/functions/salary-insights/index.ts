import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { location, jobCategory, yearsOfExperience, skills } = await req.json();

    if (!location || !jobCategory) {
      return new Response(JSON.stringify({ error: "Location and job category are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const locationStr = [location.city, location.state, location.country].filter(Boolean).join(", ");
    const skillsStr = skills?.length ? skills.join(", ") : "Not specified";
    const expStr = yearsOfExperience ? `${yearsOfExperience} years` : "Not specified";

    const systemPrompt = `You are a salary data analyst for a global job portal. Provide realistic, data-informed salary estimates based on current market trends. Always respond with valid JSON using the exact schema provided. Use the local currency for the given country. Be specific and actionable.`;

    const userPrompt = `Analyze salary data for:
- Role: ${jobCategory}
- Location: ${locationStr}
- Experience: ${expStr}
- Skills: ${skillsStr}

Respond with this exact JSON structure:
{
  "currencyCode": "USD",
  "currencySymbol": "$",
  "estimatedRange": { "min": 50000, "max": 80000 },
  "experienceBreakdown": [
    { "level": "Entry Level (0-2 yrs)", "min": 40000, "max": 55000 },
    { "level": "Mid Level (3-5 yrs)", "min": 55000, "max": 75000 },
    { "level": "Senior Level (6-10 yrs)", "min": 75000, "max": 100000 },
    { "level": "Lead/Principal (10+ yrs)", "min": 100000, "max": 140000 }
  ],
  "marketDemand": "High",
  "marketDemandScore": 85,
  "topPayingCities": [
    { "city": "San Francisco", "country": "US", "avgSalary": 120000 },
    { "city": "New York", "country": "US", "avgSalary": 110000 },
    { "city": "Seattle", "country": "US", "avgSalary": 105000 },
    { "city": "Austin", "country": "US", "avgSalary": 95000 },
    { "city": "Boston", "country": "US", "avgSalary": 100000 }
  ],
  "growthTips": [
    "Tip 1 specific to the role and location",
    "Tip 2",
    "Tip 3",
    "Tip 4"
  ],
  "industryTrend": "Growing",
  "remoteImpact": "Remote roles typically pay 5-10% less than on-site in this location"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI service quota exceeded." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response");

    const salaryData = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(salaryData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("salary-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
