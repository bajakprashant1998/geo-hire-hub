import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobTitle, bio, currentSkills, experienceYears } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `You are a professional career advisor. Based on the candidate's profile, suggest relevant skills they should add.

Candidate Profile:
- Job Title: ${jobTitle || "Not specified"}
- Experience: ${experienceYears || 0} years
- Bio: ${bio || "Not provided"}
- Current Skills: ${(currentSkills || []).join(", ") || "None yet"}

Return EXACTLY a JSON array of 8-12 skill suggestions that:
1. Are relevant to their job title and experience level
2. Are NOT already in their current skills list
3. Include a mix of technical and soft skills
4. Are commonly searched by employers in this field
5. Are specific and actionable (e.g., "React.js" not just "Programming")

Format: ["Skill 1", "Skill 2", ...]
Return ONLY the JSON array, nothing else.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a career skills expert. Always respond with valid JSON arrays only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Extract JSON array from response
    let suggestions: string[];
    try {
      const match = content.match(/\[[\s\S]*\]/);
      suggestions = match ? JSON.parse(match[0]) : [];
    } catch {
      console.error("Failed to parse AI response:", content);
      suggestions = [];
    }

    // Filter out skills already in the list
    const lowerCurrent = (currentSkills || []).map((s: string) => s.toLowerCase());
    suggestions = suggestions.filter(
      (s: string) => typeof s === "string" && s.trim() && !lowerCurrent.includes(s.toLowerCase())
    );

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("suggest-skills error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
