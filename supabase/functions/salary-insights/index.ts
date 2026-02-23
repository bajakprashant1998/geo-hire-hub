import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateGeminiChat, extractJSON } from "../_shared/gemini.ts";

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

    const content = await generateGeminiChat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    });

    const salaryData = extractJSON(content);

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
