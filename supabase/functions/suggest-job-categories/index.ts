import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, context } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a global job title/category suggestion engine. Your task is to suggest relevant job titles based on partial user input.

RULES:
1. Return ONLY a JSON array of job title strings
2. Suggest 6-8 most relevant job titles
3. Cover diverse industries: tech, healthcare, finance, creative, trades, education, etc.
4. Handle misspellings intelligently (e.g., "softwre" → Software Engineer)
5. Handle synonyms (e.g., "dev" → Developer, "doc" → Doctor)
6. Include variations: junior/senior levels, related roles
7. Be globally aware - include international job titles
8. Sort by relevance to the query
9. Never include explanations, just the JSON array

EXAMPLES:
Input: "sof" → ["Software Engineer", "Software Developer", "Software Architect", "Software Tester", "Software Project Manager", "Software Consultant"]
Input: "nur" → ["Nurse", "Nursing Assistant", "Nurse Practitioner", "Nurse Manager", "Neonatal Nurse", "Nursing Educator"]
Input: "ai" → ["AI Engineer", "AI Researcher", "AI Product Manager", "AI Data Scientist", "AI Specialist", "AI Consultant"]
Input: "car" → ["Car Mechanic", "Cardiac Surgeon", "Career Counselor", "Cargo Handler", "Carpenter", "Caregiver"]`;

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
          { role: "user", content: `Suggest job titles for: "${query}"${context ? `. Context: ${context}` : ''}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again.", suggestions: [] }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable.", suggestions: [] }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON array from the response
    let suggestions: string[] = [];
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse suggestions:", parseError);
      suggestions = [];
    }

    return new Response(
      JSON.stringify({ suggestions: suggestions.slice(0, 8) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
